<?php

namespace App\Actions\Ingest;

use App\Models\Device;
use App\Models\Service;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class StoreScan
{
    /**
     * @param  array{devices: list<array<string, mixed>>, services: list<array<string, mixed>>}  $payload
     * @return array{devices: int, services: int}
     */
    public function execute(array $payload): array
    {
        $deviceCount = 0;
        $serviceCount = 0;

        DB::transaction(function () use ($payload, &$deviceCount, &$serviceCount) {
            foreach ($payload['devices'] as $item) {
                $mac = strtoupper($item['mac']);
                $now = isset($item['lastSeen']) ? Carbon::parse($item['lastSeen']) : now();
                $first = isset($item['firstSeen']) ? Carbon::parse($item['firstSeen']) : $now;

                $device = Device::query()->firstOrNew(['mac' => $mac]);
                if (! $device->exists) {
                    $device->first_seen = $first;
                    $device->authorized = (bool) ($item['authorized'] ?? false);
                }
                $device->fill([
                    'ip' => $item['ip'],
                    'hostname' => $item['hostname'] ?? null,
                    'vendor' => $item['vendor'] ?? null,
                    'os_guess' => $item['osGuess'] ?? null,
                    'last_seen' => $now,
                    'risk' => $item['risk'] ?? $device->risk ?? 'unknown',
                ]);
                $device->save();
                $deviceCount++;
            }

            foreach ($payload['services'] as $item) {
                $mac = strtoupper($item['deviceMac']);
                $device = Device::query()->where('mac', $mac)->first();

                if (! $device) {
                    continue;
                }

                Service::query()->updateOrCreate(
                    [
                        'device_id' => $device->id,
                        'port' => $item['port'],
                        'protocol' => $item['protocol'],
                    ],
                    [
                        'name' => $item['name'] ?? null,
                        'version' => $item['version'] ?? null,
                        'cve_ids' => $item['cveIds'] ?? [],
                        'severity' => $item['severity'] ?? 'unknown',
                        'last_seen' => isset($item['lastSeen']) ? Carbon::parse($item['lastSeen']) : now(),
                    ]
                );
                $serviceCount++;
            }
        });

        return ['devices' => $deviceCount, 'services' => $serviceCount];
    }
}
