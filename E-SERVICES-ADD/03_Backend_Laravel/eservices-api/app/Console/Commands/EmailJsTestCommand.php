<?php

namespace App\Console\Commands;

use App\Services\EmailJsSender;
use Illuminate\Console\Command;

class EmailJsTestCommand extends Command
{
    protected $signature = 'emailjs:test {email : Adresse qui doit recevoir le mail de test}';

    protected $description = 'Affiche la config EmailJS et envoie un e-mail de test via l’API (historique sur dashboard.emailjs.com)';

    public function handle(EmailJsSender $sender): int
    {
        $this->line('=== Diagnostic EmailJS (Laravel) ===');
        $this->line('.env chargé depuis : '.base_path('.env'));
        $jsonPath = storage_path('app/emailjs-credentials.json');
        $this->line('Fichier JSON optionnel : '.$jsonPath.' → '.(is_readable($jsonPath) ? 'présent (fusionné si .env vide)' : 'absent (php artisan emailjs:setup)'));
        $this->line('Valeur brute .env EMAILJS_ENABLED : '.json_encode(env('EMAILJS_ENABLED')));
        $this->line('config(emailjs.enabled)        : '.(config('emailjs.enabled') ? 'true' : 'false'));
        $this->line('SERVICE_ID  : '.(config('emailjs.service_id') ?: '— VIDE —'));
        $this->line('TEMPLATE_ID : '.(config('emailjs.template_id') ?: '— VIDE —'));
        $pk = config('emailjs.public_key');
        $this->line('PUBLIC_KEY  : '.($pk ? (substr((string) $pk, 0, 8).'…') : '— VIDE —'));
        $this->line('PRIVATE_KEY : '.(config('emailjs.private_key') ? '(défini)' : '(non utilisé)'));
        $this->newLine();

        if (!$sender->isConfigured()) {
            $this->error('EmailJS n’est pas prêt : aucun appel API (historique EmailJS vide).');
            $this->newLine();

            if (!config('emailjs.enabled')) {
                $this->warn('→ Dans .env, mettez : EMAILJS_ENABLED=true (sans espaces avant/après), enregistrez le fichier.');
            } else {
                $this->warn('→ EMAILJS_ENABLED est activé, mais il manque encore des clés.');
                $this->line('  Ouvrez le .env indiqué ci-dessus dans Cursor / Bloc-notes et complétez les 3 lignes :');
                $this->line('  EMAILJS_SERVICE_ID=service_xxxxx     (Email Services sur dashboard.emailjs.com)');
                $this->line('  EMAILJS_TEMPLATE_ID=le3b1fi          (ou l’ID affiché sur ton modèle « Contact Us »)');
                $this->line('  EMAILJS_PUBLIC_KEY=xxxxxxxx          (Account → API keys → Public Key)');
                $this->line('  Pas de guillemets, pas d’espace autour du =. Puis Ctrl+S pour enregistrer.');
                $this->newLine();
                $this->line('  OU lancez : php artisan emailjs:setup');
                $this->line('  puis éditez storage/app/emailjs-credentials.json (mêmes 3 clés, format JSON).');
            }

            $this->newLine();
            $this->line('Ensuite : php artisan config:clear && php artisan emailjs:test ton@email.com');
            $this->line('Sans EmailJS, Laravel utilise MAIL_MAILER (souvent "log" = rien dans une vraie boîte).');

            return self::FAILURE;
        }

        $to = $this->argument('email');
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Adresse e-mail invalide.');

            return self::FAILURE;
        }

        $this->info('Envoi en cours vers '.$to.'…');

        try {
            $sender->send(
                $to,
                'Test destinataire',
                '[TEST] EmailJS depuis Laravel',
                "Bonjour,\n\nSi vous lisez ce message, l’API EmailJS répond correctement depuis le backend.\n\nCordialement,\n".config('app.name')
            );
        } catch (\Throwable $e) {
            $this->error('Erreur API EmailJS : '.$e->getMessage());
            $this->line('Vérifiez le modèle : To email = {{to_email}}, et que le service Gmail/Outlook est bien connecté sur EmailJS.');

            return self::FAILURE;
        }

        $this->info('Réponse OK. Vérifiez : 1) la boîte '.$to.' (et spam) 2) EmailJS → Email History.');

        return self::SUCCESS;
    }
}
