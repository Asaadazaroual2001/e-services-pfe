<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'client', 'code' => 'CLT', 'label' => 'Client', 'level' => 1],
            ['name' => 'reception', 'code' => 'REC', 'label' => 'Réception', 'level' => 10],
            ['name' => 'agent', 'code' => 'AGT', 'label' => 'Agent d\'agence', 'level' => 20],
            ['name' => 'responsable', 'code' => 'RSP', 'label' => 'Responsable d\'agence', 'level' => 30],
            ['name' => 'director', 'code' => 'DIR', 'label' => 'Directeur', 'level' => 40],
            ['name' => 'admin', 'code' => 'ADM', 'label' => 'Administrateur', 'level' => 99],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(
                ['name' => $r['name']],
                ['code' => $r['code'], 'label' => $r['label'], 'level' => $r['level']]
            );
        }

        $permissions = [
            'manage_services',
            'view_all_requests',
            'assign_requests',
            'change_status',
            'request_needs_info',
            'close_request',
            'manage_users_roles',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }

        /**
         * Règles métier :
         * - admin : tout
         * - responsable : uniquement gestion des services (back-office /admin/services)
         * - agent : uniquement gestion des demandes (back-office /admin/requests)
         */
        $map = [
            'client' => [],
            'reception' => ['view_all_requests'],
            'agent' => [
                'view_all_requests',
                'assign_requests',
                'change_status',
                'request_needs_info',
                'close_request',
            ],
            'responsable' => ['manage_services'],
            'director' => ['view_all_requests', 'assign_requests', 'change_status', 'close_request'],
            'admin' => $permissions,
        ];

        foreach ($map as $roleName => $perms) {
            $role = Role::where('name', $roleName)->first();
            if (!$role) {
                continue;
            }
            $permIds = Permission::whereIn('name', $perms)->pluck('id');
            $role->permissions()->sync($permIds);
        }
    }
}
