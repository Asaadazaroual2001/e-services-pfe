<?php

namespace Tests\Feature;

use App\Mail\RequestActivityMail;
use App\Models\Agency;
use App\Models\Request as DemandRequest;
use App\Models\RequestDocument;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use Tests\TestCase;

/**
 * Tests de non-régression pour les évolutions récentes :
 * filtres API agences (recherche, statut, ville), téléchargement sécurisé des pièces jointes,
 * notifications e-mail sur commentaires admin.
 *
 * Prérequis PHPUnit (voir phpunit.xml) : SQLite en mémoire (pdo_sqlite).
 * Sous Windows, activez l’extension dans php.ini : extension=pdo_sqlite et extension=sqlite3.
 * Sinon : `php artisan test` ignorera cette classe (skip).
 */
#[RequiresPhpExtension('pdo_sqlite')]
class ProjectModificationsTest extends TestCase
{
    use RefreshDatabase;

    private function createRole(string $name, string $code, string $label, int $level = 5): Role
    {
        $id = Role::query()->insertGetId([
            'name' => $name,
            'code' => $code,
            'label' => $label,
            'level' => $level,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Role::query()->findOrFail($id);
    }

    private function attachRole(User $user, Role $role): void
    {
        $user->roles()->syncWithoutDetaching([$role->id]);
    }

    private function actingAdmin(): User
    {
        $user = User::factory()->create();
        $this->attachRole($user, $this->createRole('admin', 'ADM', 'Admin', 1));

        return $user;
    }

    private function actingClient(): User
    {
        $user = User::factory()->create();
        $this->attachRole($user, $this->createRole('client', 'CLT', 'Client', 20));

        return $user;
    }

    private function actingAgent(?Agency $agency = null): User
    {
        $user = User::factory()->create([
            'agency_id' => $agency?->id,
        ]);
        $this->attachRole($user, $this->createRole('agent', 'AGT', 'Agent', 10));

        return $user;
    }

    public function test_admin_agencies_can_filter_by_search_status_and_city(): void
    {
        $admin = $this->actingAdmin();
        Sanctum::actingAs($admin);

        Agency::query()->create([
            'name' => 'Agence Rabat Centre',
            'code' => 'RBT',
            'city' => 'Rabat',
            'is_active' => true,
        ]);
        Agency::query()->create([
            'name' => 'Agence Casa',
            'code' => 'CAS',
            'city' => 'Casablanca',
            'is_active' => false,
        ]);

        $r = $this->getJson('/api/admin/agencies?search=Rabat');
        $r->assertOk();
        $this->assertCount(1, $r->json());
        $this->assertStringContainsString('Rabat', $r->json('0.name'));

        $r = $this->getJson('/api/admin/agencies?status=inactive');
        $r->assertOk();
        $this->assertCount(1, $r->json());
        $this->assertSame('Casablanca', $r->json('0.city'));

        $r = $this->getJson('/api/admin/agencies?city=Rabat');
        $r->assertOk();
        $this->assertCount(1, $r->json());
        $this->assertSame('Rabat', $r->json('0.city'));
    }

    public function test_client_can_download_document_on_own_request(): void
    {
        Storage::fake('public');

        $client = $this->actingClient();
        $agency = Agency::query()->create([
            'name' => 'A1',
            'code' => 'A1',
            'city' => 'Test',
            'is_active' => true,
        ]);
        $service = Service::query()->create([
            'agency_id' => $agency->id,
            'name' => 'Service test',
            'description' => 'd',
            'is_active' => true,
        ]);

        $req = DemandRequest::query()->create([
            'reference' => DemandRequest::generateReference(),
            'service_id' => $service->id,
            'user_id' => $client->id,
            'current_status' => DemandRequest::STATUS_SUBMITTED,
            'is_active' => true,
            'submitted_at' => now(),
        ]);

        $path = 'request-documents/'.$req->id.'/test.pdf';
        Storage::disk('public')->put($path, '%PDF-1.4 test');

        $doc = RequestDocument::query()->create([
            'request_id' => $req->id,
            'uploaded_by' => $client->id,
            'file_name' => 'piece.pdf',
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => 12,
        ]);

        Sanctum::actingAs($client);

        $response = $this->get('/api/client/requests/'.$req->id.'/documents/'.$doc->id.'/download');
        $response->assertOk();
        $response->assertHeader('content-disposition');
    }

    public function test_client_cannot_download_document_from_another_users_request(): void
    {
        Storage::fake('public');

        $owner = $this->actingClient();
        $intruder = $this->actingClient();

        $agency = Agency::query()->create([
            'name' => 'A2',
            'code' => 'A2',
            'city' => 'X',
            'is_active' => true,
        ]);
        $service = Service::query()->create([
            'agency_id' => $agency->id,
            'name' => 'S2',
            'description' => 'd',
            'is_active' => true,
        ]);

        $req = DemandRequest::query()->create([
            'reference' => DemandRequest::generateReference(),
            'service_id' => $service->id,
            'user_id' => $owner->id,
            'current_status' => DemandRequest::STATUS_SUBMITTED,
            'is_active' => true,
            'submitted_at' => now(),
        ]);

        $path = 'request-documents/'.$req->id.'/f.txt';
        Storage::disk('public')->put($path, 'secret');

        $doc = RequestDocument::query()->create([
            'request_id' => $req->id,
            'uploaded_by' => $owner->id,
            'file_name' => 'f.txt',
            'file_path' => $path,
            'mime_type' => 'text/plain',
            'file_size' => 6,
        ]);

        Sanctum::actingAs($intruder);

        $this->get('/api/client/requests/'.$req->id.'/documents/'.$doc->id.'/download')
            ->assertNotFound();
    }

    public function test_agent_can_download_document_for_visible_request(): void
    {
        Storage::fake('public');

        $agency = Agency::query()->create([
            'name' => 'A3',
            'code' => 'A3',
            'city' => 'Y',
            'is_active' => true,
        ]);
        $agent = $this->actingAgent($agency);
        $client = $this->actingClient();

        $service = Service::query()->create([
            'agency_id' => $agency->id,
            'name' => 'S3',
            'description' => 'd',
            'is_active' => true,
        ]);

        $req = DemandRequest::query()->create([
            'reference' => DemandRequest::generateReference(),
            'service_id' => $service->id,
            'user_id' => $client->id,
            'assigned_to' => $agent->id,
            'current_status' => DemandRequest::STATUS_IN_REVIEW,
            'is_active' => true,
            'submitted_at' => now(),
        ]);

        $path = 'request-documents/'.$req->id.'/doc.bin';
        Storage::disk('public')->put($path, 'data');

        $doc = RequestDocument::query()->create([
            'request_id' => $req->id,
            'uploaded_by' => $client->id,
            'file_name' => 'doc.bin',
            'file_path' => $path,
            'mime_type' => 'application/octet-stream',
            'file_size' => 4,
        ]);

        Sanctum::actingAs($agent);

        $this->get('/api/employee/requests/'.$req->id.'/documents/'.$doc->id.'/download')
            ->assertOk();
    }

    public function test_admin_comment_sends_email_to_client(): void
    {
        Mail::fake();

        $admin = $this->actingAdmin();
        $client = $this->actingClient();

        $agency = Agency::query()->create([
            'name' => 'A4',
            'code' => 'A4',
            'city' => 'Z',
            'is_active' => true,
        ]);
        $service = Service::query()->create([
            'agency_id' => $agency->id,
            'name' => 'S4',
            'description' => 'd',
            'is_active' => true,
        ]);

        $req = DemandRequest::query()->create([
            'reference' => DemandRequest::generateReference(),
            'service_id' => $service->id,
            'user_id' => $client->id,
            'current_status' => DemandRequest::STATUS_SUBMITTED,
            'is_active' => true,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/requests/'.$req->id.'/comment', [
            'comment' => 'Bonjour, nous traitons votre dossier.',
        ])->assertCreated();

        Mail::assertSent(RequestActivityMail::class, function (RequestActivityMail $mail) use ($client) {
            return $mail->hasTo($client->email);
        });
    }
}
