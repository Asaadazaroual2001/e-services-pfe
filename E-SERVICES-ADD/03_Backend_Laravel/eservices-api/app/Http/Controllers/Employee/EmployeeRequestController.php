<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCommentRequest;
use App\Models\Request;
use App\Models\RequestComment;
use App\Models\RequestHistory;
use App\Models\User;
use App\Services\RequestNotificationService;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;

class EmployeeRequestController extends Controller
{
    /**
     * List requests (role-based)
     * GET /api/employee/requests?status=&search=&assigned=
     */
    public function index(HttpRequest $request)
    {
        $query = $this->baseQueryForEmployee();

        if ($status = $request->input('status')) {
            $query->where('current_status', $status);
        }

        // assigned filter: "assigned" | "unassigned" | "".
        if ($assigned = $request->input('assigned')) {
            if ($assigned === 'assigned') {
                $query->whereNotNull('assigned_to');
            } elseif ($assigned === 'unassigned') {
                $query->whereNull('assigned_to');
            }
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhereHas('client', function ($qq) use ($search) {
                        $qq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('service', function ($qq) use ($search) {
                        $qq->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        $perPage = (int) ($request->input('per_page', 15));

        $requests = $query
            ->with([
                'client:id,name,email',
                'service' => static function ($q) {
                    $q->select('id', 'name', 'description', 'agency_id')
                        ->with('agency:id,name,city,code');
                },
                'assignedAgent:id,name,email',
                'latestTreatmentHistory.actor:id,name',
                'fieldValues' => static function ($q) {
                    $q->select('id', 'request_id', 'service_field_id', 'value_text', 'value_json')
                        ->with(['serviceField:id,label,key']);
                },
            ])
            ->orderByDesc('id')
            ->paginate(max(1, min(100, $perPage)));

        $requests->getCollection()->transform(function (Request $req) {
            return [
                'id' => $req->id,
                'reference' => $req->reference,
                'client_id' => $req->user_id,
                'client_name' => $req->resolveDisplayClientName(),
                'client_email' => $req->client?->email,
                'service_id' => $req->service_id,
                'service_name' => $req->service?->name,
                'agency_id' => $req->service?->agency_id,
                'agency_name' => $req->service?->agency?->name,
                'current_status' => $req->current_status,
                'is_active' => $req->is_active,
                'assigned_to' => $req->assigned_to,
                'assigned_agent_name' => $req->assignedAgent?->name ?? null,
                'treated_by_name' => $req->latestTreatmentHistory?->actor?->name,
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
     * Get request details, auto-mark as viewed
     * GET /api/employee/requests/{id}
     */
    public function show($id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        $this->loadRequestRelations($req);

        if (!$req->isViewed()) {
            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'VIEWED',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $req,
        ]);
    }

    /**
     * Assign request to self
     * POST /api/employee/requests/{id}/take
     */
    public function take($id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        $oldAssignedTo = $req->assigned_to;
        $req->update(['assigned_to' => auth()->id()]);

        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => 'ASSIGNED',
            'comment' => $oldAssignedTo
                ? "Réassignée à l'agent ID: {$req->assigned_to}"
                : "Assignée à l'agent ID: {$req->assigned_to}",
        ]);

        $this->loadRequestRelations($req);
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientRequestTaken($req, auth()->user()->name);

        return response()->json([
            'success' => true,
            'message' => 'Demande assignée à votre compte',
            'data' => $req,
        ]);
    }

    /**
     * Change status SUBMITTED→IN_REVIEW
     * POST /api/employee/requests/{id}/start-review
     */
    public function startReview($id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        // Only the assigned employee can start review.
        if ($req->assigned_to !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous devez être l\'agent assigné pour démarrer la révision.',
            ], 403);
        }

        if (!$req->canTransitionTo(Request::STATUS_IN_REVIEW)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible de démarrer la révision avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $req->update(['current_status' => Request::STATUS_IN_REVIEW]);

        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => Request::STATUS_IN_REVIEW,
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_IN_REVIEW,
            'comment' => 'Début de la révision',
        ]);

        $this->loadRequestRelations($req->refresh());
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange($req, $oldStatus, Request::STATUS_IN_REVIEW);

        return response()->json([
            'success' => true,
            'message' => 'Révision démarrée',
            'data' => $req,
        ]);
    }

    /**
     * Change status IN_REVIEW→NEEDS_INFO with comment
     * POST /api/employee/requests/{id}/request-info
     */
    public function requestInfo(AddCommentRequest $request, $id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        if ($req->assigned_to !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous devez être l\'agent assigné.',
            ], 403);
        }

        if (!$req->canTransitionTo(Request::STATUS_NEEDS_INFO)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible de demander des informations avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $validated = $request->validated();

        $req->update(['current_status' => Request::STATUS_NEEDS_INFO]);

        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => Request::STATUS_NEEDS_INFO,
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_NEEDS_INFO,
            'comment' => $validated['comment'],
        ]);

        $this->loadRequestRelations($req->refresh());
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange(
            $req,
            $oldStatus,
            Request::STATUS_NEEDS_INFO,
            $validated['comment']
        );

        return response()->json([
            'success' => true,
            'message' => 'Informations demandées',
            'data' => $req,
        ]);
    }

    /**
     * Change status IN_REVIEW→APPROVED
     * POST /api/employee/requests/{id}/approve
     */
    public function approve(HttpRequest $request, $id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        if ($req->assigned_to !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous devez être l\'agent assigné.',
            ], 403);
        }

        if (!$req->canTransitionTo(Request::STATUS_APPROVED)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible d'approuver avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $req->update(['current_status' => Request::STATUS_APPROVED]);

        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => Request::STATUS_APPROVED,
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_APPROVED,
            'comment' => $validated['comment'] ?? null,
        ]);

        $this->loadRequestRelations($req->refresh());
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange(
            $req,
            $oldStatus,
            Request::STATUS_APPROVED,
            $validated['comment'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Demande approuvée',
            'data' => $req,
        ]);
    }

    /**
     * Change status IN_REVIEW→REJECTED with required comment
     * POST /api/employee/requests/{id}/reject
     */
    public function reject(HttpRequest $request, $id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        if ($req->assigned_to !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous devez être l\'agent assigné.',
            ], 403);
        }

        if (!$req->canTransitionTo(Request::STATUS_REJECTED)) {
            return response()->json([
                'success' => false,
                'message' => "Impossible de rejeter avec le statut actuel: {$req->current_status}",
            ], 422);
        }

        $oldStatus = $req->current_status;
        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $req->update(['current_status' => Request::STATUS_REJECTED]);

        RequestHistory::create([
            'request_id' => $req->id,
            'actor_id' => auth()->id(),
            'action' => Request::STATUS_REJECTED,
            'from_status' => $oldStatus,
            'to_status' => Request::STATUS_REJECTED,
            'comment' => $validated['comment'],
        ]);

        $this->loadRequestRelations($req->refresh());
        $req->load(['client', 'service']);
        app(RequestNotificationService::class)->notifyClientStatusChange(
            $req,
            $oldStatus,
            Request::STATUS_REJECTED,
            $validated['comment']
        );

        return response()->json([
            'success' => true,
            'message' => 'Demande rejetée',
            'data' => $req,
        ]);
    }

    /**
     * Add comment
     * POST /api/employee/requests/{id}/comment
     */
    public function addComment(AddCommentRequest $request, $id)
    {
        $req = $this->baseQueryForEmployee()
            ->where('id', $id)
            ->findOrFail();

        DB::beginTransaction();
        try {
            $validated = $request->validated();

            $comment = RequestComment::create([
                'request_id' => $req->id,
                'user_id' => auth()->id(),
                'comment' => $validated['comment'],
            ]);

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
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout du commentaire',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dashboard stats
     * GET /api/employee/dashboard
     */
    public function dashboard()
    {
        $query = $this->baseQueryForEmployee();

        $statuses = [
            Request::STATUS_DRAFT,
            Request::STATUS_SUBMITTED,
            Request::STATUS_IN_REVIEW,
            Request::STATUS_NEEDS_INFO,
            Request::STATUS_APPROVED,
            Request::STATUS_REJECTED,
            Request::STATUS_CLOSED,
        ];

        $stats = array_fill_keys($statuses, 0);

        $rows = (clone $query)
            ->select('current_status', DB::raw('count(*) as total'))
            ->groupBy('current_status')
            ->get();

        foreach ($rows as $row) {
            $stats[$row->current_status] = (int) $row->total;
        }

        $recentRequests = (clone $query)
            ->with([
                'service:id,name',
                'client:id,name,email',
                'assignedAgent:id,name',
                'fieldValues' => static function ($q) {
                    $q->select('id', 'request_id', 'service_field_id', 'value_text', 'value_json')
                        ->with(['serviceField:id,label,key']);
                },
            ])
            ->orderByDesc('id')
            ->take(8)
            ->get()
            ->map(function (Request $req) {
                return [
                    'id' => $req->id,
                    'reference' => $req->reference,
                    'service_name' => $req->service?->name,
                    'client_name' => $req->resolveDisplayClientName(),
                    'current_status' => $req->current_status,
                    'assigned_agent_name' => $req->assignedAgent?->name ?? null,
                    'submitted_at' => $req->submitted_at,
                    'created_at' => $req->created_at,
                ];
            });

        return response()->json([
            'stats' => $stats,
            'recent_requests' => $recentRequests,
        ]);
    }

    /**
     * List users with agent/responsable/director roles
     * GET /api/employee/agents
     */
    public function agents()
    {
        $users = User::query()
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['agent', 'responsable', 'director']))
            ->orderByDesc('id')
            ->get(['id', 'name', 'email']);

        return response()->json($users);
    }

    private function baseQueryForEmployee()
    {
        $user = auth()->user();

        $query = Request::query()
            ->where('is_active', true);

        // Agents see assigned/unassigned.
        if ($user?->hasRole('agent')) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('assigned_to')
                    ->orWhere('assigned_to', $user->id);
            });
        }

        return $query;
    }

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
            'histories.actor:id,name',
        ]);
    }
}

