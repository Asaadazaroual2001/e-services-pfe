<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Annonce professionnelle : nouveau service disponible (comptes client).
 */
class ServicePublishedClientMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $recipientName,
        public string $agencyName,
        public string $serviceName,
        public ?string $publicationDate,
        public ?string $deadline,
        public string $actionUrl,
        public string $teamSignature,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.service-published-client',
            with: [
                'client_name' => $this->recipientName,
                'agency_name' => $this->agencyName,
                'service_name' => $this->serviceName,
                'service_url' => $this->actionUrl,
                'publication_date' => $this->publicationDate,
                'deadline' => $this->deadline,
                'team_signature' => $this->teamSignature,
            ],
        );
    }
}
