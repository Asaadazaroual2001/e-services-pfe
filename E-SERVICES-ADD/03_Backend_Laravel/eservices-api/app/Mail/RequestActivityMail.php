<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * E-mail de notification lié à une demande.
 * Envoi synchrone par défaut (pas de worker requis en local).
 * Pour mettre en file : implémenter ShouldQueue et lancer `php artisan queue:work`.
 */
class RequestActivityMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  list<string>  $bodyParagraphs
     */
    public function __construct(
        public string $subjectLine,
        public string $heading,
        public array $bodyParagraphs,
        public ?string $actionUrl = null,
        public string $actionLabel = 'Ouvrir le portail',
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.request-activity',
            with: [
                'heading' => $this->heading,
                'bodyParagraphs' => $this->bodyParagraphs,
                'actionUrl' => $this->actionUrl,
                'actionLabel' => $this->actionLabel,
            ],
        );
    }
}
