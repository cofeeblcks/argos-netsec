<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Service extends Model
{
    protected $fillable = [
        'device_id',
        'port',
        'protocol',
        'name',
        'version',
        'cve_ids',
        'severity',
        'last_seen',
    ];

    protected function casts(): array
    {
        return [
            'cve_ids' => 'array',
            'last_seen' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
