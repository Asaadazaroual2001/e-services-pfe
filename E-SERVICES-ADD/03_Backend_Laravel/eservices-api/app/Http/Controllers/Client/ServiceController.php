<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Admin\ServiceController as AdminServiceController;
use App\Models\Service;
use App\Services\RequestNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ServiceController extends AdminServiceController
{
    /**
     * Services actifs dont la date limite de dépôt n’est pas dépassée.
     */
    public function index(Request $request)
    {
        if (config('notifications.mail.new_service_to_clients', true)) {
            // Secours si le planificateur (cron / `php artisan schedule:work`) ne tourne pas :
            // au premier GET catalogue après l’heure de publication, on envoie les e-mails en attente.
            if (Cache::add('eservices:sweep-publication-notifications', true, now()->addSeconds(55))) {
                try {
                    app(RequestNotificationService::class)->sweepPendingPublicationNotifications();
                } catch (\Throwable $e) {
                    Log::warning('sweep_publication_notifications_catalog', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $request->merge([
            'is_active' => true,
            'open_for_requests' => true,
        ]);

        return parent::index($request);
    }

    /**
     * Détail réservé aux services encore ouverts aux demandes.
     * Si le service existe mais n’est pas accessible (brouillon, dates…), réponse JSON explicite (pas un 404 générique).
     */
    public function show($id)
    {
        $service = Service::query()
            ->with(['fields', 'agency:id,name,city,code'])
            ->find($id);

        if (! $service) {
            return response()->json([
                'success' => false,
                'message' => 'Ce service n’existe pas ou a été retiré.',
                'code' => 'SERVICE_NOT_FOUND',
            ], 404);
        }

        if (! $service->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Ce formulaire n’est pas disponible pour le moment (service désactivé).',
                'code' => 'SERVICE_INACTIVE',
            ], 403);
        }

        if ($service->published_at !== null && now()->lt($service->published_at)) {
            return response()->json([
                'success' => false,
                'message' => 'Ce formulaire n’est pas encore ouvert.',
                'code' => 'SERVICE_NOT_YET_PUBLISHED',
            ], 403);
        }

        $deadline = $service->request_deadline_at;
        if ($deadline !== null && now()->gt($deadline)) {
            return response()->json([
                'success' => false,
                'message' => 'La période de dépôt des demandes pour ce service est terminée.',
                'code' => 'SERVICE_DEADLINE_PASSED',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $service,
        ]);
    }
}
