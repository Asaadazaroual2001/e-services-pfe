<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAgencyService;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Models\Agency;
use App\Models\Service;
use App\Models\ServiceField;
use App\Services\RequestNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    use AuthorizesAgencyService;

    /**
     * GET /api/admin/services?search=&is_active=1&agency_id=&per_page=10
     */
    public function index(Request $request)
    {
        $q = Service::query()->withCount('fields')->with('agency:id,name,city,code');

        $user = auth()->user();
        if ($user->hasRole('admin')) {
            if ($request->filled('agency_id')) {
                $q->where('agency_id', (int) $request->input('agency_id'));
            }
        } elseif ($user->hasRole('responsable')) {
            $agencyIds = Agency::query()
                ->where('responsable_user_id', $user->id)
                ->pluck('id');
            if ($user->agency_id) {
                $agencyIds = $agencyIds->push((int) $user->agency_id)->unique()->values();
            }
            if ($agencyIds->isEmpty()) {
                $q->whereRaw('0 = 1');
            } else {
                $q->whereIn('agency_id', $agencyIds);
            }
        } else {
            abort(403);
        }

        if ($s = $request->string('search')->toString()) {
            $q->where(function ($qq) use ($s) {
                $qq->where('name', 'ilike', "%{$s}%")
                    ->orWhere('description', 'ilike', "%{$s}%");
            });
        }

        if ($request->has('is_active')) {
            $q->where('is_active', (bool) $request->input('is_active'));
        }

        if ($request->boolean('open_for_requests')) {
            $q->openForClientRequests();
        }

        $perPage = (int) ($request->input('per_page', 10));
        $services = $q->orderByDesc('id')->paginate(max(1, min(100, $perPage)));

        return response()->json($services);
    }

    /**
     * POST /api/admin/services — réservé à l’admin (middleware + garde).
     */
    public function store(StoreServiceRequest $request)
    {
        $validated = $request->validated();
        $user = Auth::user();
        if ($user->hasRole('responsable') && !$user->hasRole('admin')) {
            $allowedAgencyIds = Agency::query()
                ->where('responsable_user_id', $user->id)
                ->pluck('id');
            if ($user->agency_id) {
                $allowedAgencyIds = $allowedAgencyIds->push((int) $user->agency_id)->unique()->values();
            }
            if (!$allowedAgencyIds->contains((int) $validated['agency_id'])) {
                abort(403, 'Vous ne pouvez créer un service que pour une agence dont vous êtes le responsable.');
            }
        }

        return DB::transaction(function () use ($request, $validated) {
            $serviceData = $request->safe()->only([
                'name',
                'description',
                'instructions',
                'procedure_steps',
                'required_documents',
                'eligibility_criteria',
                'estimated_duration',
                'is_active',
                'request_deadline_at',
                'published_at',
            ]);
            if (! array_key_exists('is_active', $serviceData)) {
                $serviceData['is_active'] = true;
            }
            $serviceData['agency_id'] = (int) $validated['agency_id'];

            if (empty(trim((string) ($serviceData['name'] ?? '')))) {
                $serviceData['name'] = 'Service ' . now()->format('Y-m-d H:i:s');
            }

            $service = Service::create($serviceData);

            $fields = $request->input('fields', []);
            $usedKeys = [];
            foreach ($fields as $index => $fieldData) {
                $base = Str::slug($fieldData['title'], '_');
                if ($base === '') {
                    $base = 'field';
                } elseif (preg_match('/^[0-9]/', $base)) {
                    $base = 'f_' . $base;
                }
                $key = $base;
                $suffix = 1;
                while (isset($usedKeys[$key])) {
                    $key = $base . '_' . $suffix++;
                }
                $usedKeys[$key] = true;

                ServiceField::create([
                    'service_id' => $service->id,
                    'key' => $key,
                    'label' => $fieldData['title'],
                    'type' => $fieldData['type'],
                    'description' => $fieldData['description'] ?? null,
                    'required' => (bool) ($fieldData['required'] ?? false),
                    'order' => $index,
                ]);
            }

            $serviceId = $service->id;
            DB::afterCommit(function () use ($serviceId) {
                $fresh = Service::query()->with('agency:id,name')->find($serviceId);
                if (! $fresh) {
                    return;
                }
                try {
                    app(RequestNotificationService::class)->maybeNotifyRegisteredClientsServicePublished($fresh);
                } catch (\Throwable $e) {
                    Log::warning('notify_registered_clients_service_published', [
                        'service_id' => $serviceId,
                        'error' => $e->getMessage(),
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Service et champs créés avec succès',
                'data' => $service->load(['fields', 'agency:id,name,city,code']),
            ], 201);
        });
    }

    /**
     * GET /api/admin/services/{service}
     */
    public function show(Service $service)
    {
        $this->assertCanManageService($service);

        return response()->json([
            'success' => true,
            'data' => $service->load(['fields', 'agency:id,name,city,code,responsable_user_id']),
        ]);
    }

    /**
     * PUT /api/admin/services/{service}
     */
    public function update(UpdateServiceRequest $request, Service $service)
    {
        $this->assertCanManageService($service);

        $validated = $request->validated();
        if (!auth()->user()->hasRole('admin')) {
            unset($validated['agency_id']);
        } elseif (array_key_exists('agency_id', $validated) && $validated['agency_id'] !== null) {
            $agency = Agency::find($validated['agency_id']);
            if (!$agency || $agency->responsable_user_id === null) {
                return response()->json([
                    'message' => 'L’agence doit avoir un responsable désigné.',
                ], 422);
            }
        }

        $service->update($validated);
        $service->refresh();
        $service->clearClientsPublicationNotifiedIfInactive();
        try {
            app(RequestNotificationService::class)->maybeNotifyRegisteredClientsServicePublished($service);
        } catch (\Throwable $e) {
            Log::warning('maybe_notify_clients_service_published', [
                'service_id' => $service->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Service mis à jour avec succès',
            'data' => $service->load(['fields', 'agency:id,name,city,code']),
        ]);
    }

    /**
     * DELETE /api/admin/services/{service}
     */
    public function destroy(Service $service)
    {
        $this->assertCanManageService($service);
        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service supprimé avec succès',
        ]);
    }

    /**
     * PATCH /api/admin/services/{service}/toggle-active
     */
    public function toggleActive(Service $service)
    {
        $this->assertCanManageService($service);
        $service->update([
            'is_active' => ! $service->is_active,
        ]);
        $service->refresh();
        $service->clearClientsPublicationNotifiedIfInactive();
        try {
            app(RequestNotificationService::class)->maybeNotifyRegisteredClientsServicePublished($service);
        } catch (\Throwable $e) {
            Log::warning('maybe_notify_clients_service_published', [
                'service_id' => $service->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => $service->is_active ? 'Service activé' : 'Service désactivé',
            'data' => $service,
        ]);
    }
}
