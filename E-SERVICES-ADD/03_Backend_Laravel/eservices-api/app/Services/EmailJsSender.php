<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi d’e-mails via l’API REST EmailJS (service configuré côté dashboard, ex. ADD-Services).
 */
class EmailJsSender
{
    public function isConfigured(): bool
    {
        if (!config('emailjs.enabled')) {
            return false;
        }

        return (bool) (config('emailjs.service_id') && config('emailjs.template_id') && config('emailjs.public_key'));
    }

    /**
     * @throws \Throwable si la réponse HTTP indique un échec
     */
    public function send(string $toEmail, string $toName, string $subject, string $plainMessage): void
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('EmailJS is not configured.');
        }

        $url = (string) config('emailjs.send_url');
        $payload = [
            'service_id' => config('emailjs.service_id'),
            'template_id' => config('emailjs.template_id'),
            'user_id' => config('emailjs.public_key'),
            'template_params' => $this->templateParams($toEmail, $toName, $subject, $plainMessage),
        ];
        $privateKey = config('emailjs.private_key');
        if (is_string($privateKey) && trim($privateKey) !== '') {
            $payload['accessToken'] = trim($privateKey);
        }

        $response = Http::timeout(25)
            ->acceptJson()
            ->asJson()
            ->post($url, $payload);

        if (!$response->successful()) {
            $body = $response->body();
            Log::warning('emailjs_send_failed', [
                'status' => $response->status(),
                'body' => $body,
            ]);
            $hint = '';
            if ($response->status() === 403 && str_contains($body, 'non-browser')) {
                $hint = ' Ouvrez https://dashboard.emailjs.com/admin/account/security et activez l’accès API hors navigateur (Allow API for non-browser / server).';
            }
            if ($response->status() === 400 && str_contains($body, 'template')) {
                $hint = ' Ouvrez https://dashboard.emailjs.com/admin/templates, ouvrez le modèle, copiez l’ID exact (URL ou paramètre template_id), puis mettez-le dans storage/app/emailjs-credentials.json ou EMAILJS_TEMPLATE_ID.';
            }
            throw new \RuntimeException('EmailJS HTTP '.$response->status().': '.$body.$hint);
        }

        Log::info('emailjs_send_ok', [
            'to' => $toEmail,
            'subject' => mb_substr($subject, 0, 120),
        ]);
    }

    /**
     * Variables alignées sur le modèle EmailJS « Contact Us » (title, name, email, to_name, message, to_email).
     *
     * @return array<string, string>
     */
    private function templateParams(string $toEmail, string $toName, string $subject, string $plainMessage): array
    {
        $fromName = (string) config('mail.from.name', config('app.name', 'E-Services'));
        $fromAddress = (string) config('mail.from.address', '');

        return [
            'to_email' => $toEmail,
            'to_name' => $toName !== '' ? $toName : 'Client',
            'message' => $plainMessage,
            /** Sujet sans préfixe ; dans EmailJS tu peux écrire : Contact : {{title}} */
            'title' => $subject,
            'email_subject' => $subject,
            /** From name + Reply-To côté modèle EmailJS */
            'name' => $fromName,
            'email' => $fromAddress !== '' ? $fromAddress : 'noreply@localhost',
        ];
    }

    /** Corps du {{message}} : le modèle HTML ajoute déjà « Bonjour {{to_name}} », */
    public static function plainBodyForStaffMessage(
        string $subjectLine,
        string $senderName,
        string $recipientName,
        string $bodyText,
        ?string $requestReference,
        ?string $portalUrl
    ): string {
        $lines = [
            $subjectLine,
            '',
        ];
        if ($requestReference) {
            $lines[] = 'Concernant la demande '.$requestReference.' :';
            $lines[] = '';
        }
        foreach (preg_split("/\r\n|\n|\r/", $bodyText) as $line) {
            $lines[] = $line;
        }
        $lines[] = '';
        $lines[] = '---';
        $lines[] = 'Message envoyé par '.$senderName.' (service E-Services).';
        if ($portalUrl) {
            $lines[] = '';
            $lines[] = 'Accéder à mon espace : '.$portalUrl;
        }
        $lines[] = '';
        $lines[] = 'Cordialement,';
        $lines[] = trim((string) config('notifications.mail_team_signature')) ?: 'L\'équipe #ADD';

        return implode("\n", $lines);
    }

    /** Corps texte type notification demande (client). */
    public static function plainBodyForRequestActivity(
        string $heading,
        array $bodyParagraphs,
        ?string $actionUrl,
        string $actionLabel
    ): string {
        $lines = [$heading, ''];
        foreach ($bodyParagraphs as $p) {
            $lines[] = $p;
            $lines[] = '';
        }
        if ($actionUrl) {
            $lines[] = $actionLabel.' : '.$actionUrl;
            $lines[] = '';
        }
        $lines[] = 'Cordialement,';
        $lines[] = trim((string) config('notifications.mail_team_signature')) ?: 'L\'équipe #ADD';

        return rtrim(implode("\n", $lines));
    }

    /** Corps texte annonce « nouveau service » (aligné sur l’e-mail HTML). */
    public static function plainBodyForServicePublishedClient(
        string $recipientName,
        string $agencyName,
        string $serviceName,
        ?string $publicationPlainLine,
        ?string $deadlinePlainLine,
        string $actionUrl,
        string $teamSignature,
    ): string {
        $lines = [
            'Bonjour '.$recipientName.',',
            '',
            'Nous vous informons que '.$agencyName.' a mis en place un nouveau service sur votre espace personnel.',
            '',
            'Service : '.$serviceName,
        ];
        if ($publicationPlainLine !== null && trim($publicationPlainLine) !== '') {
            $lines[] = '';
            $lines[] = $publicationPlainLine;
        }
        if ($deadlinePlainLine !== null && trim($deadlinePlainLine) !== '') {
            $lines[] = '';
            $lines[] = $deadlinePlainLine;
        }
        $lines[] = '';
        $lines[] = 'Vous pouvez accéder directement au formulaire en cliquant sur le lien ci-dessous :';
        $lines[] = '👉 '.$actionUrl;
        $lines[] = '';
        $lines[] = 'Nous vous invitons à compléter votre demande dans les plus brefs délais.';
        $lines[] = '';
        $lines[] = 'Pour toute assistance, notre équipe reste à votre disposition.';
        $lines[] = '';
        $lines[] = 'Cordialement,';
        $lines[] = $teamSignature;
        $lines[] = '';
        $lines[] = '---';
        $lines[] = 'Ce message a été envoyé automatiquement. Merci de ne pas y répondre.';

        return implode("\n", $lines);
    }
}
