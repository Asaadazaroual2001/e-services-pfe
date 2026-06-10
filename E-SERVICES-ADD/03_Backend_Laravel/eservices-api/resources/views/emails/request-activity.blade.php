<x-mail::message>
# {{ $heading }}

@foreach ($bodyParagraphs as $paragraph)
{{ $paragraph }}

@endforeach

@if (!empty($actionUrl))
<x-mail::button :url="$actionUrl">
{{ $actionLabel }}
</x-mail::button>
@endif

Cordialement,<br>
{{ trim((string) config('notifications.mail_team_signature')) ?: 'L\'équipe #ADD' }}
</x-mail::message>
