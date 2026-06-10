<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class SyncUserRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:sync-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize primary role field for all users based on their role relationships';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Synchronisation des rôles utilisateurs...');
        
        $users = User::with('roles')->get();
        $updated = 0;
        
        foreach ($users as $user) {
            $oldRole = $user->role;
            
            if ($user->roles->count() > 0) {
                $user->syncPrimaryRole();
                if ($oldRole !== $user->role) {
                    $updated++;
                    $this->line("✅ {$user->email}: {$oldRole} → {$user->role}");
                }
            } else {
                // Assigner un rôle par défaut si aucun rôle n'est assigné
                $user->update(['role' => 'client']);
                $updated++;
                $this->line("📝 {$user->email}: rôle par défaut → client");
            }
        }
        
        $this->info("🎉 Synchronisation terminée!");
        $this->info("📊 Total des utilisateurs: {$users->count()}");
        $this->info("📈 Utilisateurs mis à jour: {$updated}");
        
        return Command::SUCCESS;
    }
}