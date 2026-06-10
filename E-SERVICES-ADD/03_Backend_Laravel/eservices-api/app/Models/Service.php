<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saved(function (Service $service) {
            $service->resetClientsPublicationNotifiedIfPublicationScheduledLater();
        });
    }

    /**
     * Si la mise en ligne est programmée dans le futur, on oublie l’envoi déjà fait :
     * sinon, quand la date arrive, maybeNotify ne renverrait jamais l’e-mail (flag déjà présent).
     */
    public function resetClientsPublicationNotifiedIfPublicationScheduledLater(): void
    {
        if ($this->published_at === null || ! $this->published_at->isFuture()) {
            return;
        }
        if ($this->clients_publication_notified_at === null) {
            return;
        }
        static::query()->whereKey($this->id)->update(['clients_publication_notified_at' => null]);
        $this->clients_publication_notified_at = null;
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'agency_id',
        'name',
        'description',
        'instructions',
        'procedure_steps',
        'required_documents',
        'eligibility_criteria',
        'estimated_duration',
        'is_active',
        'request_deadline_at',
        'published_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'request_deadline_at' => 'datetime',
            'published_at' => 'datetime',
            'clients_publication_notified_at' => 'datetime',
        ];
    }

    /**
     * Réinitialise le suivi d’e-mail « service publié » quand la fiche est désactivée (réactivation = nouvel envoi possible).
     */
    public function clearClientsPublicationNotifiedIfInactive(): void
    {
        if (! $this->is_active && $this->clients_publication_notified_at !== null) {
            static::query()->whereKey($this->id)->update(['clients_publication_notified_at' => null]);
            $this->clients_publication_notified_at = null;
        }
    }

    /**
     * Service actif, publié (date de publication atteinte si définie), et avant la date limite des demandes.
     */
    public function acceptsNewRequestsFromClients(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->published_at !== null && now()->lt($this->published_at)) {
            return false;
        }

        $deadline = $this->request_deadline_at;

        return $deadline === null || now()->lte($deadline);
    }

    /**
     * Filtre pour la liste publique / client : actif, publié, et échéance des demandes non dépassée.
     */
    public function scopeOpenForClientRequests(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(function (Builder $q) {
                $q->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            })
            ->where(function (Builder $q) {
                $q->whereNull('request_deadline_at')
                    ->orWhere('request_deadline_at', '>=', now());
            });
    }

    /**
     * Get the fields for the service.
     */
    public function fields()
    {
        return $this->hasMany(ServiceField::class)->orderBy('order');
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }
}
