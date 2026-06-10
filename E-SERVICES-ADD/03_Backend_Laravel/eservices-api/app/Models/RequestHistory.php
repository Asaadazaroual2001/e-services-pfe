<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'actor_id',
        'action',
        'from_status',
        'to_status',
        'comment',
    ];

    /**
     * Get the request
     */
    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    /**
     * Get the actor (user who performed the action)
     */
    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
