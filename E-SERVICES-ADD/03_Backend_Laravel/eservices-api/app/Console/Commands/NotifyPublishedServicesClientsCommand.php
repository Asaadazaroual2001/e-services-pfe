<?php

namespace App\Console\Commands;

use App\Services\RequestNotificationService;
use Illuminate\Console\Command;

/**
 * Envoie l’e-mail « service publié » aux clients inscrits lorsque le portail vient d’ouvrir
 * (ex. date de publication programmée atteinte). En prod : cron sur `schedule:run` chaque minute.
 */
class NotifyPublishedServicesClientsCommand extends Command
{
    protected $signature = 'services:notify-published-clients';

    protected $description = 'Notifier les clients inscrits des services nouvellement ouverts sur le portail';

    public function handle(RequestNotificationService $notifier): int
    {
        $notifier->sweepPendingPublicationNotifications();

        return self::SUCCESS;
    }
}
