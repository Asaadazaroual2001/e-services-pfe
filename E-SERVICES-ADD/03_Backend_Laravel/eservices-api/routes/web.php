<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5174'));
});

// Rediriger les routes frontend vers le frontend React
Route::get('/login', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5174') . '/login');
});

Route::get('/register', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5174') . '/register');
});

Route::get('/forgot-password', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5174') . '/forgot-password');
});

Route::get('/admin', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5174') . '/admin');
});

// Test route pour débugger
Route::get('/test', function () {
    return response()->json([
        'message' => 'API is working',
        'session_id' => session()->getId(),
        'csrf_token' => csrf_token(),
    ]);
});

Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/logout', [AuthController::class, 'logout']);