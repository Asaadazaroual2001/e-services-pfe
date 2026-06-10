<?php

/**
 * Charge des identifiants optionnels depuis storage/app/emailjs-credentials.json
 * (pratique si le .env pose problème : copier-coller le JSON une seule fois).
 */
$emailJsFromFile = static function (): array {
    $path = storage_path('app/emailjs-credentials.json');
    if (! is_readable($path)) {
        return [];
    }
    $raw = json_decode((string) file_get_contents($path), true);
    if (! is_array($raw)) {
        return [];
    }
    $out = [];
    foreach (['service_id', 'template_id', 'public_key', 'private_key'] as $k) {
        if (! empty($raw[$k]) && is_string($raw[$k])) {
            $t = trim($raw[$k]);
            if ($t === '' || str_starts_with($t, 'COLLE_ICI') || str_starts_with($t, 'REMPLACE_')) {
                continue;
            }
            $out[$k] = $t;
        }
    }

    return $out;
};

$file = $emailJsFromFile();

$envOrFile = static function (string $envKey, string $fileKey) use ($file): string {
    $e = env($envKey);
    if (is_string($e) && trim($e) !== '') {
        return trim($e);
    }

    return $file[$fileKey] ?? '';
};

return [

    /*
    |--------------------------------------------------------------------------
    | EmailJS (envoi serveur → clients)
    |--------------------------------------------------------------------------
    |
    | Clés : .env (EMAILJS_*) OU fichier storage/app/emailjs-credentials.json
    | Création du fichier : php artisan emailjs:setup
    |
    | Modèle EmailJS : To email = {{to_email}}, subject avec {{title}}, corps {{message}}, etc.
    |
    | Compte → Security : autoriser l’API depuis le serveur (sinon HTTP 403 « non-browser »).
    | service_id : utiliser default_service si le bon service est défini par défaut, sinon service_xxxxx.
    |
    */

    'enabled' => filter_var(env('EMAILJS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    'service_id' => $envOrFile('EMAILJS_SERVICE_ID', 'service_id'),

    'template_id' => $envOrFile('EMAILJS_TEMPLATE_ID', 'template_id'),

    'public_key' => $envOrFile('EMAILJS_PUBLIC_KEY', 'public_key'),

    'private_key' => $envOrFile('EMAILJS_PRIVATE_KEY', 'private_key'),

    'send_url' => env('EMAILJS_SEND_URL', 'https://api.emailjs.com/api/v1.0/email/send'),

];
