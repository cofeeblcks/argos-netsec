<?php

namespace App\Http\Controllers\API\Ingest;

use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;

class BaselineController extends Controller
{
    use ApiResponse;

    public function devices(): JsonResponse
    {
        $devices = Device::query()
            ->orderBy('mac')
            ->get(['id', 'mac', 'ip', 'hostname', 'authorized', 'last_seen']);

        return $this->successResponse(
            $devices->map(fn ($d) => [
                'id' => $d->id,
                'mac' => $d->mac,
                'ip' => $d->ip,
                'hostname' => $d->hostname,
                'authorized' => $d->authorized,
                'lastSeen' => $d->last_seen?->toIso8601String(),
            ])->all(),
            MessageHelper::make('dispositivos', 'index')
        );
    }

    /** Touch sensor last_seen via AuthenticateSensor middleware (no payload). */
    public function heartbeat(): JsonResponse
    {
        $sensor = request()->attributes->get('sensor');

        return $this->successResponse([
            'sensor' => $sensor?->name,
            'kind' => $sensor?->kind,
            'lastSeenAt' => $sensor?->last_seen_at?->toIso8601String(),
        ], 'Latido de sensor registrado');
    }
}
