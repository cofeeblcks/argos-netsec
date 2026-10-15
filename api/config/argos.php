<?php

return [
    'telegram_dedupe_minutes' => (int) env('TELEGRAM_DEDUPE_MINUTES', 15),
    'telegram_min_severity' => env('TELEGRAM_MIN_SEVERITY', 'high'),
    'alert_retention_days' => (int) env('ARGOS_ALERT_RETENTION_DAYS', 30),
];
