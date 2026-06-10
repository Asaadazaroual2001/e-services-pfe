<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        // ❌ إلى ما عندوش الدور المطلوب
        if (!$user || !$user->hasAnyRole($roles)) {
            return response()->json([
                'message' => 'Forbidden (role)',
                'required_roles' => $roles,
                'your_roles' => $user?->roles()->pluck('name'),
            ], 403);
        }

        // ✅ إلى عندو الدور → كمّل للـ controller / route
        return $next($request);
    }
}
