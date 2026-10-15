<?php

use App\Jobs\SendAlertTelegramJob;
use App\Models\Sensor;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;

test('sensor can ingest a high severity alert', function () {
    Queue::fake();

    Sensor::query()->create([
        'name' => 'ids-test',
        'kind' => 'ids',
        'token_hash' => Hash::make('ids-test-token'),
    ]);

    $response = $this->withToken('ids-test-token')->postJson('/api/v1/ingest/alerts', [
        'alerts' => [
            [
                'occurredAt' => now()->toIso8601String(),
                'rule' => 'argos.arp_spoof',
                'severity' => 'high',
                'srcIp' => '192.168.1.50',
                'dstIp' => '192.168.1.1',
                'raw' => ['demo' => true],
                'status' => 'open',
            ],
        ],
    ]);

    $response->assertAccepted()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.alerts', 1);

    $this->assertDatabaseHas('alerts', [
        'rule' => 'argos.arp_spoof',
        'severity' => 'high',
        'status' => 'open',
    ]);

    Queue::assertPushed(SendAlertTelegramJob::class);
});

test('ingest rejects missing sensor token', function () {
    $response = $this->postJson('/api/v1/ingest/alerts', [
        'alerts' => [
            [
                'rule' => 'x',
                'severity' => 'low',
            ],
        ],
    ]);

    $response->assertUnauthorized();
});
