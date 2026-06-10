<?php

namespace App\Http\Controllers\Admin\Concerns;

use App\Models\Service;
use Illuminate\Support\Facades\Auth;

trait AuthorizesAgencyService
{
    protected function userCanManageService(?Service $service): bool
    {
        if (!$service) {
            return false;
        }

        $user = Auth::user();
        if ($user->hasRole('admin')) {
            return true;
        }

        if (!$user->hasRole('responsable')) {
            return false;
        }

        $service->loadMissing('agency');

        if (!$service->agency) {
            return false;
        }

        if (
            $service->agency->responsable_user_id !== null
            && (int) $service->agency->responsable_user_id === (int) $user->id
        ) {
            return true;
        }

        return $user->agency_id
            && (int) $service->agency_id === (int) $user->agency_id;
    }

    protected function assertCanManageService(Service $service): void
    {
        if (!$this->userCanManageService($service)) {
            abort(403, 'Accès refusé pour ce service.');
        }
    }
}
