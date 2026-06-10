<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'cin',
        'password',
        'role',
        'agency_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(\App\Models\Role::class, 'role_user');
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('name', $roles)->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn($q) => $q->where('name', $permission))
            ->exists();
    }

    /**
     * Synchroniser le rôle principal avec la relation many-to-many
     */
    public function syncPrimaryRole(): void
    {
        $primaryRole = $this->roles()->orderBy('level')->first();
        if ($primaryRole) {
            $this->update(['role' => $primaryRole->name]);
        }
    }

    /**
     * Obtenir le rôle principal depuis la relation ou le champ direct
     */
    public function getPrimaryRole(): ?string
    {
        // Si le champ role est vide, synchroniser depuis la relation
        if (empty($this->role)) {
            $this->syncPrimaryRole();
            $this->refresh();
        }
        return $this->role;
    }
}
