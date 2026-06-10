<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Permission;

class Role extends Model
{
    protected $fillable = ['name'];

    public function users()
    {
        return $this->belongsToMany(\App\Models\User::class, 'role_user');
    }
    public function permissions()
    {
        return $this->belongsToMany(Permission::class);
    }
}
