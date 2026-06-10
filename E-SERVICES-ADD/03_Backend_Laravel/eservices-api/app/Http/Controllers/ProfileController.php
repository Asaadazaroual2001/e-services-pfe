<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Met à jour le compte de l'utilisateur connecté (nom, e-mail, CIN, mot de passe optionnel).
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'cin' => ['nullable', 'string', 'max:32'],
            'current_password' => ['nullable', 'required_with:password', 'string'],
            'password' => ['nullable', 'confirmed', Password::min(8)],
        ]);

        if (! empty($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->getAuthPassword())) {
                throw ValidationException::withMessages([
                    'current_password' => ['Le mot de passe actuel est incorrect.'],
                ]);
            }
            $user->password = $validated['password'];
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $cin = $validated['cin'] ?? null;
        $user->cin = is_string($cin) && trim($cin) !== '' ? trim($cin) : null;
        $user->save();
        $user->load('roles');

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'cin' => $user->cin,
                'agency_id' => $user->agency_id,
                'roles' => $user->roles->pluck('name')->values(),
                'role_codes' => $user->roles->pluck('code')->values(),
            ],
        ]);
    }
}
