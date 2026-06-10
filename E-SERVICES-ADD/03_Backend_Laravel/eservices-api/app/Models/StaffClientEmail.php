<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffClientEmail extends Model
{
    protected $fillable = [
        'sender_id',
        'recipient_name',
        'recipient_email',
        'recipient_cin',
        'subject',
        'body',
        'request_id',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Request::class, 'request_id');
    }
}
