<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\ScopesRequestsForResponsable;
use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\Request;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DashboardSummaryController extends Controller
{
    use ScopesRequestsForResponsable;

    /**
     * Statistiques tableau de bord : admin (global), responsable (ses agences), agent (son agence).
     * GET /api/admin/dashboard/summary
     */
    public function show()
    {
        $user = Auth::user();
        $isAdmin = $user->hasRole('admin');
        $isResponsable = $user->hasRole('responsable');
        $isAgent = $user->hasRole('agent');

        if (! $isAdmin && ! $isResponsable && ! $isAgent) {
            abort(403);
        }

        $statuses = [
            Request::STATUS_DRAFT,
            Request::STATUS_SUBMITTED,
            Request::STATUS_IN_REVIEW,
            Request::STATUS_NEEDS_INFO,
            Request::STATUS_APPROVED,
            Request::STATUS_REJECTED,
            Request::STATUS_CLOSED,
        ];

        $requestsByStatus = [];
        foreach ($statuses as $status) {
            $q = Request::query();
            $this->applyRequestListScope($q);
            $requestsByStatus[$status] = $q->where('current_status', $status)->count();
        }

        $requestsTotal = array_sum($requestsByStatus);

        $activeQ = Request::query();
        $this->applyRequestListScope($activeQ);
        $requestsActive = $activeQ->where('is_active', true)->count();

        $inactiveQ = Request::query();
        $this->applyRequestListScope($inactiveQ);
        $requestsInactive = $inactiveQ->where('is_active', false)->count();

        /** Soumises, actives, jamais ouvertes par un employé (aucune ligne d’historique VIEWED). */
        $unviewedQ = Request::query()
            ->where('is_active', true)
            ->where('current_status', Request::STATUS_SUBMITTED)
            ->whereDoesntHave('histories', function ($q) {
                $q->where('action', 'VIEWED');
            });
        $this->applyRequestListScope($unviewedQ);
        $requestsUnviewedByStaff = $unviewedQ->count();

        if ($isAdmin) {
            $servicesTotal = Service::query()->count();
        } elseif ($isResponsable) {
            $agencyIds = $this->responsableManagedAgencyIds();
            $servicesTotal = $agencyIds->isEmpty()
                ? 0
                : Service::query()->whereIn('agency_id', $agencyIds)->count();
        } elseif ($isAgent && $user->agency_id) {
            $servicesTotal = Service::query()->where('agency_id', (int) $user->agency_id)->count();
        } else {
            $servicesTotal = 0;
        }

        $recentQuery = Request::query()
            ->with([
                'service' => static function ($q) {
                    $q->select('id', 'name', 'agency_id')
                        ->with(['agency' => static function ($q2) {
                            $q2->select('id', 'name');
                        }]);
                },
            ]);
        $this->applyRequestListScope($recentQuery);
        $recentRequests = $recentQuery
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(static function (Request $req) {
                return [
                    'id' => $req->id,
                    'reference' => $req->reference,
                    'agency_name' => $req->service?->agency?->name,
                    'service_name' => $req->service?->name,
                    'current_status' => $req->current_status,
                    'created_at' => $req->created_at,
                ];
            })
            ->values()
            ->all();

        if ($isAdmin) {
            $scope = 'global';
            $agencyNames = null;
        } elseif ($isResponsable) {
            $scope = 'agency';
            $agencyIds = $this->responsableManagedAgencyIds();
            $agencyNames = $agencyIds->isEmpty()
                ? []
                : Agency::query()->whereIn('id', $agencyIds)->orderBy('name')->pluck('name')->values()->all();
        } else {
            $scope = 'agent_agency';
            if ($user->agency_id) {
                $n = Agency::query()->whereKey((int) $user->agency_id)->value('name');
                $agencyNames = $n ? [$n] : [];
            } else {
                $agencyNames = [];
            }
        }

        $adminAgencyName = null;
        if ($isAdmin && $user->agency_id) {
            $adminAgencyName = Agency::query()->whereKey((int) $user->agency_id)->value('name');
        }

        $payload = [
            'scope' => $scope,
            'services_total' => $servicesTotal,
            'requests_total' => $requestsTotal,
            'requests_by_status' => $requestsByStatus,
            'requests_active' => $requestsActive,
            'requests_inactive' => $requestsInactive,
            'requests_unviewed_by_staff' => $requestsUnviewedByStaff,
            'recent_requests' => $recentRequests,
            'agency_names' => $agencyNames,
            'admin_agency_name' => $adminAgencyName,
        ];

        if ($isAdmin) {
            $payload['agencies_total'] = Agency::query()->count();
            $payload['employees_total'] = User::query()
                ->whereHas(
                    'roles',
                    fn ($r) => $r->whereIn('name', ['agent', 'responsable', 'director', 'reception'])
                )
                ->count();
        } else {
            $payload['agencies_total'] = null;
            $payload['employees_total'] = null;
        }

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }
}
