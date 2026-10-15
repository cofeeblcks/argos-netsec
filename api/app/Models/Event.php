<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    protected $fillable = [
        'occurred_at',
        'type',
        'device_id',
        'detail',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'detail' => 'array',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
