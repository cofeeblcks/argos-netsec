<?php

namespace App\Http\Controllers\API;

use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Device;
use App\Models\Sensor;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;

class SummaryController extends Controller
{
    use ApiResponse;

    public function show(): JsonResponse
    {
        $riskOrder = ['unknown' => 0, 'low' => 1, 'medium' => 2, 'high' => 3, 'critical' => 4];
        $devices = Device::query()->get(['risk', 'authorized']);
        $avg = 'unknown';

        if ($devices->isNotEmpty()) {
            $score = (int) round($devices->avg(fn ($d) => $riskOrder[$d->risk] ?? 0));
            $avg = array_search($score, $riskOrder, true) ?: 'unknown';
        }

        $sensors = Sensor::query()->get(['name', 'kind', 'last_seen_at'])->map(fn ($s) => [
            'name' => $s->name,
            'kind' => $s->kind,
            'lastSeenAt' => $s->last_seen_at?->toIso8601String(),
        ]);

        return $this->successResponse([
            'devicesTotal' => $devices->count(),
            'devicesUnauthorized' => $devices->where('authorized', false)->count(),
            'alertsOpen' => Alert::query()->where('status', 'open')->count(),
            'alertsBySeverity' => [
                'low' => Alert::query()->where('status', 'open')->where('severity', 'low')->count(),
                'medium' => Alert::query()->where('status', 'open')->where('severity', 'medium')->count(),
                'high' => Alert::query()->where('status', 'open')->where('severity', 'high')->count(),
                'critical' => Alert::query()->where('status', 'open')->where('severity', 'critical')->count(),
            ],
            'riskAverage' => $avg,
            'sensors' => $sensors,
        ], MessageHelper::make('resumen', 'show'));
    }
}
