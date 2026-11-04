<?php

namespace App\Constants;

final class ValidationPatterns
{
    /** Aligns with contracts/schemas/*.schema.json MAC pattern. */
    public const MAC = '/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/';

    public const RISK = ['unknown', 'low', 'medium', 'high', 'critical'];

    public const SEVERITY = ['unknown', 'low', 'medium', 'high', 'critical'];

    public const ALERT_SEVERITY = ['low', 'medium', 'high', 'critical'];

    public const EVENT_TYPE = [
        'device_new',
        'device_gone',
        'device_unauthorized',
        'ip_duplicate',
        'port_new',
        'sensor_heartbeat',
        'other',
    ];
}
