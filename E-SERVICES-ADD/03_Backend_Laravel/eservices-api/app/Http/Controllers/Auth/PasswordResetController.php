<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use App\Services\EmailJsSender;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    private function cacheKey(string $email): string
    {
        return 'password_reset:' . strtolower($email);
    }

    private function findUserByEmail(string $normalizedEmail): ?User
    {
        return User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$normalizedEmail])
            ->first();
    }

    /**
     * Corps texte du mail (EmailJS utilise le même schéma de variables que les autres envois).
     */
    private function passwordResetPlainBody(string $userName, string $code): string
    {
        return implode("\n", [
            'Bonjour '.$userName.',',
            '',
            'Votre code de réinitialisation du mot de passe est : '.$code,
            '',
            'Ce code est valable 15 minutes.',
            '',
            'Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.',
            '',
            'Cordialement,',
            (string) config('app.name'),
        ]);
    }

    /**
     * EmailJS d’abord (si configuré), sinon Mailable Laravel (SMTP, log, etc.).
     *
     * @throws \Throwable
     */
    private function deliverPasswordResetCode(User $user, string $code): void
    {
        $name = $user->name !== null && trim((string) $user->name) !== ''
            ? (string) $user->name
            : 'Utilisateur';
        $subject = 'Code de réinitialisation — '.config('app.name');
        $plain = $this->passwordResetPlainBody($name, $code);

        $emailJs = app(EmailJsSender::class);
        if ($emailJs->isConfigured()) {
            try {
                $emailJs->send($user->email, $name, $subject, $plain);

                return;
            } catch (\Throwable $e) {
                Log::warning('password_reset_emailjs_failed_fallback_mail', [
                    'to' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            Log::info('password_reset_skipping_emailjs', [
                'to' => $user->email,
                'reason' => 'EMAILJS_ENABLED=false ou clés manquantes — mailer Laravel',
                'mailer' => config('mail.default'),
            ]);
        }

        Mail::to($user->email)->send(new PasswordResetCodeMail($name, $code));
    }

    /**
     * Demande de code par e-mail (6 chiffres, 15 min, max 5 essais de code).
     */
    public function sendCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = $this->findUserByEmail($email);

        if ($user) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $ttl = now()->addMinutes(15);
            try {
                $this->deliverPasswordResetCode($user, $code);
            } catch (\Throwable $e) {
                Log::error('password_reset_mail_failed', [
                    'to' => $user->email,
                    'mailer' => config('mail.default'),
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'message' => 'Impossible d’envoyer l’e-mail. Vérifiez la configuration (EmailJS ou MAIL_MAILER=smtp) sur le serveur, ou réessayez plus tard.',
                ], 503);
            }

            Cache::put($this->cacheKey($email), [
                'hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => $ttl->timestamp,
            ], $ttl);
        }

        return response()->json([
            'message' => 'Si un compte est associé à cette adresse, un code vient d’être envoyé par e-mail (vérifiez aussi les courriers indésirables).',
        ]);
    }

    /**
     * Vérification du code + nouveau mot de passe.
     */
    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6', 'regex:/^[0-9]{6}$/'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $email = strtolower(trim($data['email']));
        $key = $this->cacheKey($email);
        $payload = Cache::get($key);

        if (! $payload || ! isset($payload['hash'], $payload['expires_at'])) {
            throw ValidationException::withMessages([
                'code' => ['Code invalide ou expiré. Demandez un nouveau code.'],
            ]);
        }

        if (now()->timestamp > (int) $payload['expires_at']) {
            Cache::forget($key);
            throw ValidationException::withMessages([
                'code' => ['Code expiré. Demandez un nouveau code.'],
            ]);
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= 5) {
            Cache::forget($key);
            throw ValidationException::withMessages([
                'code' => ['Trop de tentatives incorrectes. Demandez un nouveau code.'],
            ]);
        }

        if (! Hash::check($data['code'], $payload['hash'])) {
            $payload['attempts'] = $attempts + 1;
            $remainingTtl = max(1, (int) $payload['expires_at'] - now()->timestamp);
            Cache::put($key, $payload, now()->addSeconds($remainingTtl));
            throw ValidationException::withMessages([
                'code' => ['Code incorrect.'],
            ]);
        }

        $user = $this->findUserByEmail($email);
        if (! $user) {
            Cache::forget($key);
            throw ValidationException::withMessages([
                'email' => ['Aucun compte trouvé pour cette adresse.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
        ])->save();

        Cache::forget($key);

        return response()->json([
            'message' => 'Votre mot de passe a été mis à jour. Vous pouvez vous connecter.',
        ]);
    }
}
