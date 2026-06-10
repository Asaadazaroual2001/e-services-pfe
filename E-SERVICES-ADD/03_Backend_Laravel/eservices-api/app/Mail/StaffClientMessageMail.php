<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffClientMessageMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $senderName,
        public string $recipientName,
        public string $bodyText,
        public ?string $requestReference,
        public ?string $portalUrl,
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
            markdown: 'emails.staff-client-message',
            with: [
                'subjectLine' => $this->subjectLine,
                'senderName' => $this->senderName,
                'recipientName' => $this->recipientName,
                'bodyText' => $this->bodyText,
                'requestReference' => $this->requestReference,
                'portalUrl' => $this->portalUrl,
            ],
        );
    }
}
