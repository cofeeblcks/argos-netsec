<?php

namespace App\Actions\Ingest;

use App\Events\AlertCreated;
use App\Jobs\SendAlertTelegramJob;
use App\Models\Alert;
use App\Models\Device;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class StoreAlerts
{
    /**
     * @param  array{alerts: list<array<string, mixed>>}  $payload
     * @return array{alerts: int}
     */
    public function execute(array $payload): array
    {
        $count = 0;

        DB::transaction(function () use ($payload, &$count) {
            foreach ($payload['alerts'] as $item) {
                $deviceId = $item['deviceId'] ?? null;

                if (! $deviceId) {
                    $ip = $item['srcIp'] ?? $item['dstIp'] ?? null;
                    if ($ip) {
                        $deviceId = Device::query()->where('ip', $ip)->value('id');
                    }
                }

                $alert = Alert::query()->create([
                    'occurred_at' => isset($item['occurredAt']) ? Carbon::parse($item['occurredAt']) : now(),
                    'rule' => $item['rule'],
                    'severity' => $item['severity'],
                    'src_ip' => $item['srcIp'] ?? null,
                    'dst_ip' => $item['dstIp'] ?? null,
                    'device_id' => $deviceId,
                    'raw' => $item['raw'] ?? [],
                    'status' => $item['status'] ?? 'open',
                ]);

                AlertCreated::dispatch($alert);

                if ($alert->shouldNotifyTelegram()) {
                    SendAlertTelegramJob::dispatch($alert->id);
                }

                $count++;
            }
        });

        return ['alerts' => $count];
    }
}
