<?php

namespace App\Http\Controllers\Public;

use Illuminate\Http\JsonResponse;

/**
 * Expose uniquement les identifiants publics EmailJS pour le formulaire /contact (navigateur).
 * Les mêmes valeurs que config/emailjs.php (.env ou storage/app/emailjs-credentials.json).
 */
class EmailJsPublicConfigController
{
    public function __invoke(): JsonResponse
    {
        $serviceId = (string) config('emailjs.service_id', '');
        $templateId = (string) config('emailjs.template_id', '');
        $publicKey = (string) config('emailjs.public_key', '');

        $trimmed = static fn (string $s): string => trim($s);

        $serviceId = $trimmed($serviceId);
        $templateId = $trimmed($templateId);
        $publicKey = $trimmed($publicKey);

        $configured = $serviceId !== '' && $templateId !== '' && $publicKey !== '';

        return response()->json([
            'configured' => $configured,
            'service_id' => $configured ? $serviceId : null,
            'template_id' => $configured ? $templateId : null,
            'public_key' => $configured ? $publicKey : null,
        ]);
    }
}
