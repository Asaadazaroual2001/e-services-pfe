<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Concerns\EnsuresServiceAcceptsClientRequests;
use App\Http\Controllers\Concerns\PersistsClientRequestFields;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRequestRequest;
use App\Http\Requests\UpdateRequestRequest;
use App\Http\Requests\AddCommentRequest;
use App\Models\Request;
use App\Models\RequestComment;
use App\Models\RequestDocument;
use App\Models\RequestHistory;
use App\Models\Service;
use App\Models\ServiceField;
use App\Services\RequestNotificationService;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ClientRequestController extends Controller
{
    use EnsuresServiceAcceptsClientRequests;
    use PersistsClientRequestFields;

    /**
     * Display authenticated user's requests with filters
     * GET /api/client/requests?status=&service_id=&search=
     */
    public function index(HttpRequest $request)
    {
        $userId = auth()->id();

        $query = Request::query()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->with([
                'service' => static function ($q) {
                    $q->select('id', 'name', 'agency_id')
                        ->with('agency:id,name,city,code');
                },
                'assignedAgent:id,name,email',
            ]);

        if ($status = $request->input('status')) {
            $query->where('current_status', $status);
        }

        if ($serviceId = $request->input('service_id')) {
            $query->where('service_id', $serviceId);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhereHas('service', function ($qq) use ($search) {
                        $qq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('description', 'ilike', "%{$search}%");
                    });
            });
        }

        $perPage = (int) ($request->input('per_page', 15));
        $requests = $query->orderByDesc('id')->paginate(max(1, min(100, $perPage)));

        $requests->getCollection()->transform(function (Request $req) {
            return [
                'id' => $req->id,
                'reference' => $req->reference,
                'service_id' => $req->service_id,
                'service_name' => $req->service?->name ?? 'N/A',
                'agency_id' => $req->service?->agency_id,
                'agency_name' => $req->service?->agency?->name ?? 'N/A',
                'current_status' => $req->current_status,
                'is_active' => $req->is_active,
                'assigned_to' => $req->assigned_to,
                'assigned_agent_name' => $req->assignedAgent?->name ?? null,
                'submitted_at' => $req->submitted_at,
                'created_at' => $req->created_at,
                'is_viewed' => $req->isViewed(),
                'updated_at' => $req->updated_at,
            ];
        });

        return response()->json($requests);
    }

    /**
     * Get single request with service, fieldValues, documents, comments, histories
     * GET /api/client/requests/{id}
     */
    public function show($id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        $req->load([
            'service' => static function ($q) {
                $q->with(['fields', 'agency:id,name,city,code']);
            },
            'fieldValues.serviceField',
            'documents.uploader:id,name',
            'comments.user:id,name',
            'histories.actor:id,name',
            'assignedAgent:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $req,
        ]);
    }

    /**
     * Create new request (draft) with field_values
     * POST /api/client/requests
     */
    public function store(HttpRequest $request)
    {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ]);

        $userId = auth()->id();
        $serviceId = (int) $data['service_id'];
        $fieldValues = $data['field_values'] ?? [];

        $service = Service::query()->where('is_active', true)->whereKey($serviceId)->firstOrFail();
        $this->ensureServiceAcceptsClientRequests($service);

        DB::beginTransaction();
        try {
            // Ensure all field_values belong to the chosen service.
            $allowedFieldIds = ServiceField::where('service_id', $serviceId)->pluck('id')->all();
            $incomingFieldIds = collect($fieldValues)->pluck('service_field_id')->unique()->values()->all();
            $invalid = collect($incomingFieldIds)->diff($allowedFieldIds)->values()->all();
            if (!empty($invalid)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Certains champs ne correspondent pas au service sélectionné',
                    'invalid_service_field_ids' => $invalid,
                ], 422);
            }

            $req = Request::create([
                'reference' => Request::generateReference(),
                'service_id' => $serviceId,
                'user_id' => $userId,
                'assigned_to' => null,
                'current_status' => Request::STATUS_DRAFT,
                'is_active' => true,
                'submitted_at' => null,
            ]);

            $this->persistFieldValues($req, $serviceId, $fieldValues);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => $userId,
                'action' => 'CREATED',
                'from_status' => null,
                'to_status' => Request::STATUS_DRAFT,
                'comment' => 'Demande créée par le client (brouillon)',
            ]);

            $req->load([
                'service' => static function ($q) {
                    $q->with(['fields', 'agency:id,name,city,code']);
                },
                'fieldValues.serviceField',
                'documents.uploader:id,name',
                'comments.user:id,name',
                'histories.actor:id,name',
                'assignedAgent:id,name,email',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Demande créée avec succès',
                'data' => $req,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la demande',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update draft request
     * PUT /api/client/requests/{id}
     */
    public function update(HttpRequest $request, $id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->where('current_status', Request::STATUS_DRAFT)
            ->where('is_active', true)
            ->findOrFail($id);

        $data = $request->validate([
            'service_id' => ['sometimes', 'integer', 'exists:services,id'],
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ]);

        $serviceId = isset($data['service_id']) ? (int) $data['service_id'] : (int) $req->service_id;
        $fieldValues = array_key_exists('field_values', $data) ? ($data['field_values'] ?? []) : null;

        DB::beginTransaction();
        try {
            if (isset($data['service_id'])) {
                $newService = Service::query()->where('is_active', true)->whereKey($serviceId)->firstOrFail();
                $this->ensureServiceAcceptsClientRequests($newService);
                $req->update(['service_id' => $serviceId]);
            }

            if ($fieldValues !== null) {
                $allowedFieldIds = ServiceField::where('service_id', $serviceId)->pluck('id')->all();
                $incomingFieldIds = collect($fieldValues)->pluck('service_field_id')->unique()->values()->all();
                $invalid = collect($incomingFieldIds)->diff($allowedFieldIds)->values()->all();
                if (!empty($invalid)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Certains champs ne correspondent pas au service sélectionné',
                        'invalid_service_field_ids' => $invalid,
                    ], 422);
                }

                $req->fieldValues()->delete();
                $this->persistFieldValues($req, $serviceId, $fieldValues);
            }

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'UPDATED',
                'comment' => 'Demande mise à jour par le client (brouillon)',
            ]);

            $req->refresh();
            $req->load([
                'service' => static function ($q) {
                    $q->with(['fields', 'agency:id,name,city,code']);
                },
                'fieldValues.serviceField',
                'documents.uploader:id,name',
                'comments.user:id,name',
                'histories.actor:id,name',
                'assignedAgent:id,name,email',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Demande mise à jour avec succès',
                'data' => $req,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la demande',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit draft (validate required fields, change status DRAFT→SUBMITTED)
     * POST /api/client/requests/{id}/submit
     */
    public function submit(HttpRequest $request, $id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->where('current_status', Request::STATUS_DRAFT)
            ->where('is_active', true)
            ->findOrFail($id);

        $authUser = auth()->user();
        if ($authUser && $authUser->hasRole('client')) {
            $authUser->refresh();
            if ($authUser->cin === null || trim((string) $authUser->cin) === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Le nom, l’e-mail et le CIN sont obligatoires pour soumettre une demande. Complétez votre CIN dans Mon profil.',
                    'requires_profile' => true,
                ], 422);
            }
        }

        $req->loadMissing('service');
        $this->ensureServiceAcceptsClientRequests($req->service);

        $data = $request->validate([
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ]);

        DB::beginTransaction();
        try {
            $serviceId = (int) $req->service_id;
            $fieldValues = array_key_exists('field_values', $data)
                ? ($data['field_values'] ?? [])
                : null;

            if ($fieldValues !== null) {
                $allowedFieldIds = ServiceField::where('service_id', $serviceId)->pluck('id')->all();
                $incomingFieldIds = collect($fieldValues)->pluck('service_field_id')->unique()->values()->all();
                $invalid = collect($incomingFieldIds)->diff($allowedFieldIds)->values()->all();
                if (!empty($invalid)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Certains champs ne correspondent pas au service sélectionné',
                        'invalid_service_field_ids' => $invalid,
                    ], 422);
                }

                $req->fieldValues()->delete();
                $this->persistFieldValues($req, $serviceId, $fieldValues);
            }

            $req->load([
                'service' => static function ($q) {
                    $q->with(['fields', 'agency:id,name,city,code']);
                },
                'fieldValues.serviceField',
                'documents',
            ]);

            [$ok, $errors] = $this->validateRequiredFieldsOrErrors($req);
            if (!$ok) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Certains champs requis sont manquants',
                    'errors' => $errors,
                ], 422);
            }

            if (!$req->canTransitionTo(Request::STATUS_SUBMITTED)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Impossible de soumettre une demande avec le statut actuel: {$req->current_status}",
                ], 422);
            }

            $oldStatus = $req->current_status;
            $req->update([
                'current_status' => Request::STATUS_SUBMITTED,
                'submitted_at' => now(),
            ]);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'SUBMITTED',
                'from_status' => $oldStatus,
                'to_status' => Request::STATUS_SUBMITTED,
                'comment' => 'Demande soumise',
            ]);

            $req->refresh();
            $req->load([
                'service' => static function ($q) {
                    $q->with(['fields', 'agency:id,name,city,code']);
                },
                'fieldValues.serviceField',
                'documents.uploader:id,name',
                'comments.user:id,name',
                'histories.actor:id,name',
                'assignedAgent:id,name,email',
            ]);

            DB::commit();

            $req->load(['client', 'service']);
            app(RequestNotificationService::class)->notifyClientStatusChange(
                $req,
                $oldStatus,
                Request::STATUS_SUBMITTED,
                'Votre demande a bien été transmise au service.'
            );

            return response()->json([
                'success' => true,
                'message' => 'Demande soumise avec succès',
                'data' => $req,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission de la demande',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload file to request
     * POST /api/client/requests/{id}/documents
     */
    public function uploadDocument(HttpRequest $request, $id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->findOrFail($id);

        if ($req->current_status === Request::STATUS_CLOSED) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'ajouter un document à une demande clôturée',
            ], 422);
        }

        $file = $request->file('document') ?? $request->file('file');
        if (!$file) {
            return response()->json([
                'success' => false,
                'message' => 'Fichier manquant (champ "document" ou "file")',
            ], 422);
        }

        $request->validate([
            'document' => ['nullable', 'file', 'max:2048'], // 2MB (aligns with local PHP upload_max_filesize)
            'file' => ['nullable', 'file', 'max:2048'],
        ]);

        DB::beginTransaction();
        try {
            $path = $file->store('request-documents/' . $req->id, 'public');

            $doc = RequestDocument::create([
                'request_id' => $req->id,
                'uploaded_by' => auth()->id(),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                // Some PHP installations don't have `php_fileinfo`, so MIME detection can throw.
                // We fallback to a generic MIME type to avoid breaking uploads.
                'mime_type' => $this->safeMimeType($file),
                'file_size' => (int) $file->getSize(),
            ]);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'DOCUMENT_UPLOADED',
                'comment' => 'Document ajouté',
            ]);

            $doc->load('uploader:id,name');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Document uploadé avec succès',
                'data' => $doc,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload du document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add comment to request
     * POST /api/client/requests/{id}/comments
     */
    public function addComment(AddCommentRequest $request, $id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->findOrFail($id);

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
            $req->refresh()->load(['assignedAgent:id,name,email', 'client:id,name,email']);
            if ($req->assigned_to && $req->client) {
                app(RequestNotificationService::class)->notifyAgentClientCommented(
                    $req,
                    $req->client,
                    $validated['comment']
                );
            }

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
     * Delete draft request
     * DELETE /api/client/requests/{id}
     */
    public function destroy($id)
    {
        $req = Request::query()
            ->where('user_id', auth()->id())
            ->where('current_status', Request::STATUS_DRAFT)
            ->where('is_active', true)
            ->findOrFail($id);

        DB::beginTransaction();
        try {
            $req->update(['is_active' => false]);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => auth()->id(),
                'action' => 'DELETED',
                'comment' => 'Demande désactivée par le client (brouillon)',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Demande supprimée avec succès',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la demande',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

}
