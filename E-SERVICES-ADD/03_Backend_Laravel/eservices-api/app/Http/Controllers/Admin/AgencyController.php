<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AgencyController extends Controller
{
    public function index(Request $request)
    {
        $q = Agency::query()
            ->withCount('users')
            ->with(['responsable:id,name,email']);

        $user = $request->user();
        if (!$user->hasRole('admin')) {
            $q->where(function ($qq) use ($user) {
                $qq->where('responsable_user_id', $user->id);
                if ($user->agency_id) {
                    $qq->orWhere('id', $user->agency_id);
                }
            });
        }

        if ($request->boolean('active_only')) {
            $q->where('is_active', true);
        }

        if ($request->boolean('only_with_responsable')) {
            $q->whereNotNull('responsable_user_id');
        }

        if ($s = $request->string('search')->toString()) {
            $q->where(function ($qq) use ($s) {
                $qq->where('name', 'ilike', "%{$s}%")
                    ->orWhere('code', 'ilike', "%{$s}%")
                    ->orWhere('city', 'ilike', "%{$s}%");
            });
        }

        $status = $request->string('status')->toString();
        if ($status === 'active') {
            $q->where('is_active', true);
        } elseif ($status === 'inactive') {
            $q->where('is_active', false);
        }

        if ($city = trim($request->string('city')->toString())) {
            $q->where('city', 'ilike', $city);
        }

        return response()->json($q->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'code' => ['nullable', 'string', 'max:32', 'unique:agencies,code'],
            'address' => ['nullable', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            'responsable_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $rid = $data['responsable_user_id'] ?? null;
        unset($data['responsable_user_id']);

        return DB::transaction(function () use ($data, $rid) {
            $agency = Agency::create($data);
            if ($rid !== null) {
                $this->assignResponsableToAgency($agency, (int) $rid);
            }

            return response()->json([
                'success' => true,
                'message' => 'Agence créée',
                'data' => $agency->fresh()->load(['responsable:id,name,email'])->loadCount('users'),
            ], 201);
        });
    }

    public function show(Agency $agency)
    {
        return response()->json([
            'success' => true,
            'data' => $agency->load(['responsable:id,name,email'])->loadCount('users'),
        ]);
    }

    public function update(Request $request, Agency $agency)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:190'],
            'code' => ['nullable', 'string', 'max:32', 'unique:agencies,code,' . $agency->id],
            'address' => ['nullable', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            'responsable_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $touchResponsable = $request->has('responsable_user_id');
        $newRid = $touchResponsable ? $request->input('responsable_user_id') : null;

        unset($data['responsable_user_id']);

        return DB::transaction(function () use ($agency, $data, $touchResponsable, $newRid) {
            if ($data !== []) {
                $agency->update($data);
            }

            if ($touchResponsable) {
                if ($newRid === null || $newRid === '') {
                    $agency->update(['responsable_user_id' => null]);
                } else {
                    $this->assignResponsableToAgency($agency->fresh(), (int) $newRid);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Agence mise à jour',
                'data' => $agency->fresh()->load(['responsable:id,name,email'])->loadCount('users'),
            ]);
        });
    }

    public function destroy(Agency $agency)
    {
        if ($agency->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer une agence qui a encore des employés assignés.',
            ], 422);
        }

        if ($agency->services()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer une agence qui a encore des services.',
            ], 422);
        }

        $agency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agence supprimée',
        ]);
    }

    /**
     * @throws ValidationException
     */
    private function assignResponsableToAgency(Agency $agency, int $userId): void
    {
        $user = User::whereKey($userId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'responsable'))
            ->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'responsable_user_id' => ['L’utilisateur doit avoir le rôle « responsable ».'],
            ]);
        }

        if ($user->agency_id !== null && (int) $user->agency_id !== (int) $agency->id) {
            throw ValidationException::withMessages([
                'responsable_user_id' => ['Ce responsable est déjà rattaché à une autre agence.'],
            ]);
        }

        $user->agency_id = $agency->id;
        $user->save();

        $agency->responsable_user_id = $user->id;
        $agency->save();
    }
}
