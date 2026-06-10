<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\ServiceField;
use Illuminate\Database\Seeder;

class ServicesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Service 1: Demande d'Acte de Naissance
        $service1 = Service::create([
            'name' => 'Demande d\'Acte de Naissance',
            'description' => 'Service pour demander une copie d\'acte de naissance',
            'is_active' => true,
        ]);

        ServiceField::create([
            'service_id' => $service1->id,
            'key' => 'full_name',
            'label' => 'Nom complet',
            'type' => 'text',
            'required' => true,
            'order' => 0,
        ]);

        ServiceField::create([
            'service_id' => $service1->id,
            'key' => 'birth_date',
            'label' => 'Date de naissance',
            'type' => 'date',
            'required' => true,
            'order' => 1,
        ]);

        ServiceField::create([
            'service_id' => $service1->id,
            'key' => 'birth_place',
            'label' => 'Lieu de naissance',
            'type' => 'text',
            'required' => true,
            'order' => 2,
        ]);

        ServiceField::create([
            'service_id' => $service1->id,
            'key' => 'copy_type',
            'label' => 'Type de copie',
            'type' => 'select',
            'required' => true,
            'options_json' => ['Copie intégrale', 'Extrait avec filiation', 'Extrait sans filiation'],
            'order' => 3,
        ]);

        ServiceField::create([
            'service_id' => $service1->id,
            'key' => 'number_of_copies',
            'label' => 'Nombre de copies',
            'type' => 'number',
            'required' => true,
            'order' => 4,
        ]);

        // Service 2: Demande de Certificat de Résidence
        $service2 = Service::create([
            'name' => 'Demande de Certificat de Résidence',
            'description' => 'Service pour obtenir un certificat de résidence',
            'is_active' => true,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'full_name',
            'label' => 'Nom complet',
            'type' => 'text',
            'required' => true,
            'order' => 0,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'cin',
            'label' => 'Numéro CIN',
            'type' => 'text',
            'required' => true,
            'order' => 1,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'address',
            'label' => 'Adresse complète',
            'type' => 'textarea',
            'required' => true,
            'order' => 2,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'residence_duration',
            'label' => 'Durée de résidence (en années)',
            'type' => 'number',
            'required' => true,
            'order' => 3,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'proof_of_residence',
            'label' => 'Justificatif de domicile',
            'type' => 'file',
            'required' => true,
            'order' => 4,
        ]);

        ServiceField::create([
            'service_id' => $service2->id,
            'key' => 'additional_notes',
            'label' => 'Notes supplémentaires',
            'type' => 'textarea',
            'required' => false,
            'order' => 5,
        ]);

        $this->command->info('2 services avec leurs champs ont été créés avec succès!');
    }
}
