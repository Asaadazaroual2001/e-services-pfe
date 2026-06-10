<?php

namespace App\Services;

use App\Mail\RequestActivityMail;
use App\Mail\ServicePublishedClientMail;
use App\Models\Request as DemandRequest;
use App\Models\RequestComment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RequestNotificationService
{
    private const STATUS_FR = [
        DemandRequest::STATUS_DRAFT => 'Brouillon',
        DemandRequest::STATUS_SUBMITTED => 'Soumise',
        DemandRequest::STATUS_IN_REVIEW => 'En révision',
        DemandRequest::STATUS_NEEDS_INFO => 'Informations requises',
        DemandRequest::STATUS_APPROVED => 'Approuvée',
        DemandRequest::STATUS_REJECTED => 'Rejetée',
        DemandRequest::STATUS_CLOSED => 'Fermée',
    ];

    public function clientEmail(DemandRequest $req): ?string
    {
        $email = $req->client?->email;
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $email;
    }

    private function frontendBase(): string
    {
        return config('notifications.urls.frontend', config('app.url'));
    }

    private function clientServiceRequestUrl(Service $service): string
    {
        return $this->frontendBase().'/client/services/'.$service->id.'/request';
    }

    /**
     * Parcourt les services pas encore marqués « notifiés » et tente l’envoi si le portail est ouvert.
     * Utilisé par la commande planifiée et, en secours, par le catalogue public (sans cron en local).
     */
    public function sweepPendingPublicationNotifications(): void
    {
        Service::query()
            ->whereNull('clients_publication_notified_at')
            ->orderBy('id')
            ->chunkById(100, function ($services) {
                foreach ($services as $service) {
                    try {
                        $this->maybeNotifyRegisteredClientsServicePublished($service);
                    } catch (\Throwable $e) {
                        Log::warning('sweep_notify_clients_service_published', [
                            'service_id' => $service->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    /**
     * E-mail aux clients inscrits uniquement lorsque le service est réellement ouvert sur le portail
     * (actif, publié, avant échéance). Sinon ne fait rien (ex. « non publié » / date de publication future).
     * Une fois envoyé, clients_publication_notified_at est renseigné (sauf en cas d’échec total avant marquage).
     */
    public function maybeNotifyRegisteredClientsServicePublished(Service $service): void
    {
        if (! config('notifications.mail.new_service_to_clients', true)) {
            Log::info('service_published_notify_skip', [
                'service_id' => $service->id,
                'reason' => 'MAIL_NEW_SERVICE_TO_CLIENTS désactivé',
            ]);

            return;
        }

        $service->refresh();

        if (! $service->acceptsNewRequestsFromClients()) {
            Log::info('service_published_notify_skip', [
                'service_id' => $service->id,
                'reason' => 'service_pas_encore_ouvert_portail',
                'is_active' => $service->is_active,
                'published_at' => $service->published_at?->toIso8601String(),
                'request_deadline_at' => $service->request_deadline_at?->toIso8601String(),
                'hint' => 'E-mail seulement si actif, date de publication atteinte (ou vide), et avant la date limite. Sinon attendre la tâche planifiée ou corriger les dates.',
            ]);

            return;
        }

        if ($service->clients_publication_notified_at !== null) {
            return;
        }

        $service->loadMissing('agency:id,name');

        $recipients = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'client'))
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->where(function ($q) use ($service) {
                $q->whereNull('agency_id')
                    ->orWhere('agency_id', (int) $service->agency_id);
            })
            ->get(['id', 'name', 'email']);

        if ($recipients->isEmpty()) {
            Log::info('service_published_notify_skip', [
                'service_id' => $service->id,
                'reason' => 'aucun_compte_client',
                'hint' => 'Il faut au moins un utilisateur avec le rôle « client » et un e-mail valide (agency_id vide ou = agence du service).',
            ]);

            return;
        }

        $actionUrl = $this->clientServiceRequestUrl($service);
        $subject = 'Nouveau service disponible : '.$service->name;

        $anySent = false;
        foreach ($recipients as $user) {
            $email = $user->email;
            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            if ($this->sendNewServiceMail($email, $user, $service, $actionUrl, $subject)) {
                $anySent = true;
            }
        }

        if ($anySent) {
            Service::query()->whereKey($service->id)->update(['clients_publication_notified_at' => now()]);
            Log::info('service_published_notify_sent', ['service_id' => $service->id]);
        } else {
            Log::warning('service_published_notify_all_failed', [
                'service_id' => $service->id,
                'hint' => 'Vérifier EmailJS, ou MAIL_MAILER (log = pas de boîte mail, voir storage/logs/laravel.log).',
            ]);
        }
    }

    private function servicePublishedTeamSignature(): string
    {
        return trim((string) config('notifications.mail_team_signature')) ?: 'L\'équipe ADD-Services';
    }

    private function formatDateForMail(?CarbonInterface $dt): string
    {
        if ($dt === null) {
            return '';
        }

        $tz = (string) config('notifications.display_timezone', 'Africa/Casablanca');

        return $dt->copy()->timezone($tz)->format('d/m/Y \à H:i');
    }

    private function sendNewServiceMail(
        string $to,
        User $user,
        Service $service,
        string $actionUrl,
        string $subject,
    ): bool {
        if (! config('notifications.mail.new_service_to_clients', true)) {
            return false;
        }

        $teamSignature = $this->servicePublishedTeamSignature();
        $agencyName = trim((string) ($service->agency?->name ?? ''));
        if ($agencyName === '') {
            $agencyName = 'votre agence';
        }

        $publicationDate = null;
        if ($service->published_at !== null) {
            $publicationDate = $this->formatDateForMail($service->published_at);
        }
        $publicationPlain = $publicationDate !== null
            ? '📅 Date de publication : '.$publicationDate.' (heure du Maroc)'
            : null;

        $deadline = null;
        if ($service->request_deadline_at !== null) {
            $deadline = $this->formatDateForMail($service->request_deadline_at);
        }
        $deadlinePlain = $deadline !== null
            ? '📅 Date limite : '.$deadline.' (heure du Maroc)'
            : null;

        $displayName = trim((string) $user->name) !== '' ? trim((string) $user->name) : 'Client';

        $sender = app(EmailJsSender::class);
        if ($sender->isConfigured()) {
            try {
                $plain = EmailJsSender::plainBodyForServicePublishedClient(
                    $displayName,
                    $agencyName,
                    $service->name,
                    $publicationPlain,
                    $deadlinePlain,
                    $actionUrl,
                    $teamSignature
                );
                $sender->send($to, $displayName, $subject, $plain);

                return true;
            } catch (\Throwable $e) {
                Log::warning('new_service_notification_emailjs_failed_fallback_mail', [
                    'to' => $to,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        try {
            Mail::to($to)->send(new ServicePublishedClientMail(
                $subject,
                $displayName,
                $agencyName,
                $service->name,
                $publicationDate,
                $deadline,
                $actionUrl,
                $teamSignature
            ));

            return true;
        } catch (\Throwable $e) {
            Log::warning('new_service_notification_mail_failed', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function clientRequestUrl(DemandRequest $req): string
    {
        return $this->frontendBase().'/client/requests/'.$req->id;
    }

    private function employeeRequestUrl(DemandRequest $req): string
    {
        return $this->frontendBase().'/employee/requests/'.$req->id;
    }

    public function notifyClientStatusChange(
        DemandRequest $req,
        ?string $oldStatus,
        string $newStatus,
        ?string $detail = null
    ): void {
        $to = $this->clientEmail($req);
        if (!$to) {
            return;
        }

        $ref = $req->reference;
        $service = $req->service?->name ?? 'Service';
        $oldLabel = $oldStatus ? (self::STATUS_FR[$oldStatus] ?? $oldStatus) : '—';
        $newLabel = self::STATUS_FR[$newStatus] ?? $newStatus;

        $heading = $this->headingForStatusChange($newStatus);
        $paragraphs = $this->paragraphsForStatusChange($ref, $service, $oldStatus, $oldLabel, $newLabel, $newStatus, $detail);

        $subject = match ($newStatus) {
            DemandRequest::STATUS_SUBMITTED => "[{$ref}] Demande reçue",
            DemandRequest::STATUS_APPROVED => "[{$ref}] Demande acceptée",
            DemandRequest::STATUS_REJECTED => "[{$ref}] Demande refusée",
            DemandRequest::STATUS_NEEDS_INFO => "[{$ref}] Action requise sur votre demande",
            default => "[{$ref}] Mise à jour de votre demande",
        };

        $this->sendSafe(
            $to,
            $subject,
            $heading,
            $paragraphs,
            $this->clientRequestUrl($req),
            'Voir ma demande',
            $req->client?->name,
            true
        );
    }

    private function headingForStatusChange(string $newStatus): string
    {
        return match ($newStatus) {
            DemandRequest::STATUS_SUBMITTED => 'Demande enregistrée avec succès',
            DemandRequest::STATUS_IN_REVIEW => 'Votre demande est en cours d’étude',
            DemandRequest::STATUS_NEEDS_INFO => 'Informations complémentaires demandées',
            DemandRequest::STATUS_APPROVED => 'Votre demande a été acceptée',
            DemandRequest::STATUS_REJECTED => 'Votre demande a été refusée',
            DemandRequest::STATUS_CLOSED => 'Votre demande est clôturée',
            default => 'Mise à jour de votre demande',
        };
    }

    /**
     * @return list<string>
     */
    private function paragraphsForStatusChange(
        string $ref,
        string $service,
        ?string $oldStatus,
        string $oldLabel,
        string $newLabel,
        string $newStatus,
        ?string $detail
    ): array {
        $lines = [];

        if ($newStatus === DemandRequest::STATUS_APPROVED) {
            $lines[] = "Bonne nouvelle : la demande **{$ref}** ({$service}) a été **acceptée** par le service.";
        } elseif ($newStatus === DemandRequest::STATUS_REJECTED) {
            $lines[] = "La demande **{$ref}** ({$service}) a été **refusée**.";
        } elseif ($newStatus === DemandRequest::STATUS_SUBMITTED) {
            $lines[] = "Nous avons bien reçu votre demande **{$ref}** concernant « {$service} ».";
            $lines[] = 'Vous recevrez un e-mail à chaque changement important (traitement, décision, message du service).';
        } else {
            $lines[] = "Votre demande **{$ref}** ({$service}) a évolué.";
        }

        if ($oldStatus) {
            $lines[] = "Ancien statut : {$oldLabel}.";
        }
        $lines[] = "Statut actuel : **{$newLabel}**.";
        if ($detail) {
            $lines[] = '';
            $lines[] = $detail;
        }

        return $lines;
    }

    public function notifyClientStaffComment(DemandRequest $req, string $actorName, string $commentText): void
    {
        $to = $this->clientEmail($req);
        if (!$to) {
            return;
        }

        $ref = $req->reference;
        $preview = mb_strlen($commentText) > 400 ? mb_substr($commentText, 0, 400).'…' : $commentText;

        $this->sendSafe(
            $to,
            "[{$ref}] Nouveau message sur votre demande",
            'Nouveau message du service',
            [
                "Un message concernant votre demande **{$ref}** a été publié par **{$actorName}** :",
                '',
                $preview,
                '',
                'Vous pouvez répondre depuis votre espace client.',
            ],
            $this->clientRequestUrl($req),
            'Répondre / voir la demande',
            $req->client?->name,
            true
        );
    }

    public function notifyClientRequestTaken(DemandRequest $req, string $agentName): void
    {
        $to = $this->clientEmail($req);
        if (!$to) {
            return;
        }

        $ref = $req->reference;

        $this->sendSafe(
            $to,
            "[{$ref}] Prise en charge de votre demande",
            'Votre demande est prise en charge',
            [
                "La demande **{$ref}** est suivie par **{$agentName}**.",
                'Vous serez informé par e-mail des prochaines étapes.',
            ],
            $this->clientRequestUrl($req),
            'Suivre ma demande',
            $req->client?->name,
            true
        );
    }

    public function notifyClientRequestAssignedByAdmin(DemandRequest $req, ?string $agentName): void
    {
        $to = $this->clientEmail($req);
        if (!$to) {
            return;
        }

        $ref = $req->reference;
        $who = $agentName ?: 'un agent';

        $this->sendSafe(
            $to,
            "[{$ref}] Assignation de votre demande",
            'Assignation de votre demande',
            [
                "Votre demande **{$ref}** a été assignée à **{$who}**.",
                'Connectez-vous pour suivre l’avancement.',
            ],
            $this->clientRequestUrl($req),
            'Voir ma demande',
            $req->client?->name,
            true
        );
    }

    public function notifyAgentClientCommented(DemandRequest $req, User $client, string $commentText): void
    {
        $agentId = $req->assigned_to;
        if (!$agentId) {
            return;
        }

        $agent = User::query()->whereKey($agentId)->first();
        $to = $agent?->email;
        if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $ref = $req->reference;
        $preview = mb_strlen($commentText) > 400 ? mb_substr($commentText, 0, 400).'…' : $commentText;

        $this->sendSafe(
            $to,
            "[{$ref}] Nouveau commentaire client",
            'Commentaire du client',
            [
                "Bonjour **{$agent->name}**,",
                '',
                "Le client **{$client->name}** a commenté la demande **{$ref}** :",
                '',
                $preview,
            ],
            $this->employeeRequestUrl($req),
            'Ouvrir la demande',
            $agent->name,
            false
        );
    }

    /**
     * Après un commentaire agent / admin.
     */
    public function afterStaffComment(DemandRequest $req, RequestComment $comment): void
    {
        $actorName = $comment->user?->name ?? 'Service';
        $this->notifyClientStaffComment($req, $actorName, $comment->comment);
    }

    /**
     * @param  list<string>  $bodyParagraphs
     */
    private function sendSafe(
        string $to,
        string $subject,
        string $heading,
        array $bodyParagraphs,
        ?string $actionUrl,
        string $actionLabel = 'Ouvrir le portail',
        ?string $recipientDisplayName = null,
        bool $toClient = false
    ): void {
        if (!config('notifications.mail.request_events', true)) {
            return;
        }

        $sender = app(EmailJsSender::class);
        if ($toClient && $sender->isConfigured()) {
            try {
                $plain = EmailJsSender::plainBodyForRequestActivity(
                    $heading,
                    $bodyParagraphs,
                    $actionUrl,
                    $actionLabel
                );
                $sender->send(
                    $to,
                    $recipientDisplayName !== null && trim($recipientDisplayName) !== '' ? trim($recipientDisplayName) : 'Client',
                    $subject,
                    $plain
                );

                return;
            } catch (\Throwable $e) {
                Log::warning('request_notification_emailjs_failed_fallback_mail', [
                    'to' => $to,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        try {
            Mail::to($to)->send(new RequestActivityMail(
                $subject,
                $heading,
                $bodyParagraphs,
                $actionUrl,
                $actionLabel
            ));
        } catch (\Throwable $e) {
            Log::warning('request_notification_mail_failed', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
