<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Request extends Model
{
    use HasFactory;

    protected $hidden = [
        'public_submission_token',
    ];

    protected $appends = [
        'display_client_name',
    ];

    protected $fillable = [
        'reference',
        'service_id',
        'user_id',
        'public_submission_token',
        'assigned_to',
        'current_status',
        'is_active',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'submitted_at' => 'datetime',
        ];
    }

    // Status constants
    const STATUS_DRAFT = 'DRAFT';
    const STATUS_SUBMITTED = 'SUBMITTED';
    const STATUS_IN_REVIEW = 'IN_REVIEW';
    const STATUS_NEEDS_INFO = 'NEEDS_INFO';
    const STATUS_APPROVED = 'APPROVED';
    const STATUS_REJECTED = 'REJECTED';
    const STATUS_CLOSED = 'CLOSED';

    // Valid status transitions (state machine)
    const STATUS_TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_SUBMITTED],
        self::STATUS_SUBMITTED => [self::STATUS_IN_REVIEW, self::STATUS_CLOSED],
        self::STATUS_IN_REVIEW => [self::STATUS_NEEDS_INFO, self::STATUS_APPROVED, self::STATUS_REJECTED],
        self::STATUS_NEEDS_INFO => [self::STATUS_IN_REVIEW],
        self::STATUS_APPROVED => [self::STATUS_CLOSED],
        self::STATUS_REJECTED => [self::STATUS_CLOSED],
        self::STATUS_CLOSED => [],
    ];

    /**
     * Generate unique reference number
     */
    public static function generateReference(): string
    {
        $year = date('Y');
        $lastRequest = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = $lastRequest ? intval(substr($lastRequest->reference, -6)) + 1 : 1;

        return sprintf('ADD-%s-%06d', $year, $nextNumber);
    }

    /**
     * Check if status transition is valid
     */
    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::STATUS_TRANSITIONS[$this->current_status] ?? []);
    }

    /**
     * Get the client (user who created the request)
     */
    public function client()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the service
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the assigned agent
     */
    public function assignedAgent()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get all histories
     */
    public function histories()
    {
        return $this->hasMany(RequestHistory::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get field values
     */
    public function fieldValues()
    {
        return $this->hasMany(RequestFieldValue::class);
    }

    /**
     * Get documents
     */
    public function documents()
    {
        return $this->hasMany(RequestDocument::class);
    }

    /**
     * Get comments
     */
    public function comments()
    {
        return $this->hasMany(RequestComment::class)->orderBy('created_at', 'asc');
    }

    /**
     * Get latest treatment history (approved/rejected)
     */
    public function latestTreatmentHistory()
    {
        return $this->hasOne(RequestHistory::class)
            ->whereIn('action', ['APPROVED', 'REJECTED'])
            ->latest();
    }

    /**
     * Check if request has been viewed by admin/agent
     */
    public function isViewed(): bool
    {
        return $this->histories()
            ->where('action', 'VIEWED')
            ->exists();
    }

    /**
     * Get treated by user from history
     */
    public function getTreatedByAttribute()
    {
        $treatment = $this->latestTreatmentHistory;
        return $treatment ? $treatment->actor : null;
    }

    /**
     * Get treated at timestamp
     */
    public function getTreatedAtAttribute()
    {
        $treatment = $this->latestTreatmentHistory;
        return $treatment ? $treatment->created_at : null;
    }

    /**
     * Nom affichable pour le client : compte lié, sinon champ formulaire « name » / « nom » (label ou key).
     */
    public function getDisplayClientNameAttribute(): ?string
    {
        return $this->resolveDisplayClientName();
    }

    /**
     * Nom affichable ou null (jamais la chaîne « N/A » — l’UI affiche un seul libellé manquant).
     */
    public function resolveDisplayClientName(): ?string
    {
        $fromUser = $this->client?->name ?? null;
        if (is_string($fromUser) && trim($fromUser) !== '') {
            return trim($fromUser);
        }

        $this->loadMissing(['fieldValues.serviceField']);

        foreach ($this->fieldValues as $fv) {
            if (! $this->serviceFieldIsNameLike($fv->serviceField)) {
                continue;
            }
            $str = self::stringValueFromFieldValue($fv);
            if ($str !== null) {
                return $str;
            }
        }

        return null;
    }

    /**
     * E-mail destinataire pour préremplissage (compte client, sinon champ type email / libellé e-mail sur la demande).
     */
    public function resolveRecipientHintEmail(): ?string
    {
        $fromUser = $this->client?->email ?? null;
        if (is_string($fromUser) && trim($fromUser) !== '') {
            $t = trim($fromUser);
            if (filter_var($t, FILTER_VALIDATE_EMAIL)) {
                return $t;
            }
        }

        $this->loadMissing(['fieldValues.serviceField']);

        foreach ($this->fieldValues as $fv) {
            if (! $this->serviceFieldIsEmailLike($fv->serviceField)) {
                continue;
            }
            $str = self::stringValueFromFieldValue($fv);
            if ($str !== null && filter_var($str, FILTER_VALIDATE_EMAIL)) {
                return $str;
            }
        }

        return null;
    }

    /**
     * CIN pour préremplissage (profil utilisateur, sinon champ formulaire type identifiant).
     */
    public function resolveRecipientHintCin(): ?string
    {
        $fromUser = $this->client?->cin ?? null;
        if (is_string($fromUser) && trim($fromUser) !== '') {
            return trim($fromUser);
        }

        $this->loadMissing(['fieldValues.serviceField']);

        foreach ($this->fieldValues as $fv) {
            if (! $this->serviceFieldIsCinLike($fv->serviceField)) {
                continue;
            }
            $str = self::stringValueFromFieldValue($fv);
            if ($str !== null && trim($str) !== '') {
                return trim($str);
            }
        }

        return null;
    }

    private function serviceFieldIsNameLike(?ServiceField $field): bool
    {
        if ($field === null) {
            return false;
        }
        foreach (['label', 'key'] as $attr) {
            $raw = $field->{$attr} ?? '';
            if (! is_string($raw)) {
                continue;
            }
            $n = mb_strtolower(trim($raw));
            if ($n === 'name' || $n === 'nom') {
                return true;
            }
        }

        return false;
    }

    private function serviceFieldIsEmailLike(?ServiceField $field): bool
    {
        if ($field === null) {
            return false;
        }
        if (($field->type ?? '') === 'email') {
            return true;
        }
        foreach (['label', 'key'] as $attr) {
            $raw = $field->{$attr} ?? '';
            if (! is_string($raw)) {
                continue;
            }
            $n = mb_strtolower(trim($raw));
            if (in_array($n, ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse e-mail'], true)) {
                return true;
            }
            if (str_contains($n, 'e-mail') || str_contains($n, 'courriel')) {
                return true;
            }
            if (str_contains($n, 'email') && ! str_contains($n, 'cin')) {
                return true;
            }
        }

        return false;
    }

    private function serviceFieldIsCinLike(?ServiceField $field): bool
    {
        if ($field === null) {
            return false;
        }
        foreach (['label', 'key'] as $attr) {
            $raw = $field->{$attr} ?? '';
            if (! is_string($raw)) {
                continue;
            }
            $n = mb_strtolower(trim($raw));
            if ($n === 'cin') {
                return true;
            }
            $needles = ['c.i.n', 'carte nationale', 'carte d\'identité', 'carte d\'identite', 'identité nationale', 'identite nationale', 'national id'];
            foreach ($needles as $needle) {
                if (str_contains($n, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function stringValueFromFieldValue(RequestFieldValue $fv): ?string
    {
        $t = $fv->value_text;
        if (is_string($t)) {
            $t = trim($t);
            if ($t !== '') {
                return $t;
            }
        }

        $j = $fv->value_json;
        if ($j === null) {
            return null;
        }
        if (is_string($j)) {
            $t = trim($j);

            return $t !== '' ? $t : null;
        }
        if (is_array($j)) {
            foreach ($j as $item) {
                if (is_scalar($item)) {
                    $s = trim((string) $item);
                    if ($s !== '') {
                        return $s;
                    }
                }
            }
        }

        return null;
    }
}
