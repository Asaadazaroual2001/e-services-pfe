<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // Debug information
        \Log::info('Login attempt', [
            'email' => $request->get('email'),
            'session_id' => session()->getId(),
            'csrf_token' => csrf_token(),
            'headers' => $request->headers->all(),
        ]);

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $remember = $request->boolean('remember');

        if (!Auth::attempt($credentials, $remember)) {
            \Log::warning('Login failed - invalid credentials', ['email' => $request->get('email')]);
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        $request->session()->regenerate();
        
        \Log::info('Login successful', [
            'user_id' => Auth::id(),
            'session_id' => session()->getId(),
        ]);

        return response()->json(['message' => 'Logged in']);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logged out']);
    }
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'cin' => 'required|string|max:32',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'cin' => trim($data['cin']),
            'password' => bcrypt($data['password']),
        ]);

        $clientRole = Role::query()->where('name', 'client')->first();
        if ($clientRole) {
            $user->roles()->syncWithoutDetaching([$clientRole->id]);
        }

        // auto-login after register
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Registered & logged in',
            'user' => $user->load('roles:id,name,code,label,level'),
        ]);
    }
}
