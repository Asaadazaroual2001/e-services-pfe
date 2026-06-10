<x-mail::message>
# Réinitialisation du mot de passe

Bonjour {{ $userName }},

Vous avez demandé à réinitialiser votre mot de passe sur **{{ config('app.name') }}**.

Votre code de vérification (valable 15 minutes) :

<x-mail::panel>
## {{ $code }}
</x-mail::panel>

Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
