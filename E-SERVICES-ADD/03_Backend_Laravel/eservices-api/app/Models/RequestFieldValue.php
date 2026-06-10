<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestFieldValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'service_field_id',
        'value_text',
        'value_json',
    ];

    protected function casts(): array
    {
        return [
            'value_json' => 'array',
        ];
    }

    /**
     * Get the request
     */
    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    /**
     * Get the service field
     */
    public function serviceField()
    {
        return $this->belongsTo(ServiceField::class);
    }
}
