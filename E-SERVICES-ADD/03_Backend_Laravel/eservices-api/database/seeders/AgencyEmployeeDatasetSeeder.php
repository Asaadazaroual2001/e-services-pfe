<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AgencyEmployeeDatasetSeeder extends Seeder
{
    /**
     * Employés rattachés aux agences (codes) — idempotent par email.
     * Le premier « responsable » par agence remplit responsable_user_id si encore vide.
     */
    public function run(): void
    {
        $rows = [
            ['agence_code' => 'ANAPEC001', 'agence_nom' => 'ANAPEC', 'nom_complet' => 'Youssef El Amrani', 'email' => 'y.elamrani@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ANAPEC001', 'agence_nom' => 'ANAPEC', 'nom_complet' => 'Khadija Benali', 'email' => 'k.benali@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ANAPEC001', 'agence_nom' => 'ANAPEC', 'nom_complet' => 'Salma Ait Lahcen', 'email' => 's.lahcen@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],
            ['agence_code' => 'CNSS002', 'agence_nom' => 'CNSS', 'nom_complet' => 'Omar Tazi', 'email' => 'o.tazi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'CNSS002', 'agence_nom' => 'CNSS', 'nom_complet' => 'Fatima Zahra Chafai', 'email' => 'f.chafai@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'CNSS002', 'agence_nom' => 'CNSS', 'nom_complet' => 'Hamza El Fassi', 'email' => 'h.fassi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],
            ['agence_code' => 'OFPPT003', 'agence_nom' => 'OFPPT', 'nom_complet' => 'Mehdi Berrada', 'email' => 'm.berrada@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'OFPPT003', 'agence_nom' => 'OFPPT', 'nom_complet' => 'Souad Idrissi', 'email' => 's.idrissi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'OFPPT003', 'agence_nom' => 'OFPPT', 'nom_complet' => 'Yassine Ouahbi', 'email' => 'y.ouahbi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],
            ['agence_code' => 'ONCF004', 'agence_nom' => 'ONCF', 'nom_complet' => 'Abdelilah Lahmidi', 'email' => 'a.lahmidi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ONCF004', 'agence_nom' => 'ONCF', 'nom_complet' => 'Nadia El Kettani', 'email' => 'n.kettani@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ONCF004', 'agence_nom' => 'ONCF', 'nom_complet' => 'Imane Bennis', 'email' => 'i.bennis@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],
            ['agence_code' => 'RAM005', 'agence_nom' => 'Royal Air Maroc', 'nom_complet' => 'Hicham Aouragh', 'email' => 'h.aouragh@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'RAM005', 'agence_nom' => 'Royal Air Maroc', 'nom_complet' => 'Sara El Alami', 'email' => 's.alami@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'RAM005', 'agence_nom' => 'Royal Air Maroc', 'nom_complet' => 'Reda Bouzidi', 'email' => 'r.bouzidi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],

            ['agence_code' => 'HCP009', 'agence_nom' => 'Haut-Commissariat au Plan', 'nom_complet' => 'Ahmed El Mokhtar', 'email' => 'a.elmokhtar@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'HCP009', 'agence_nom' => 'Haut-Commissariat au Plan', 'nom_complet' => 'Latifa Boussaid', 'email' => 'l.boussaid@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'HCP009', 'agence_nom' => 'Haut-Commissariat au Plan', 'nom_complet' => 'Karim Ait Taleb', 'email' => 'k.aittaleb@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],

            ['agence_code' => 'MASEN008', 'agence_nom' => 'MASEN', 'nom_complet' => 'Hassan El Ghazi', 'email' => 'h.elghazi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'MASEN008', 'agence_nom' => 'MASEN', 'nom_complet' => 'Nawal El Idrissi', 'email' => 'n.elidrissi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'MASEN008', 'agence_nom' => 'MASEN', 'nom_complet' => 'Yahya Bennani', 'email' => 'y.bennani@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],

            ['agence_code' => 'FIN010', 'agence_nom' => "Ministère de l'Économie et des Finances", 'nom_complet' => 'Rachid El Alami', 'email' => 'r.elalami@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'FIN010', 'agence_nom' => "Ministère de l'Économie et des Finances", 'nom_complet' => 'Samira Chraibi', 'email' => 's.chraibi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'FIN010', 'agence_nom' => "Ministère de l'Économie et des Finances", 'nom_complet' => 'Anas El Fihri', 'email' => 'a.elfihri@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],

            ['agence_code' => 'ONEE006', 'agence_nom' => 'ONEE', 'nom_complet' => 'Mohamed El Kharraz', 'email' => 'm.elkharraz@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ONEE006', 'agence_nom' => 'ONEE', 'nom_complet' => 'Amina Zahra Lahlou', 'email' => 'a.lahlou@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ONEE006', 'agence_nom' => 'ONEE', 'nom_complet' => 'Soufiane El Haddad', 'email' => 's.elhaddad@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],

            ['agence_code' => 'ADM007', 'agence_nom' => 'ADM', 'nom_complet' => 'Abderrahmane Tounsi', 'email' => 'a.tounsi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ADM007', 'agence_nom' => 'ADM', 'nom_complet' => 'Hind El Mansouri', 'email' => 'h.elmansouri@agence.ma', 'mot_de_passe' => 'password', 'role' => "Responsable d'agence"],
            ['agence_code' => 'ADM007', 'agence_nom' => 'ADM', 'nom_complet' => 'Zakaria El Ouardi', 'email' => 'z.elouardi@agence.ma', 'mot_de_passe' => 'password', 'role' => "Agent d'agence"],
        ];

        $roleResponsable = Role::where('name', 'responsable')->first();
        $roleAgent = Role::where('name', 'agent')->first();

        if (! $roleResponsable || ! $roleAgent) {
            $this->command?->error('Rôles responsable/agent introuvables. Exécutez RolesPermissionsSeeder.');

            return;
        }

        $created = 0;
        foreach ($rows as $row) {
            $agency = Agency::query()->where('code', $row['agence_code'])->first();
            if (! $agency) {
                $this->command?->warn("Agence code {$row['agence_code']} introuvable — ignoré : {$row['email']}");

                continue;
            }

            $roleName = $this->mapRoleLabelToName($row['role']);
            $role = $roleName === 'responsable' ? $roleResponsable : $roleAgent;

            $user = User::query()->updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['nom_complet'],
                    'password' => Hash::make($row['mot_de_passe']),
                    'agency_id' => $agency->id,
                ]
            );

            $user->roles()->sync([$role->id]);
            $user->syncPrimaryRole();

            if ($roleName === 'responsable' && $agency->responsable_user_id === null) {
                $agency->responsable_user_id = $user->id;
                $agency->save();
            }

            $created++;
        }

        $this->command?->info("Employés agences : {$created} compte(s) (updateOrCreate par email).");
    }

    private function mapRoleLabelToName(string $label): string
    {
        $l = mb_strtolower(trim($label));

        if (str_contains($l, 'responsable')) {
            return 'responsable';
        }
        if (str_contains($l, 'agent')) {
            return 'agent';
        }

        throw new \InvalidArgumentException("Rôle non reconnu : {$label}");
    }
}
