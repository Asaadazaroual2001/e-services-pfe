<x-mail::message>
# {{ $subjectLine }}

Bonjour **{{ $recipientName }}**,

@if ($requestReference)
Concernant la demande **{{ $requestReference }}** :
@endif

@foreach (preg_split("/\r\n|\n|\r/", $bodyText) as $line)
{{ $line }}

@endforeach

---

Message envoyé par **{{ $senderName }}** (service E-Services).

@if ($portalUrl)
<x-mail::button :url="$portalUrl">
Accéder à mon espace
</x-mail::button>
@endif

Cordialement,<br>
{{ trim((string) config('notifications.mail_team_signature')) ?: 'L\'équipe #ADD' }}
</x-mail::message>
