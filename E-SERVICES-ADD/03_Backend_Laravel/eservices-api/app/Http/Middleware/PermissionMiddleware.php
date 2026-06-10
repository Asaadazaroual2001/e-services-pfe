<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, $permission)
    {
        $user = $request->user();

        if (!$user || !$user->hasPermission($permission)) {
            return response()->json([
                'message' => 'Forbidden (permission)',
                'required_permission' => $permission,
                'your_roles' => $user?->roles()->pluck('name'),
            ], 403);
        }

        return $next($request);
    }
}