<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Concerns\EnsuresServiceAcceptsClientRequests;
use App\Http\Controllers\Concerns\PersistsClientRequestFields;
use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestComment;
use App\Models\RequestDocument;
use App\Models\RequestHistory;
use App\Models\Service;
use App\Models\ServiceField;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Anonymous demande (no login). Secured by public_submission_token returned on create.
 */
class GuestRequestController extends Controller
{
    use EnsuresServiceAcceptsClientRequests;
    use PersistsClientRequestFields;

    private function tokenFrom(HttpRequest $request): ?string
    {
        $t = $request->query('token')
            ?? $request->header('X-Public-Token')
            ?? $request->input('public_token');

        return is_string($t) && $t !== '' ? $t : null;
    }

    private function resolveGuestRequest(int $id, ?string $token): Request
    {
        if (!$token) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'Jeton public manquant (token / X-Public-Token / public_token)',
            ], 401));
        }

        $req = Request::query()
            ->where('id', $id)
            ->whereNull('user_id')
            ->where('public_submission_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$req) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'Demande introuvable ou jeton invalide',
            ], 404));
        }

        return $req;
    }

    /**
     * POST /api/public/requests
     */
    public function store(HttpRequest $request)
    {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ]);

        $service = Service::where('is_active', true)->whereKey((int) $data['service_id'])->firstOrFail();
        $this->ensureServiceAcceptsClientRequests($service);

        $serviceId = (int) $service->id;
        $fieldValues = $data['field_values'] ?? [];
        $token = Str::random(64);

        DB::beginTransaction();
        try {
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
                'user_id' => null,
                'public_submission_token' => $token,
                'assigned_to' => null,
                'current_status' => Request::STATUS_DRAFT,
                'is_active' => true,
                'submitted_at' => null,
            ]);

            $this->persistFieldValues($req, $serviceId, $fieldValues);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => null,
                'action' => 'CREATED',
                'from_status' => null,
                'to_status' => Request::STATUS_DRAFT,
                'comment' => 'Demande créée (lien public, sans compte)',
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
                'public_submission_token' => $token,
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
     * PUT /api/public/requests/{id}
     */
    public function update(HttpRequest $request, int $id)
    {
        $req = $this->resolveGuestRequest($id, $this->tokenFrom($request));

        if ($req->current_status !== Request::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les brouillons peuvent être modifiés',
            ], 422);
        }

        $data = $request->validate([
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ]);

        $serviceId = (int) $req->service_id;
        $fieldValues = array_key_exists('field_values', $data) ? ($data['field_values'] ?? []) : null;

        DB::beginTransaction();
        try {
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
                'actor_id' => null,
                'action' => 'UPDATED',
                'comment' => 'Demande mise à jour (lien public)',
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
     * POST /api/public/requests/{id}/submit
     */
    public function submit(HttpRequest $request, int $id)
    {
        $req = $this->resolveGuestRequest($id, $this->tokenFrom($request));

        if ($req->current_status !== Request::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Cette demande ne peut pas être soumise',
            ], 422);
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
                'actor_id' => null,
                'action' => 'SUBMITTED',
                'from_status' => $oldStatus,
                'to_status' => Request::STATUS_SUBMITTED,
                'comment' => 'Demande soumise (lien public)',
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
     * POST /api/public/requests/{id}/documents
     */
    public function uploadDocument(HttpRequest $request, int $id)
    {
        $req = $this->resolveGuestRequest($id, $this->tokenFrom($request));

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
            'document' => ['nullable', 'file', 'max:2048'],
            'file' => ['nullable', 'file', 'max:2048'],
        ]);

        DB::beginTransaction();
        try {
            $path = $file->store('request-documents/' . $req->id, 'public');

            $doc = RequestDocument::create([
                'request_id' => $req->id,
                'uploaded_by' => null,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $this->safeMimeType($file),
                'file_size' => (int) $file->getSize(),
            ]);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => null,
                'action' => 'DOCUMENT_UPLOADED',
                'comment' => 'Document ajouté (lien public)',
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
     * POST /api/public/requests/{id}/comments
     */
    public function addComment(HttpRequest $request, int $id)
    {
        $req = $this->resolveGuestRequest($id, $this->tokenFrom($request));

        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:5000'],
        ]);

        DB::beginTransaction();
        try {
            $comment = RequestComment::create([
                'request_id' => $req->id,
                'user_id' => null,
                'comment' => $validated['comment'],
            ]);

            RequestHistory::create([
                'request_id' => $req->id,
                'actor_id' => null,
                'action' => 'COMMENTED',
                'comment' => 'Commentaire ajouté (lien public)',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Commentaire ajouté avec succès',
                'data' => $comment->load('user:id,name'),
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
}
