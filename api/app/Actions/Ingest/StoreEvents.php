<?php

namespace App\Actions\Ingest;

use App\Events\EventCreated;
use App\Models\Device;
use App\Models\Event;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class StoreEvents
{
    /**
     * @param  array{events: list<array<string, mixed>>}  $payload
     * @return array{events: int}
     */
    public function execute(array $payload): array
    {
        $count = 0;

        DB::transaction(function () use ($payload, &$count) {
            foreach ($payload['events'] as $item) {
                $deviceId = $item['deviceId'] ?? null;

                if (! $deviceId && ! empty($item['deviceMac'])) {
                    $deviceId = Device::query()->where('mac', strtoupper($item['deviceMac']))->value('id');
                }

                $event = Event::query()->create([
                    'occurred_at' => isset($item['occurredAt']) ? Carbon::parse($item['occurredAt']) : now(),
                    'type' => $item['type'],
                    'device_id' => $deviceId,
                    'detail' => $item['detail'] ?? [],
                ]);

                EventCreated::dispatch($event);
                $count++;
            }
        });

        return ['events' => $count];
    }
}
