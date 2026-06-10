<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Service;
use Symfony\Component\HttpFoundation\Response;

trait EnsuresServiceAcceptsClientRequests
{
    protected function ensureServiceAcceptsClientRequests(?Service $service): void
    {
        if ($service === null) {
            return;
        }

        if (! $service->is_active) {
            abort(response()->json([
                'success' => false,
                'message' => 'Ce service n’est pas disponible.',
                'code' => 'SERVICE_INACTIVE',
            ], Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        if ($service->published_at !== null && now()->lt($service->published_at)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Ce formulaire n’est pas encore ouvert.',
                'code' => 'SERVICE_NOT_YET_PUBLISHED',
            ], Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        $deadline = $service->request_deadline_at;
        if ($deadline !== null && now()->gt($deadline)) {
            abort(response()->json([
                'success' => false,
                'message' => 'La date limite pour déposer une demande pour ce service est dépassée.',
                'code' => 'SERVICE_DEADLINE_PASSED',
            ], Response::HTTP_UNPROCESSABLE_ENTITY));
        }
    }
}
