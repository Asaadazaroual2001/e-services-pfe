<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class EmailJsSetupCommand extends Command
{
    protected $signature = 'emailjs:setup';

    protected $description = 'Crée storage/app/emailjs-credentials.json : collez-y vos clés EmailJS (alternative au .env)';

    public function handle(): int
    {
        $source = base_path('resources/emailjs/emailjs-credentials.example.json');
        $target = storage_path('app/emailjs-credentials.json');

        if (! File::exists($source)) {
            $this->error('Fichier exemple introuvable : resources/emailjs/emailjs-credentials.example.json');

            return self::FAILURE;
        }

        if (File::exists($target)) {
            $this->warn('Le fichier existe déjà : '.$target);
            $this->line('Ouvrez-le dans Cursor, remplacez les valeurs COLLE_ICI_* par vos IDs dashboard.emailjs.com, enregistrez.');

            return self::SUCCESS;
        }

        File::copy($source, $target);
        $this->info('Fichier créé : '.$target);
        $this->newLine();
        $this->line('1. Ouvrez ce fichier JSON et remplacez service_id, template_id, public_key (dashboard EmailJS).');
        $this->line('2. Gardez EMAILJS_ENABLED=true dans .env');
        $this->line('3. php artisan config:clear && php artisan emailjs:test votre@email.com');
        $this->newLine();
        $this->comment('Ce fichier est ignoré par Git (storage/app).');

        return self::SUCCESS;
    }
}
