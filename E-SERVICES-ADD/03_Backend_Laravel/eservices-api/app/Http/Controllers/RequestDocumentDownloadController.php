<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\Concerns\ScopesRequestsForResponsable;
use App\Models\Request as DemandRequest;
use App\Models\RequestDocument;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RequestDocumentDownloadController extends Controller
{
    use ScopesRequestsForResponsable;

    public function client(int $requestId, int $documentId)
    {
        $req = DemandRequest::query()
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->findOrFail($requestId);

        return $this->streamDocument($req, $documentId);
    }

    public function employee(int $requestId, int $documentId)
    {
        $user = auth()->user();
        $query = DemandRequest::query()->where('is_active', true);

        if ($user?->hasRole('agent')) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('assigned_to')
                    ->orWhere('assigned_to', $user->id);
            });
        }

        $req = $query->whereKey($requestId)->firstOrFail();

        return $this->streamDocument($req, $documentId);
    }

    public function admin(int $requestId, int $documentId)
    {
        $req = DemandRequest::findOrFail($requestId);
        $this->assertCanAccessAdminRequest($req);

        return $this->streamDocument($req, $documentId);
    }

    public function guest(HttpRequest $http, int $requestId, int $documentId)
    {
        $token = (string) $http->header('X-Public-Token', '');
        $req = DemandRequest::query()
            ->whereKey($requestId)
            ->where('public_submission_token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        return $this->streamDocument($req, $documentId);
    }

    private function streamDocument(DemandRequest $req, int $documentId): StreamedResponse
    {
        $doc = RequestDocument::query()
            ->where('request_id', $req->id)
            ->whereKey($documentId)
            ->firstOrFail();

        $disk = Storage::disk('public');
        if (!$disk->exists($doc->file_path)) {
            abort(404, 'Fichier introuvable.');
        }

        return $disk->download($doc->file_path, $doc->file_name);
    }
}
