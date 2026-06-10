<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Concerns\EnsuresServiceAcceptsClientRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequestRequest;
use App\Models\Request;
use App\Models\Service;
use App\Models\RequestFieldValue;
use App\Models\RequestHistory;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class RequestController extends Controller
{
    use EnsuresServiceAcceptsClientRequests;

    /**
     * Display list of active services for clients
     * GET /api/services
     */
    public function servicesIndex(HttpRequest $request)
    {
        $query = Service::query()
            ->openForClientRequests()
            ->with('fields');

        // Optional search
        if ($search = $request->input('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        $perPage = (int) ($request->input('per_page', 10));
        $services = $query->orderBy('name')->paginate(max(1, min(100, $perPage)));

        return response()->json($services);
    }

    /**
     * Display specific service with fields for clients
     * GET /api/services/{id}
     */
    public function serviceShow($id)
    {
        $service = Service::with('fields')
            ->openForClientRequests()
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $service
        ]);
    }

    /**
     * Create a new request from client (dynamic form submission)
     * POST /api/requests
     */
    public function store(StoreClientRequestRequest $request)
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();

            $service = Service::query()
                ->whereKey((int) $data['service_id'])
                ->where('is_active', true)
                ->firstOrFail();
            $this->ensureServiceAcceptsClientRequests($service);

            // Generate reference
            $data['reference'] = Request::generateReference();
            $data['user_id'] = Auth::id();
            $data['current_status'] = Request::STATUS_SUBMITTED;
            $data['submitted_at'] = now();

            $newRequest = Request::create($data);

            // Create dynamic field values
            if (!empty($data['values'])) {
                foreach ($data['values'] as $valueData) {
                    RequestFieldValue::create([
                        'request_id' => $newRequest->id,
                        'service_field_id' => $valueData['field_id'],
                        'value_text' => $valueData['value'] ?? null,
                    ]);
                }
            }

            // Create history
            RequestHistory::create([
                'request_id' => $newRequest->id,
                'actor_id' => Auth::id(),
                'action' => 'CREATED',
                'to_status' => Request::STATUS_SUBMITTED,
                'comment' => 'Demande créée par le client',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Demande soumise avec succès! Référence: ' . $newRequest->reference,
                'data' => $newRequest->load(['service', 'fieldValues.serviceField'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
