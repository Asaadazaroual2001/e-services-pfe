<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateTestUser extends Command
{
    protected $signature = 'make:test-user {--admin : Create admin user}';
    protected $description = 'Create a test user for development';

    public function handle()
    {
        $isAdmin = $this->option('admin');
        
        $email = $isAdmin ? 'admin@example.com' : 'user@example.com';
        $name = $isAdmin ? 'Admin Test' : 'User Test';
        
        // Vérifier si l'utilisateur existe déjà
        if (User::where('email', $email)->exists()) {
            $this->info("User {$email} already exists!");
            return;
        }
        
        // Créer l'utilisateur
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('123456'),
        ]);
        
        if ($isAdmin) {
            // Créer le rôle admin s'il n'existe pas
            $adminRole = Role::firstOrCreate(['name' => 'admin']);
            $user->roles()->attach($adminRole);
        } else {
            // Créer le rôle user s'il n'existe pas
            $userRole = Role::firstOrCreate(['name' => 'user']);
            $user->roles()->attach($userRole);
        }
        
        $this->info("Test user created successfully!");
        $this->line("Email: {$email}");
        $this->line("Password: 123456");
        $this->line("Role: " . ($isAdmin ? 'admin' : 'user'));
    }
}