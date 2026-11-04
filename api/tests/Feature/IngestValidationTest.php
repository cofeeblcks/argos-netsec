<?php

use App\Models\Sensor;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    Sensor::query()->create([
        'name' => 'scanner-test',
        'kind' => 'scanner',
        'token_hash' => Hash::make('scanner-test-token'),
    ]);
});

test('ingest scan rejects invalid mac', function () {
    $response = $this->withToken('scanner-test-token')->postJson('/api/v1/ingest/scan', [
        'devices' => [
            [
                'mac' => 'not-a-mac',
                'ip' => '192.168.1.10',
            ],
        ],
        'services' => [],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['devices.0.mac']);
});

test('ingest scan rejects invalid risk enum', function () {
    $response = $this->withToken('scanner-test-token')->postJson('/api/v1/ingest/scan', [
        'devices' => [
            [
                'mac' => 'AA:BB:CC:DD:EE:01',
                'ip' => '192.168.1.10',
                'risk' => 'extreme',
            ],
        ],
        'services' => [],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['devices.0.risk']);
});

test('ingest events rejects unknown type', function () {
    $response = $this->withToken('scanner-test-token')->postJson('/api/v1/ingest/events', [
        'events' => [
            [
                'type' => 'not_a_real_type',
                'detail' => ['x' => 1],
            ],
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['events.0.type']);
});
