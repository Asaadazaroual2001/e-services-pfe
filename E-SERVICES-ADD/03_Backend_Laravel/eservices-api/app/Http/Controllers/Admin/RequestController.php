<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\ScopesRequestsForResponsable;
use App\Http\Controllers\Controller;
use App\Http\Requests\AddCommentRequest;
use App\Http\Requests\ApproveRejectRequestRequest;
use App\Http\Requests\AssignRequestRequest;
use App\Http\Requests\StoreRequestRequest;
use App\Http\Requests\UpdateRequestRequest;
use App\Models\Request;
use App\Models\RequestComment;
use App\Models\RequestHistory;
use App\Services\RequestNotificationService;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    use ScopesRequestsForResponsable;

    /**
     * Display a listing of requests with filters
     * GET /api/admin/requests?status=SUBMITTED&service_id=1&is_active=1&is_viewed=0&date_from=&date_to=&search=
     */
    public function index(HttpRequest $request)
    {
        $query = Request::query()
            ->with([
                'client:id,name,email,cin',
                'service' => static function ($q) {
                    $q->select('id', 'name', 'agency_id')
                        ->with('agency:id,name,city,code');
                },
                'assignedAgent:id,name',
                'latestTreatmentHistory.actor:id,name',
                'fieldValues' => static function ($q) {
                    $q->select('id', 'request_id', 'service_field_id', 'value_text', 'value_json')
                        ->with(['serviceField:id,label,key,type']);
                },
            ]);

        $this->applyRequestListScope($query);

        // Filter by status
        if ($status = $request->input('status')) {
            $query->where('current_status', $status);
        }

        // Filter by service
        if ($serviceId = $request->input('service_id')) {
            $query->where('service_id', $serviceId);
        }

        // Filter by client (user)
        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        // Filter by assigned agent
        if ($assignedTo = $request->input('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', (bool) $request->input('is_active'));
        }

        // Filter by « vue » par un employé (historique VIEWED)
        if ($request->filled('is_viewed')) {
            if ($request->boolean('is_viewed')) {
                $query->whereHas('histories', static function ($q) {
                    $q->where('action', 'VIEWED');
                });
            } else {
                $query->whereDoesntHave('histories', static function ($q) {
                    $q->where('action', 'VIEWED');
                });
            }
        }

        // Filter by date range
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Search by reference, service name (or description), or client name/email
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhereHas('service', function ($qq) use ($search) {
                        $qq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('description', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('client', function ($qq) use ($search) {
                        $qq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        // Pagination
        $perPage = (int) ($request->input('per_page', 15));
        $requests = $query->orderByDesc('id')->paginate(max(1, min(100, $perPage)));

        // Add computed fields to each request
        $requests->getCollection()->transform(function ($req) {
            return [
                'id' => $req->id,
                'reference' => $req->reference,
                'client_id' => $req->user_id,
                'client_name' => $req->resolveDisplayClientName(),
                'client_email' => $req->client?->email,
                'recipient_hint_email' => $req->resolveRecipientHintEmail(),
                'recipient_hint_cin' => $req->resolveRecipientHintCin(),
                'service_id' => $req->service_id,
                'service_name' => $req->service?->name,
                'agency_id' => $req->service?->agency_id,
                'agency_name' => $req->service?->agency?->name,
                'current_status' => $req->current_status,
                'is_active' => $req->is_active,
                'assigned_to' => $req->assigned_to,
                'assigned_agent_name' => $req->assignedAgent->name ?? null,
                'treated_by_name' => $req->latestTreatmentHistory?->actor->name,
                'treated_at' => $req->latestTreatmentHistory?->created_at,
                'is_viewed' => $req->isViewed(),
                'submitted_at' => $req->submitted_at,
                'created_at' => $req->created_at,
                'updated_at' => $req->updated_at,
            ];
        });

        return response()->json($requests);
    }

    /**
     * Store a newly created request (admin-create)
     * POST /api/admin/requests
     */
    public function store(StoreRequestRequest $request)
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();
            $this->assertResponsableCanUseServiceId((int) $data['service_id']);

            // Generate reference
            $data['reference'] = Request::generateReference();
            $data['current_status'] = $data['current_status'] ?? Request::STATUS_DRAFT;

            if ($data['current_status'] === Request::STATUS_SUBMITTED) {
                $data['submitted_at'] = now();
            }

            $req = Request::create($data);

            // Create field values if provided
            if (!empty($data['field_values'])) {
                foreach ($data['field_values'] as $fieldValue) {
                    $req->fieldValues()->create([
                        'service_field_id' => $fieldValue['service_field_id'],
                        'value_text' => $fieldValue['value'] ?? null,
                    ]);
                }
            }

            // Create history
            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'CREATED',
                'to_status' => $req->current_status,
                'comment' => 'Demande créée par un administrateur',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Demande créée avec succès',
                'data' => $req->load(['client', 'service.agency', 'fieldValues']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la demande',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified request with all relations
     * GET /api/admin/requests/{id}
     */
    public function show($id)
    {
        $request = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($request);

        if (! $request->isViewed()) {
            RequestHistory::create([
                'request_id' => $request->id,
                'actor_id' => auth()->id(),
                'action' => 'VIEWED',
            ]);
        }

        $this->loadRequestRelations($request);

        return response()->json([
            'success' => true,
            'data' => $request,
        ]);
    }

    /**
     * Update the specified request
     * PUT /api/admin/requests/{id}
     */
    public function update(UpdateRequestRequest $request, $id)
    {
        $req = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($req);
        $data = $request->validated();

        $oldStatus = $req->current_status;

        if (
            isset($data['current_status'])
            && $data['current_status'] === Request::STATUS_SUBMITTED
            && $req->submitted_at === null
        ) {
            $data['submitted_at'] = now();
        }

        $req->update($data);

        if (isset($data['current_status']) && $data['current_status'] !== $oldStatus) {
            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'STATUS_CHANGED',
                'from_status' => $oldStatus,
                'to_status' => $data['current_status'],
                'comment' => 'Statut modifié par un administrateur',
            ]);
            $req->refresh()->load(['client', 'service']);
            app(RequestNotificationService::class)->notifyClientStatusChange(
                $req,
                $oldStatus,
                $data['current_status'],
                'Modification effectuée par l’administration.'
            );
        } else {
            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'UPDATED',
                'comment' => 'Demande modifiée par un administrateur',
            ]);
        }

        // Refresh and load all relations
        $req->refresh();
        $this->loadRequestRelations($req);

        return response()->json([
            'success' => true,
            'message' => 'Demande mise à jour avec succès',
            'data' => $req,
        ]);
    }

    /**
     * Remove the specified request (soft delete or deactivate)
     * DELETE /api/admin/requests/{id}
     */
    public function destroy($id)
    {
        $request = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($request);

        // Deactivate instead of hard delete
        $request->update(['is_active' => false]);

        // Log history
        RequestHistory::create([
            'request_id' => $request->id,
            'actor_id' => auth()->id(),
            'action' => 'DELETED',
            'comment' => 'Demande désactivée par un administrateur',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande supprimée avec succès',
        ]);
    }

    /**
     * Assign a request to an agent
     * POST /api/admin/requests/{id}/assign
     */
    public function assign(AssignRequestRequest $request, $id)
    {
        $req = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($req);
        $data = $request->validated();

        $oldAssignedTo = $req->assigned_to;
        $req->update(['assigned_to' => $data['assigned_to']]);

        // Log history
        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => 'ASSIGNED',
            'comment' => $oldAssignedTo
                ? "Réassignée à l'agent ID: {$data['assigned_to']}"
                : "Assignée à l'agent ID: {$data['assigned_to']}",
        ]);

        $req->load(['assignedAgent:id,name,email', 'client', 'service']);
        app(RequestNotificationService::class)->notifyClientRequestAssignedByAdmin(
            $req,
            $req->assignedAgent?->name
        );

        return response()->json([
            'success' => true,
            'message' => 'Demande assignée avec succès',
            'data' => $req->load('assignedAgent'),
        ]);
    }

    /**
     * Mark request as viewed
     * POST /api/admin/requests/{id}/mark-viewed
     */
    public function markViewed($id)
    {
        $request = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($request);

        // Check if already viewed
        if ($request->isViewed()) {
            return response()->json([
                'success' => true,
                'message' => 'Demande déjà consultée',
            ]);
        }

        // Log history
        RequestHistory::create([
            'request_id' => $request->id,
            'actor_id' => auth()->id(),
            'action' => 'VIEWED',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande marquée comme vue',
        ]);
    }

    /**
     * Approve a request
     * POST /api/admin/requests/{id}/approve
     */
    public function approve(ApproveRejectRequestRequest $request, $id)
    {
        $req = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($req);

        // Validate status transition
        if (!$req->canTransitionTo(Request::STATUS_APPROVED)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible d'approuver une demande avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $req->update(['current_status' => Request::STATUS_APPROVED]);

        // Log history
        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => 'APPROVED',
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_APPROVED,
            'comment' => $request->input('comment'),
        ]);

        // Refresh and load all relations
        $req->refresh();
        $this->loadRequestRelations($req);
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange(
            $req,
            $oldStatus,
            Request::STATUS_APPROVED,
            $request->input('comment')
        );

        return response()->json([
            'success' => true,
            'message' => 'Demande approuvée avec succès',
            'data' => $req,
        ]);
    }

    /**
     * Reject a request
     * POST /api/admin/requests/{id}/reject
     */
    public function reject(ApproveRejectRequestRequest $request, $id)
    {
        $req = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($req);

        // Validate status transition
        if (!$req->canTransitionTo(Request::STATUS_REJECTED)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible de rejeter une demande avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $req->update(['current_status' => Request::STATUS_REJECTED]);

        // Log history
        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => 'REJECTED',
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_REJECTED,
            'comment' => $request->input('comment'),
        ]);

        // Refresh and load all relations
        $req->refresh();
        $this->loadRequestRelations($req);
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange(
            $req,
            $oldStatus,
            Request::STATUS_REJECTED,
            $request->input('comment')
        );

        return response()->json([
            'success' => true,
            'message' => 'Demande rejetée avec succès',
            'data' => $req,
        ]);
    }

    /**
     * Toggle active status
     * POST /api/admin/requests/{id}/toggle-active
     */
    public function toggleActive($id)
    {
        $request = Request::findOrFail($id);
        $this->assertCanAccessAdminRequest($request);

        $request->update(['is_active' => !$request->is_active]);

        // Log history
        RequestHistory::create([
            'request_id' => $request->id,
            'actor_id' => auth()->id(),
            'action' => $request->is_active ? 'ACTIVATED' : 'DEACTIVATED',
        ]);

        return response()->json([
            'success' => true,
            'message' => $request->is_active ? 'Demande activée' : 'Demande désactivée',
            'data' => $request,
        ]);
    }

    /**
     * Add a comment to a request
     * POST /api/admin/requests/{id}/comment
     */
    public function addComment(AddCommentRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $req = Request::findOrFail($id);
            $this->assertCanAccessAdminRequest($req);
            $data = $request->validated();

            // Create comment
            $comment = RequestComment::create([
                'request_id' => $req->id,
                'user_id' => auth()->id(),
                'comment' => $data['comment'],
            ]);

            // Log history
            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'COMMENTED',
                'comment' => 'Commentaire ajouté',
            ]);

            DB::commit();

            $comment->load('user:id,name');
            $req->refresh()->load(['client', 'service']);
            app(RequestNotificationService::class)->afterStaffComment($req, $comment);

            return response()->json([
                'success' => true,
                'message' => 'Commentaire ajouté avec succès',
                'data' => $comment,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout du commentaire',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Load all request relations (used for consistent responses)
     * @param Request $request
     * @return void
     */
    private function loadRequestRelations(Request $request): void
    {
        $request->load([
            'client:id,name,email',
            'service' => static function ($q) {
                $q->with(['fields', 'agency:id,name,city,code']);
            },
            'assignedAgent:id,name,email',
            'fieldValues.serviceField',
            'documents.uploader:id,name',
            'comments.user:id,name',
            'histories.actor:id,name'
        ]);
    }
}
