<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\UserAdminController;
use App\Http\Controllers\Admin\AgencyController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\ServiceFieldController;
use App\Http\Controllers\Admin\RequestController;
use App\Http\Controllers\Admin\DashboardSummaryController;
use App\Http\Controllers\Client\ClientRequestController;
use App\Http\Controllers\Client\ServiceController as ClientServiceController;
use App\Http\Controllers\Employee\EmployeeRequestController;
use App\Http\Controllers\Public\EmailJsPublicConfigController;
use App\Http\Controllers\Public\GuestRequestController;
use App\Http\Controllers\RequestDocumentDownloadController;
use App\Http\Controllers\Staff\StaffClientEmailController;
use App\Http\Controllers\Staff\StaffNewRequestsController;
use App\Http\Controllers\Client\ClientProfileController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\PasswordResetController;

/*
|--------------------------------------------------------------------------
| AUTHENTICATED ROUTES (أي واحد داير login)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    /*
    |-------------------------
    | ME (user connecté)
    |-------------------------
    */
    Route::get('/me', function (Request $request) {
        $user = $request->user()->load('roles');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'cin' => $user->cin,
            'agency_id' => $user->agency_id,
            'roles' => $user->roles->pluck('name')->values(),   // ["admin","client"]
            'role_codes' => $user->roles->pluck('code')->values(),   // ["ADM","CLT"]
        ]);
    });

    Route::put('/me', [ProfileController::class, 'update']);

    /*
    |-------------------------
    | SIMPLE ROLE TESTS
    |-------------------------
    */
    Route::get('/client-only', fn() => ['message' => 'client ok'])
        ->middleware('role:client');

    Route::get('/admin-only', fn() => ['message' => 'admin ok'])
        ->middleware('role:admin');

    /*
    |-------------------------
    | ADVANCED ROLE TESTS
    |-------------------------
    */
    Route::get('/test/client', fn() => ['ok' => 'client'])
        ->middleware('role:client');

    Route::get('/test/reception', fn() => ['ok' => 'reception'])
        ->middleware('role:reception');

    Route::get('/test/agent', fn() => ['ok' => 'agent'])
        ->middleware('role:agent');

    Route::get('/test/responsable', fn() => ['ok' => 'responsable'])
        ->middleware('role:responsable');

    Route::get('/test/director', fn() => ['ok' => 'director'])
        ->middleware('role:director');

    Route::get('/test/admin', fn() => ['ok' => 'admin'])
        ->middleware('role:admin');

    /*
    |-------------------------
    | PERMISSION TESTS
    |-------------------------
    */
    Route::get('/test/perm/manage-services', fn() => ['ok' => 'manage_services'])
        ->middleware('perm:manage_services');

    Route::get('/test/perm/view-all-requests', fn() => ['ok' => 'view_all_requests'])
        ->middleware('perm:view_all_requests');
});

/*
|--------------------------------------------------------------------------
| LOCAL DEBUG ENDPOINT
|--------------------------------------------------------------------------
| Use only in local env to inspect headers/cookies for CSRF debugging.
*/
if (app()->environment('local')) {
    Route::get('/debug/request', function (Request $request) {
        return response()->json([
            'method' => $request->method(),
            'path' => $request->path(),
            'headers' => collect($request->headers->all())
                ->except(['authorization'])
                ->map(fn($value) => is_array($value) && count($value) === 1 ? $value[0] : $value)
                ->all(),
            'cookies' => $request->cookies->all(),
            'session' => [
                'has_session' => $request->hasSession(),
                'session_id' => $request->hasSession() ? $request->session()->getId() : null,
            ],
        ]);
    });
}

/*
|--------------------------------------------------------------------------
| PUBLIC PORTAL ROUTES
|--------------------------------------------------------------------------
*/
Route::get('/services', [ClientServiceController::class, 'index']);
Route::get('/services/{id}', [ClientServiceController::class, 'show']);

/*
|--------------------------------------------------------------------------
| EmailJS — identifiants publics pour la page Contact (React + emailjs-com)
|--------------------------------------------------------------------------
*/
Route::get('/public/emailjs-config', EmailJsPublicConfigController::class)
    ->middleware('throttle:60,1');

/*
|--------------------------------------------------------------------------
| Mot de passe oublié (code par e-mail, sans auth)
|--------------------------------------------------------------------------
*/
Route::post('/password/forgot', [PasswordResetController::class, 'sendCode'])
    ->middleware('throttle:5,1');
Route::post('/password/reset', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| PUBLIC GUEST DEMANDES (no login — token returned on create)
|--------------------------------------------------------------------------
*/
Route::prefix('public')
    ->middleware('throttle:60,1')
    ->group(function () {
        Route::post('/requests', [GuestRequestController::class, 'store']);
        Route::put('/requests/{id}', [GuestRequestController::class, 'update']);
        Route::post('/requests/{id}/submit', [GuestRequestController::class, 'submit']);
        Route::post('/requests/{id}/documents', [GuestRequestController::class, 'uploadDocument']);
        Route::get('/requests/{requestId}/documents/{documentId}/download', [RequestDocumentDownloadController::class, 'guest']);
        Route::post('/requests/{id}/comments', [GuestRequestController::class, 'addComment']);
    });

/*
|--------------------------------------------------------------------------
| ADMIN: create service + fields (alias path)
|--------------------------------------------------------------------------
| POST /api/services — same handler as POST /api/admin/services
*/
Route::middleware(['auth:sanctum', 'role:admin,responsable'])
    ->post('/services', [ServiceController::class, 'store']);

/*
|--------------------------------------------------------------------------
| CLIENT PORTAL ROUTES (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])
    ->prefix('client')
    ->group(function () {
        Route::get('/requests', [ClientRequestController::class, 'index']);
        Route::post('/requests', [ClientRequestController::class, 'store']);
        Route::get('/requests/{id}', [ClientRequestController::class, 'show']);
        Route::put('/requests/{id}', [ClientRequestController::class, 'update']);
        Route::delete('/requests/{id}', [ClientRequestController::class, 'destroy']);
        Route::post('/requests/{id}/submit', [ClientRequestController::class, 'submit']);
        Route::post('/requests/{id}/documents', [ClientRequestController::class, 'uploadDocument']);
        Route::get('/requests/{requestId}/documents/{documentId}/download', [RequestDocumentDownloadController::class, 'client']);
        Route::post('/requests/{id}/comments', [ClientRequestController::class, 'addComment']);
        Route::put('/profile', [ClientProfileController::class, 'update'])->middleware('role:client');
    });

Route::middleware(['auth:sanctum', 'role:admin,agent,responsable'])
    ->prefix('staff')
    ->group(function () {
        Route::get('/client-emails', [StaffClientEmailController::class, 'index']);
        Route::post('/client-emails', [StaffClientEmailController::class, 'store']);
        Route::get('/new-requests', [StaffNewRequestsController::class, 'index']);
    });

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/requests', [\App\Http\Controllers\Client\RequestController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| EMPLOYEE PORTAL ROUTES (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])
    ->prefix('employee')
    ->group(function () {
        Route::get('/dashboard', [EmployeeRequestController::class, 'dashboard']);
        Route::get('/agents', [EmployeeRequestController::class, 'agents']);
        Route::get('/requests', [EmployeeRequestController::class, 'index']);
        Route::get('/requests/{id}', [EmployeeRequestController::class, 'show']);
        Route::post('/requests/{id}/take', [EmployeeRequestController::class, 'take']);
        Route::post('/requests/{id}/start-review', [EmployeeRequestController::class, 'startReview']);
        Route::post('/requests/{id}/request-info', [EmployeeRequestController::class, 'requestInfo']);
        Route::post('/requests/{id}/approve', [EmployeeRequestController::class, 'approve']);
        Route::post('/requests/{id}/reject', [EmployeeRequestController::class, 'reject']);
        Route::post('/requests/{id}/comment', [EmployeeRequestController::class, 'addComment']);
        Route::get('/requests/{requestId}/documents/{documentId}/download', [RequestDocumentDownloadController::class, 'employee']);
    });

/*
|--------------------------------------------------------------------------
| ADMIN PANEL API (split by rôle métier)
|--------------------------------------------------------------------------
| admin : tout | responsable : services | agent : demandes
*/
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/users', [UserAdminController::class, 'index']);
        Route::get('/clients-directory', [UserAdminController::class, 'clientDirectory']);
        Route::post('/users', [UserAdminController::class, 'store']);
        Route::get('/users/{user}', [UserAdminController::class, 'show']);
        Route::put('/users/{user}', [UserAdminController::class, 'update']);
        Route::delete('/users/{user}', [UserAdminController::class, 'destroy']);

        Route::get(
            '/roles',
            fn() =>
            \App\Models\Role::orderBy('level')->get()
        );

        Route::post('/agencies', [AgencyController::class, 'store']);
        Route::get('/agencies/{agency}', [AgencyController::class, 'show']);
        Route::put('/agencies/{agency}', [AgencyController::class, 'update']);
        Route::delete('/agencies/{agency}', [AgencyController::class, 'destroy']);
    });

Route::middleware(['auth:sanctum', 'role:admin,responsable'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/agencies', [AgencyController::class, 'index']);
        Route::post('/services', [ServiceController::class, 'store']);
        Route::get('/services', [ServiceController::class, 'index']);
        Route::get('/services/{service}', [ServiceController::class, 'show']);
        Route::put('/services/{service}', [ServiceController::class, 'update']);
        Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
        Route::patch('/services/{service}/toggle-active', [ServiceController::class, 'toggleActive']);

        Route::get('/services/{service}/fields', [ServiceFieldController::class, 'index']);
        Route::post('/service-fields', [ServiceFieldController::class, 'store']);
        Route::put('/service-fields/{field}', [ServiceFieldController::class, 'update']);
        Route::delete('/service-fields/{field}', [ServiceFieldController::class, 'destroy']);
        Route::post('/services/{service}/fields/reorder', [ServiceFieldController::class, 'reorder']);
    });

Route::middleware(['auth:sanctum', 'role:admin,agent,responsable'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/dashboard/summary', [DashboardSummaryController::class, 'show']);
        Route::get('/requests', [RequestController::class, 'index']);
        Route::post('/requests', [RequestController::class, 'store']);
        Route::get('/requests/{id}', [RequestController::class, 'show']);
        Route::put('/requests/{id}', [RequestController::class, 'update']);
        Route::delete('/requests/{id}', [RequestController::class, 'destroy']);
        Route::post('/requests/{id}/assign', [RequestController::class, 'assign']);
        Route::post('/requests/{id}/mark-viewed', [RequestController::class, 'markViewed']);
        Route::post('/requests/{id}/approve', [RequestController::class, 'approve']);
        Route::post('/requests/{id}/reject', [RequestController::class, 'reject']);
        Route::post('/requests/{id}/comment', [RequestController::class, 'addComment']);
        Route::post('/requests/{id}/toggle-active', [RequestController::class, 'toggleActive']);
        Route::get('/requests/{requestId}/documents/{documentId}/download', [RequestDocumentDownloadController::class, 'admin']);
    });
