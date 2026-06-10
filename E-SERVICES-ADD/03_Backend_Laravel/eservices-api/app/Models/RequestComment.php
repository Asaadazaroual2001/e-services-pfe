<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'user_id',
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
     * Get the author
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
