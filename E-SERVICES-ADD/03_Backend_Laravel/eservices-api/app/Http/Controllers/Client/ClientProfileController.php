<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;

/**
 * @deprecated Utiliser PUT /api/me (même logique). Conservé pour compatibilité avec /api/client/profile.
 */
class ClientProfileController extends Controller
{
    public function update(Request $request)
    {
        return app(ProfileController::class)->update($request);
    }
}
