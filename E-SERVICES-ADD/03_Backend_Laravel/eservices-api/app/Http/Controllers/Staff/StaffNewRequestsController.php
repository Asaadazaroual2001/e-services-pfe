<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Admin\Concerns\ScopesRequestsForResponsable;
use App\Http\Controllers\Controller;
use App\Models\Request;
use Illuminate\Http\Request as HttpRequest;

class StaffNewRequestsController extends Controller
{
    use ScopesRequestsForResponsable;

    /**
     * Demandes soumises, actives, pas encore ouvertes par un employé (pas d’historique VIEWED).
     * Même périmètre que GET /api/admin/requests.
     */
    public function index(HttpRequest $request)
    {
        $query = Request::query()
            ->where('is_active', true)
            ->where('current_status', Request::STATUS_SUBMITTED)
            ->whereDoesntHave('histories', function ($q) {
                $q->where('action', 'VIEWED');
            });

        $this->applyRequestListScope($query);

        $count = (clone $query)->count();

        $limit = (int) $request->input('limit', 10);
        $limit = max(1, min(20, $limit));

        $rows = (clone $query)
            ->with([
                'service:id,name',
                'client:id,name,email',
                'fieldValues' => static function ($q) {
                    $q->select('id', 'request_id', 'service_field_id', 'value_text', 'value_json')
                        ->with(['serviceField:id,label,key']);
                },
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $items = $rows->map(static function (Request $r) {
            return [
                'id' => $r->id,
                'reference' => $r->reference,
                'service_name' => $r->service?->name,
                'client_name' => $r->resolveDisplayClientName(),
                'submitted_at' => $r->submitted_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'count' => $count,
            'items' => $items,
        ]);
    }
}
