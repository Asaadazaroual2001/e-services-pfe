<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceField extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'service_id',
        'key',
        'label',
        'placeholder',
        'type',
        'required',
        'description',
        'options_json',
        'order',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'options_json' => 'array',
        ];
    }

    /**
     * Get the service that owns the field.
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }
}
