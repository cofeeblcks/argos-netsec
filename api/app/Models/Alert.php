<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $fillable = [
        'occurred_at',
        'rule',
        'severity',
        'src_ip',
        'dst_ip',
        'device_id',
        'raw',
        'status',
        'telegram_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'telegram_sent_at' => 'datetime',
            'raw' => 'array',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function shouldNotifyTelegram(): bool
    {
        return in_array($this->severity, ['high', 'critical'], true);
    }
}
