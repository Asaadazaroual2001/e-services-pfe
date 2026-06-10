<?php

namespace App\Console\Commands;

use App\Mail\RequestActivityMail;
use App\Services\EmailJsSender;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailTestRequestNotificationCommand extends Command
{
    protected $signature = 'mail:test-request-notification {email : Adresse qui recevra le mail de test}';

    protected $description = 'Envoie un e-mail de démo (notifications demande) : EmailJS si EMAILJS_ENABLED, sinon SMTP / MAIL_*';

    public function handle(): int
    {
        $to = $this->argument('email');
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Adresse e-mail invalide.');

            return self::FAILURE;
        }

        $base = rtrim((string) config('notifications.urls.frontend', config('app.url')), '/');
        $heading = 'E-mail de test';
        $paragraphs = [
            'Si vous lisez ce message, l’envoi vers les clients fonctionne.',
            'Référence fictive : **ADD-TEST-000001**',
        ];
        $actionUrl = $base.'/client/requests';
        $actionLabel = 'Ouvrir le portail (exemple)';

        $emailJs = app(EmailJsSender::class);
        if ($emailJs->isConfigured()) {
            try {
                $plain = EmailJsSender::plainBodyForRequestActivity(
                    $heading,
                    $paragraphs,
                    $actionUrl,
                    $actionLabel
                );
                $emailJs->send($to, 'Client test', '[TEST] Notification de demande', $plain);
                $this->info("Message envoyé via EmailJS vers {$to} (vérifiez les spams).");

                return self::SUCCESS;
            } catch (\Throwable $e) {
                Log::warning('mail_test_emailjs_failed', ['error' => $e->getMessage()]);
                $this->warn('EmailJS a échoué, tentative SMTP… '.$e->getMessage());
            }
        }

        Mail::to($to)->send(new RequestActivityMail(
            '[TEST] Notification de demande',
            $heading,
            $paragraphs,
            $actionUrl,
            $actionLabel
        ));

        $this->info("Message envoyé vers {$to} (mailer Laravel : ".config('mail.default').').');

        return self::SUCCESS;
    }
}
