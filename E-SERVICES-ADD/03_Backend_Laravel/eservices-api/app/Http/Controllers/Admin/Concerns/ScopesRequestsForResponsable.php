<?php

namespace App\Http\Controllers\Admin\Concerns;

use App\Models\Agency;
use App\Models\Service as ServiceModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

trait ScopesRequestsForResponsable
{
    /**
     * IDs des services rattachés aux agences dont l’utilisateur connecté est le responsable désigné.
     */
    protected function responsableManagedAgencyIds(): Collection
    {
        $user = Auth::user();
        $agencyIds = Agency::query()
            ->where('responsable_user_id', $user->id)
            ->pluck('id');

        if ($user->hasRole('responsable') && $user->agency_id) {
            $agencyIds = $agencyIds->push((int) $user->agency_id)->unique()->values();
        }

        return $agencyIds;
    }

    protected function responsableManagedServiceIds(): Collection
    {
        $agencyIds = $this->responsableManagedAgencyIds();
        if ($agencyIds->isEmpty()) {
            return collect();
        }

        return ServiceModel::query()
            ->whereIn('agency_id', $agencyIds)
            ->pluck('id');
    }

    /**
     * Filtre la requête liste : admin & agent = tout ; responsable (sans admin) = ses services seulement.
     */
    protected function applyRequestListScope(Builder $query): void
    {
        $user = Auth::user();
        if ($user->hasRole('admin')) {
            return;
        }
        if ($user->hasRole('responsable')) {
            $ids = $this->responsableManagedServiceIds();
            if ($ids->isEmpty()) {
                $query->whereRaw('0 = 1');
            } else {
                $query->whereIn('service_id', $ids);
            }

            return;
        }
        if ($user->hasRole('agent') && $user->agency_id) {
            $query->whereHas('service', fn ($q) => $q->where('agency_id', (int) $user->agency_id));
        }
    }

    protected function assertCanAccessAdminRequest(\App\Models\Request $req): void
    {
        $user = Auth::user();
        if ($user->hasRole('admin') || $user->hasRole('agent')) {
            return;
        }
        if ($user->hasRole('responsable')) {
            $ids = $this->responsableManagedServiceIds();
            if ($ids->contains($req->service_id)) {
                return;
            }
        }
        abort(403, 'Accès non autorisé à cette demande.');
    }

    protected function assertResponsableCanUseServiceId(int $serviceId): void
    {
        $user = Auth::user();
        if ($user->hasRole('admin') || $user->hasRole('agent')) {
            return;
        }
        if ($user->hasRole('responsable')) {
            $ids = $this->responsableManagedServiceIds();
            if ($ids->contains($serviceId)) {
                return;
            }
        }
        abort(403, 'Service non autorisé pour cette action.');
    }
}
