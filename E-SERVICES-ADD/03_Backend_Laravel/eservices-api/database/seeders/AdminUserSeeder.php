<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Créer un utilisateur admin de test
        $admin = User::firstOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'Admin Principal',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ]
        );

        // Récupérer le rôle admin
        $adminRole = Role::where('name', 'admin')->first();

        if ($adminRole) {
            // Assigner le rôle admin à l'utilisateur
            $admin->roles()->syncWithoutDetaching([$adminRole->id]);
            // Synchroniser le rôle principal
            $admin->syncPrimaryRole();
            $this->command->info("✅ Utilisateur admin créé: {$admin->email} / admin123");
        } else {
            $this->command->error("❌ Rôle 'admin' non trouvé. Exécutez d'abord les seeders des rôles.");
        }

        // Créer d'autres utilisateurs de test
        $client = User::firstOrCreate(
            ['email' => 'client@test.com'],
            [
                'name' => 'Client Test',
                'password' => Hash::make('client123'),
                'role' => 'client',
            ]
        );
        
        $clientRole = Role::where('name', 'client')->first();
        if ($clientRole) {
            $client->roles()->syncWithoutDetaching([$clientRole->id]);
            // Synchroniser le rôle principal
            $client->syncPrimaryRole();
            $this->command->info("✅ Utilisateur client créé: {$client->email} / client123");
        }
    }
}