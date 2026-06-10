<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Request as DemandRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

class UserAdminController extends Controller
{
    /** Rôles considérés comme « personnel » (hors clients). */
    private const EMPLOYEE_ROLE_NAMES = ['admin', 'responsable', 'agent', 'reception', 'director'];

    // GET /api/admin/users?search=&role=client&employees_only=1&agency_id=&per_page=10
    public function index(Request $request)
    {
        $q = User::query()->with([
            'roles:id,name,code,label,level',
            'agency:id,name,city,code',
        ]);

        if ($request->boolean('employees_only')) {
            $q->whereHas('roles', fn ($r) => $r->whereIn('name', self::EMPLOYEE_ROLE_NAMES));
        }

        if ($request->filled('agency_id')) {
            $q->where('agency_id', (int) $request->input('agency_id'));
        }

        if ($s = $request->string('search')->toString()) {
            $q->where(function ($qq) use ($s) {
                $qq->where('name', 'ilike', "%{$s}%")
                    ->orWhere('email', 'ilike', "%{$s}%");
            });
        }

        if ($role = $request->string('role')->toString()) {
            $q->whereHas('roles', fn($r) => $r->where('name', $role));
        }

        $perPage = (int) ($request->input('per_page', 10));
        $users = $q->orderByDesc('id')->paginate(max(1, min(100, $perPage)));

        return response()->json($users);
    }

    /**
     * Annuaire clients : comptes avec rôle client + contacts issus de demandes publiques (sans inscription),
     * nom et e-mail dérivés comme sur le détail de demande (Request::resolveDisplayClientName / resolveRecipientHintEmail).
     *
     * GET /api/admin/clients-directory?search=&page=&per_page=&source=
     * source : vide = tous | account = inscrits uniquement | request_only = sans compte (demande publique)
     */
    public function clientDirectory(Request $request)
    {
        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $page = max(1, (int) $request->input('page', 1));
        $search = trim($request->string('search')->toString());
        $searchLower = $search !== '' ? mb_strtolower($search) : '';
        $sourceOnly = $request->string('source')->toString();

        $registeredEmailSet = array_flip(
            User::query()
                ->pluck('email')
                ->map(fn ($e) => mb_strtolower(trim((string) $e)))
                ->filter()
                ->all()
        );

        // Toutes les demandes « invité » (user_id null), y compris brouillons — pour un total réaliste par e-mail.
        $demands = DemandRequest::query()
            ->whereNull('user_id')
            ->with(['fieldValues.serviceField'])
            ->orderByDesc('id')
            ->limit(8000)
            ->get();

        $guestCounts = [];
        $guestRepresentative = [];

        foreach ($demands as $demand) {
            $email = $demand->resolveRecipientHintEmail();
            if ($email === null || trim($email) === '') {
                continue;
            }
            $norm = mb_strtolower(trim($email));
            if ($norm === '' || isset($registeredEmailSet[$norm])) {
                continue;
            }

            $guestCounts[$norm] = ($guestCounts[$norm] ?? 0) + 1;

            if (! isset($guestRepresentative[$norm])) {
                $guestRepresentative[$norm] = $demand;
            }
        }

        $guestByEmail = [];
        foreach ($guestRepresentative as $norm => $demand) {
            $email = $demand->resolveRecipientHintEmail();
            $name = $demand->resolveDisplayClientName();
            $cinHint = $demand->resolveRecipientHintCin();
            $cin = ($cinHint !== null && trim((string) $cinHint) !== '') ? trim((string) $cinHint) : null;

            $guestByEmail[$norm] = [
                'source' => 'request_only',
                'id' => null,
                'name' => ($name !== null && trim($name) !== '') ? trim($name) : '—',
                'email' => trim((string) $email),
                'cin' => $cin,
                'roles' => [],
                'agency' => null,
                'agency_id' => null,
                'created_at' => ($demand->submitted_at ?? $demand->created_at)?->toIso8601String(),
                'requests_count' => (int) ($guestCounts[$norm] ?? 0),
            ];
        }

        $users = User::query()
            ->with(['roles:id,name,code,label,level', 'agency:id,name,city,code'])
            ->whereHas('roles', fn ($r) => $r->where('name', 'client'))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")
                        ->orWhere('cin', 'ilike', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->get();

        // Toutes les lignes requests liées au compte (brouillons inclus) — clés en int pour éviter mismatch string/int.
        $requestCountsByUserId = [];
        if ($users->isNotEmpty()) {
            $aggregates = DemandRequest::query()
                ->whereIn('user_id', $users->pluck('id')->all())
                ->selectRaw('user_id, COUNT(*) as req_count')
                ->groupBy('user_id')
                ->get();

            foreach ($aggregates as $row) {
                $requestCountsByUserId[(int) $row->user_id] = (int) $row->req_count;
            }
        }

        $accountRows = $users->map(function (User $user) use ($requestCountsByUserId) {
            $cin = $user->cin;
            $cin = ($cin !== null && trim((string) $cin) !== '') ? trim((string) $cin) : null;

            return [
                'source' => 'account',
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'cin' => $cin,
                'roles' => $user->roles,
                'agency' => $user->agency,
                'agency_id' => $user->agency_id,
                'created_at' => $user->created_at?->toIso8601String(),
                'requests_count' => (int) ($requestCountsByUserId[(int) $user->id] ?? 0),
            ];
        });

        $guestRows = collect($guestByEmail)->values()->filter(function (array $row) use ($searchLower) {
            if ($searchLower === '') {
                return true;
            }

            $cinMatch = isset($row['cin']) && $row['cin'] !== null
                && str_contains(mb_strtolower((string) $row['cin']), $searchLower);

            return str_contains(mb_strtolower($row['name']), $searchLower)
                || str_contains(mb_strtolower($row['email']), $searchLower)
                || $cinMatch;
        });

        $merged = $accountRows
            ->concat($guestRows)
            ->sortBy(fn (array $row) => mb_strtolower($row['name'] . '|' . $row['email']))
            ->values();

        if ($sourceOnly === 'account') {
            $merged = $merged->filter(fn (array $row) => ($row['source'] ?? '') === 'account')->values();
        } elseif ($sourceOnly === 'request_only') {
            $merged = $merged->filter(fn (array $row) => ($row['source'] ?? '') === 'request_only')->values();
        }

        $total = $merged->count();
        $slice = $merged->forPage($page, $perPage)->values()->all();

        $paginator = new LengthAwarePaginator(
            $slice,
            $total,
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        return response()->json($paginator);
    }

    // POST /api/admin/users
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role_ids' => ['nullable', 'array'],
            'role_ids.*' => ['integer', Rule::exists('roles', 'id')],
            'agency_id' => ['nullable', 'integer', 'exists:agencies,id'],
            'cin' => ['nullable', 'string', 'max:32'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'cin' => isset($data['cin']) ? trim((string) $data['cin']) : null,
            'password' => Hash::make($data['password']),
            'agency_id' => $data['agency_id'] ?? null,
        ]);

        // assign roles
        if (!empty($data['role_ids'])) {
            $user->roles()->sync($data['role_ids']);
            // Synchroniser le rôle principal
            $user->syncPrimaryRole();
        }

        return response()->json([
            'message' => 'User created',
            'user' => $user->load(['roles:id,name,code,label,level', 'agency:id,name,city,code']),
        ], 201);
    }

    // GET /api/admin/users/{user}
    public function show(User $user)
    {
        return response()->json($user->load(['roles:id,name,code,label,level', 'agency:id,name,city,code,address,phone,email']));
    }

    // PUT /api/admin/users/{user}
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role_ids' => ['nullable', 'array'],
            'role_ids.*' => ['integer', Rule::exists('roles', 'id')],
            'agency_id' => ['nullable', 'integer', 'exists:agencies,id'],
            'cin' => ['nullable', 'string', 'max:32'],
        ]);

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }
        if (array_key_exists('cin', $data)) {
            $user->cin = $data['cin'] !== null && $data['cin'] !== '' ? trim((string) $data['cin']) : null;
        }
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        if (array_key_exists('agency_id', $data)) {
            $user->agency_id = $data['agency_id'];
        }

        $user->save();

        // update roles
        if (array_key_exists('role_ids', $data)) {
            $user->roles()->sync($data['role_ids'] ?? []);
            // Synchroniser le rôle principal
            $user->syncPrimaryRole();
        }

        return response()->json([
            'message' => 'User updated',
            'user' => $user->load(['roles:id,name,code,label,level', 'agency:id,name,city,code']),
        ]);
    }

    // DELETE /api/admin/users/{user}
    public function destroy(User $user)
    {
        // optional: ماتخليش admin يحيد راسو
        // if ($user->id === auth()->id()) return response()->json(['message'=>'Cannot delete yourself'], 422);

        $user->roles()->detach();
        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }
}
