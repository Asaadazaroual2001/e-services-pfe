<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Admin\Concerns\ScopesRequestsForResponsable;
use App\Http\Controllers\Controller;
use App\Mail\StaffClientMessageMail;
use App\Models\Request as DemandRequest;
use App\Models\StaffClientEmail;
use App\Models\User;
use App\Services\EmailJsSender;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class StaffClientEmailController extends Controller
{
    use ScopesRequestsForResponsable;

    /**
     * Liste des e-mails envoyés (périmètre selon le rôle).
     */
    public function index(HttpRequest $http)
    {
        $user = $http->user();
        $query = StaffClientEmail::query()
            ->with([
                'sender:id,name,email,agency_id',
                'request:id,reference',
            ])
            ->orderByDesc('id');

        if ($user->hasRole('admin')) {
            // tout voir
        } elseif ($user->hasRole('agent')) {
            $query->where('sender_id', $user->id);
        } elseif ($user->hasRole('responsable')) {
            $agencyIds = $this->responsableManagedAgencyIds();
            if ($agencyIds->isEmpty()) {
                $query->whereRaw('0 = 1');
            } else {
                $query->whereHas('sender', function ($q) use ($agencyIds) {
                    $q->whereIn('agency_id', $agencyIds);
                });
            }
        } else {
            abort(403);
        }

        $perPage = max(1, min(50, (int) $http->input('per_page', 15)));

        return response()->json($query->paginate($perPage));
    }

    /**
     * Envoyer un e-mail manuel au client (enregistré dans l’historique).
     */
    public function store(HttpRequest $http)
    {
        $data = $http->validate([
            'recipient_name' => ['required', 'string', 'max:190'],
            'recipient_email' => ['required', 'email', 'max:190'],
            'recipient_cin' => ['required', 'string', 'max:32'],
            'subject' => ['required', 'string', 'max:190'],
            'body' => ['required', 'string', 'max:5000'],
            'request_id' => ['nullable', 'integer', 'exists:requests,id'],
        ]);

        $reqModel = null;
        if (!empty($data['request_id'])) {
            $reqModel = DemandRequest::query()->findOrFail((int) $data['request_id']);
            $this->assertCanAccessStaffRequest($http->user(), $reqModel);
        }

        $sender = $http->user();
        $portalUrl = rtrim((string) config('notifications.urls.frontend', config('app.url')), '/').'/client/requests';

        $log = StaffClientEmail::query()->create([
            'sender_id' => $sender->id,
            'recipient_name' => $data['recipient_name'],
            'recipient_email' => $data['recipient_email'],
            'recipient_cin' => $data['recipient_cin'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'request_id' => $reqModel?->id,
        ]);

        try {
            $deliveryChannel = $this->deliverStaffClientEmail(
                $data['recipient_email'],
                $data['recipient_name'],
                $data['subject'],
                $data['body'],
                $sender->name,
                $reqModel?->reference,
                $portalUrl
            );
        } catch (\Throwable $e) {
            $log->delete();

            return response()->json([
                'success' => false,
                'message' => 'Échec de l’envoi de l’e-mail.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        $log->load(['sender:id,name,email', 'request:id,reference']);

        $payload = [
            'success' => true,
            'message' => 'E-mail envoyé.',
            'data' => $log,
        ];
        if (config('app.debug')) {
            $payload['debug_delivery'] = $deliveryChannel;
        }

        return response()->json($payload, 201);
    }

    /**
     * Vérifie que l’utilisateur staff peut accéder à cette demande.
     */
    private function assertCanAccessStaffRequest(User $user, DemandRequest $req): void
    {
        if ($user->hasRole('admin')) {
            $this->assertCanAccessAdminRequest($req);

            return;
        }

        if ($user->hasRole('responsable')) {
            $this->assertCanAccessAdminRequest($req);

            return;
        }

        if ($user->hasRole('agent')) {
            $q = DemandRequest::query()->whereKey($req->id)->where('is_active', true);
            $q->where(function ($qq) use ($user) {
                $qq->whereNull('assigned_to')
                    ->orWhere('assigned_to', $user->id);
            });
            if (!$q->exists()) {
                abort(403, 'Accès non autorisé à cette demande.');
            }

            return;
        }

        abort(403);
    }

    /**
     * @return string Canal réel (ex. emailjs, laravel:log, laravel:smtp) — utile si APP_DEBUG dans la réponse JSON.
     */
    private function deliverStaffClientEmail(
        string $recipientEmail,
        string $recipientName,
        string $subject,
        string $body,
        string $senderName,
        ?string $requestReference,
        string $portalUrl
    ): string {
        $emailJs = app(EmailJsSender::class);
        if ($emailJs->isConfigured()) {
            try {
                $plain = EmailJsSender::plainBodyForStaffMessage(
                    $subject,
                    $senderName,
                    $recipientName,
                    $body,
                    $requestReference,
                    $portalUrl
                );
                $emailJs->send($recipientEmail, $recipientName, $subject, $plain);

                return 'emailjs';
            } catch (\Throwable $e) {
                Log::warning('staff_client_email_emailjs_failed_fallback_mail', [
                    'to' => $recipientEmail,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            Log::info('staff_client_email_skipping_emailjs', [
                'to' => $recipientEmail,
                'reason' => 'EMAILJS_ENABLED=false ou clés manquantes — utilisation du mailer Laravel',
                'mailer' => config('mail.default'),
            ]);
        }

        Mail::to($recipientEmail)->send(new StaffClientMessageMail(
            $subject,
            $senderName,
            $recipientName,
            $body,
            $requestReference,
            $portalUrl
        ));

        Log::info('staff_client_email_laravel_sent', [
            'to' => $recipientEmail,
            'mailer' => config('mail.default'),
        ]);

        return 'laravel:'.config('mail.default');
    }
}
