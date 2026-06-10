<?php

use Illuminate\Database\Seeder;
use App\Models\User;

class UpdateExistingUsersRoleSeeder extends Seeder
{
    /**
     * Synchroniser le rôle principal pour tous les utilisateurs existants
     */
    public function run(): void
    {
        $users = User::with('roles')->get();
        
        foreach ($users as $user) {
            if ($user->roles->count() > 0) {
                $user->syncPrimaryRole();
                $this->command->info("✅ Rôle synchronisé pour {$user->email}: {$user->role}");
            } else {
                // Assigner un rôle par défaut si aucun rôle n'est assigné
                $user->update(['role' => 'client']);
                $this->command->info("📝 Rôle par défaut assigné pour {$user->email}: client");
            }
        }
        
        $this->command->info("🎉 Synchronisation terminée pour {$users->count()} utilisateurs");
    }
}