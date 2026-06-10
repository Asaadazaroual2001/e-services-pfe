<?php

/**
 * Notifications métier (demandes, e-mails, etc.).
 */
return [

    'mail' => [
        /**
         * Active l’envoi des e-mails liés aux demandes (statut, commentaires, assignation).
         * Mettre à false pour désactiver sans retirer le code (ex. maintenance).
         */
        'request_events' => filter_var(
            env('MAIL_REQUEST_NOTIFICATIONS', true),
            FILTER_VALIDATE_BOOL
        ),

        /**
         * E-mail aux comptes « client » lorsque le service est ouvert sur le portail (publié + actif + avant échéance).
         */
        'new_service_to_clients' => filter_var(
            env('MAIL_NEW_SERVICE_TO_CLIENTS', true),
            FILTER_VALIDATE_BOOL
        ),
    ],

    /**
     * Fuseau utilisé uniquement pour afficher les dates dans les e-mails (texte lisible).
     */
    'display_timezone' => env('MAIL_DISPLAY_TIMEZONE', 'Africa/Casablanca'),

    /**
     * Signature sous « Cordialement, » (notifications client / demandes).
     * Surcharge possible avec MAIL_TEAM_SIGNATURE dans .env.
     */
    'mail_team_signature' => env('MAIL_TEAM_SIGNATURE', 'L\'équipe ADD-Services'),

    'urls' => [
        /**
         * URL du front (React/Vite), sans slash final.
         * Utilisée pour les boutons « Voir ma demande » dans les e-mails.
         */
        'frontend' => rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost')), '/'),
    ],

];
