<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    protected $fillable = [
        'mac',
        'ip',
        'hostname',
        'vendor',
        'os_guess',
        'authorized',
        'first_seen',
        'last_seen',
        'risk',
    ];

    protected function casts(): array
    {
        return [
            'authorized' => 'boolean',
            'first_seen' => 'datetime',
            'last_seen' => 'datetime',
        ];
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }
}
