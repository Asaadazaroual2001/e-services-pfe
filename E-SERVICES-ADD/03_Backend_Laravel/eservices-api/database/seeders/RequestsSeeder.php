<?php

namespace Database\Seeders;

use App\Models\Request;
use App\Models\RequestHistory;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class RequestsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get users and services
        $client = User::whereHas('roles', fn($q) => $q->where('name', 'client'))->first();
        $agent = User::whereHas('roles', fn($q) => $q->where('name', 'agent'))->first();
        $admin = User::whereHas('roles', fn($q) => $q->where('name', 'admin'))->first();
        
        $services = Service::limit(2)->get();

        if (!$client || !$agent || !$admin || $services->isEmpty()) {
            $this->command->warn('Assurez-vous d\'avoir des utilisateurs (client, agent, admin) et des services avant de lancer ce seeder.');
            return;
        }

        $statuses = [
            Request::STATUS_SUBMITTED,
            Request::STATUS_IN_REVIEW,
            Request::STATUS_NEEDS_INFO,
            Request::STATUS_APPROVED,
            Request::STATUS_REJECTED,
        ];

        // Create 10 sample requests
        for ($i = 1; $i <= 10; $i++) {
            $status = $statuses[array_rand($statuses)];
            $service = $services->random();

            $request = Request::create([
                'reference' => Request::generateReference(),
                'service_id' => $service->id,
                'user_id' => $client->id,
                'assigned_to' => in_array($status, [Request::STATUS_IN_REVIEW, Request::STATUS_APPROVED, Request::STATUS_REJECTED]) ? $agent->id : null,
                'current_status' => $status,
                'is_active' => rand(0, 9) > 0, // 90% active
                'submitted_at' => now()->subDays(rand(1, 30)),
            ]);

            // Create initial history
            RequestHistory::create([
                'request_id' => $request->id,
                'actor_id' => $client->id,
                'action' => 'CREATED',
                'to_status' => Request::STATUS_DRAFT,
                'comment' => 'Demande créée',
            ]);

            RequestHistory::create([
                'request_id' => $request->id,
                'actor_id' => $client->id,
                'action' => 'SUBMITTED',
                'from_status' => Request::STATUS_DRAFT,
                'to_status' => Request::STATUS_SUBMITTED,
            ]);

            // Add more history based on status
            if (in_array($status, [Request::STATUS_IN_REVIEW, Request::STATUS_NEEDS_INFO, Request::STATUS_APPROVED, Request::STATUS_REJECTED])) {
                RequestHistory::create([
                    'request_id' => $request->id,
                    'actor_id' => $agent->id,
                    'action' => 'ASSIGNED',
                    'comment' => 'Demande assignée à un agent',
                ]);

                RequestHistory::create([
                    'request_id' => $request->id,
                    'actor_id' => $agent->id,
                    'action' => 'STATUS_CHANGED',
                    'from_status' => Request::STATUS_SUBMITTED,
                    'to_status' => Request::STATUS_IN_REVIEW,
                ]);
            }

            if ($status === Request::STATUS_APPROVED) {
                RequestHistory::create([
                    'request_id' => $request->id,
                    'actor_id' => $agent->id,
                    'action' => 'APPROVED',
                    'from_status' => Request::STATUS_IN_REVIEW,
                    'to_status' => Request::STATUS_APPROVED,
                    'comment' => 'Demande approuvée après vérification',
                ]);
            }

            if ($status === Request::STATUS_REJECTED) {
                RequestHistory::create([
                    'request_id' => $request->id,
                    'actor_id' => $agent->id,
                    'action' => 'REJECTED',
                    'from_status' => Request::STATUS_IN_REVIEW,
                    'to_status' => Request::STATUS_REJECTED,
                    'comment' => 'Demande rejetée - documents incomplets',
                ]);
            }

            if ($status === Request::STATUS_NEEDS_INFO) {
                RequestHistory::create([
                    'request_id' => $request->id,
                    'actor_id' => $agent->id,
                    'action' => 'STATUS_CHANGED',
                    'from_status' => Request::STATUS_IN_REVIEW,
                    'to_status' => Request::STATUS_NEEDS_INFO,
                    'comment' => 'Informations supplémentaires requises',
                ]);
            }
        }

        $this->command->info('10 demandes avec historiques créées avec succès!');
    }
}
