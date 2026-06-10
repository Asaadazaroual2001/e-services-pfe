<?php

namespace Database\Seeders;

use App\Models\Agency;
use Illuminate\Database\Seeder;

class AgencyDatasetSeeder extends Seeder
{
    /**
     * Jeu d’agences marocaines (référence) — idempotent via code unique.
     */
    public function run(): void
    {
        $rows = [
            [
                'code' => 'ANAPEC001',
                'nom' => 'ANAPEC',
                'ville' => 'Rabat',
                'adresse' => 'Avenue Hassan II, Bloc A',
                'telephone' => '0537000001',
                'email' => 'contact1@agence.ma',
                'description' => "Agence nationale de promotion de l'emploi et des compétences.",
            ],
            [
                'code' => 'CNSS002',
                'nom' => 'CNSS',
                'ville' => 'Casablanca',
                'adresse' => 'Boulevard Zerktouni, Immeuble B',
                'telephone' => '0522000002',
                'email' => 'contact2@agence.ma',
                'description' => 'Caisse nationale de sécurité sociale.',
            ],
            [
                'code' => 'OFPPT003',
                'nom' => 'OFPPT',
                'ville' => 'Fès',
                'adresse' => 'Route Immouzer, Zone C',
                'telephone' => '0535000003',
                'email' => 'contact3@agence.ma',
                'description' => 'Office de la formation professionnelle et de la promotion du travail.',
            ],
            [
                'code' => 'ONCF004',
                'nom' => 'ONCF',
                'ville' => 'Marrakech',
                'adresse' => 'Avenue Mohammed VI, Gare Office',
                'telephone' => '0524000004',
                'email' => 'contact4@agence.ma',
                'description' => 'Office national des chemins de fer.',
            ],
            [
                'code' => 'RAM005',
                'nom' => 'Royal Air Maroc',
                'ville' => 'Casablanca',
                'adresse' => 'Aéroport Mohammed V, Terminal 1',
                'telephone' => '0522000005',
                'email' => 'contact5@agence.ma',
                'description' => 'Compagnie aérienne nationale du Maroc.',
            ],
            [
                'code' => 'ONEE006',
                'nom' => 'ONEE',
                'ville' => 'Rabat',
                'adresse' => 'Quartier Administratif, Bloc D',
                'telephone' => '0537000006',
                'email' => 'contact6@agence.ma',
                'description' => "Office national de l'électricité et de l'eau potable.",
            ],
            [
                'code' => 'ADM007',
                'nom' => 'ADM',
                'ville' => 'Rabat',
                'adresse' => 'Autoroute Rabat-Casablanca KM 12',
                'telephone' => '0537000007',
                'email' => 'contact7@agence.ma',
                'description' => 'Autoroutes du Maroc.',
            ],
            [
                'code' => 'MASEN008',
                'nom' => 'MASEN',
                'ville' => 'Rabat',
                'adresse' => 'Technopolis, Bâtiment E',
                'telephone' => '0537000008',
                'email' => 'contact8@agence.ma',
                'description' => "Agence marocaine pour l'énergie durable.",
            ],
            [
                'code' => 'HCP009',
                'nom' => 'Haut-Commissariat au Plan',
                'ville' => 'Rabat',
                'adresse' => 'Hay Riad, Secteur 16',
                'telephone' => '0537000009',
                'email' => 'contact9@agence.ma',
                'description' => 'Institution de statistiques et de planification.',
            ],
            [
                'code' => 'FIN010',
                'nom' => "Ministère de l'Économie et des Finances",
                'ville' => 'Rabat',
                'adresse' => 'Quartier Administratif, Bâtiment F',
                'telephone' => '0537000010',
                'email' => 'contact10@agence.ma',
                'description' => 'Gestion des finances publiques et politiques économiques.',
            ],
        ];

        foreach ($rows as $row) {
            Agency::updateOrCreate(
                ['code' => $row['code']],
                [
                    'name' => $row['nom'],
                    'address' => $row['adresse'],
                    'city' => $row['ville'],
                    'phone' => $row['telephone'],
                    'email' => $row['email'],
                    'description' => $row['description'],
                    'is_active' => true,
                ]
            );
        }

        $this->command?->info('Agences : '.count($rows).' enregistrement(s) (updateOrCreate par code).');
    }
}
