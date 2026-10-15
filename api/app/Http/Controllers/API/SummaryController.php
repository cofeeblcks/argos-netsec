<?php

namespace App\Http\Controllers\API;

use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Device;
use App\Models\Event;
use App\Models\Sensor;
use App\Models\Service;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class SummaryController extends Controller
{
    use ApiResponse;

    public function show(): JsonResponse
    {
        $riskOrder = ['unknown' => 0, 'low' => 1, 'medium' => 2, 'high' => 3, 'critical' => 4];
        $devices = Device::query()->get(['id', 'risk', 'authorized', 'os_guess', 'last_seen']);
        $avg = 'unknown';

        if ($devices->isNotEmpty()) {
            $score = (int) round($devices->avg(fn ($d) => $riskOrder[$d->risk] ?? 0));
            $avg = array_search($score, $riskOrder, true) ?: 'unknown';
        }

        $openAlerts = Alert::query()->where('status', 'open')->get(['severity']);
        $alertsBySeverity = [
            'low' => $openAlerts->where('severity', 'low')->count(),
            'medium' => $openAlerts->where('severity', 'medium')->count(),
            'high' => $openAlerts->where('severity', 'high')->count(),
            'critical' => $openAlerts->where('severity', 'critical')->count(),
        ];

        $services = Service::query()->get(['port', 'protocol', 'severity', 'cve_ids', 'name']);
        $cveIds = [];
        foreach ($services as $service) {
            foreach ($service->cve_ids ?? [] as $cve) {
                if (is_string($cve) && $cve !== '') {
                    $cveIds[$cve] = true;
                }
            }
        }

        $riskBreakdown = [
            'unknown' => $devices->where('risk', 'unknown')->count(),
            'low' => $devices->where('risk', 'low')->count(),
            'medium' => $devices->where('risk', 'medium')->count(),
            'high' => $devices->where('risk', 'high')->count(),
            'critical' => $devices->where('risk', 'critical')->count(),
        ];

        $sensorStaleAfter = Carbon::now()->subMinutes(15);
        $sensors = Sensor::query()->get(['name', 'kind', 'last_seen_at']);
        $sensorsPayload = $sensors->map(fn ($s) => [
            'name' => $s->name,
            'kind' => $s->kind,
            'lastSeenAt' => $s->last_seen_at?->toIso8601String(),
            'online' => $s->last_seen_at !== null && $s->last_seen_at->greaterThan($sensorStaleAfter),
        ]);

        $seenRecently = $devices->filter(
            fn ($d) => $d->last_seen !== null && $d->last_seen->greaterThan(Carbon::now()->subHours(24))
        )->count();

        $topPorts = $services
            ->groupBy(fn ($s) => $s->port.'/'.$s->protocol)
            ->map(fn ($group, $key) => [
                'port' => (int) explode('/', (string) $key)[0],
                'protocol' => explode('/', (string) $key)[1] ?? 'tcp',
                'count' => $group->count(),
                'name' => $group->first()?->name,
            ])
            ->sortByDesc('count')
            ->take(5)
            ->values()
            ->all();

        return $this->successResponse([
            'devicesTotal' => $devices->count(),
            'devicesAuthorized' => $devices->where('authorized', true)->count(),
            'devicesUnauthorized' => $devices->where('authorized', false)->count(),
            'devicesWithOs' => $devices->filter(fn ($d) => filled($d->os_guess))->count(),
            'devicesSeen24h' => $seenRecently,
            'openPorts' => $services->count(),
            'servicesHighSeverity' => $services->whereIn('severity', ['high', 'critical'])->count(),
            'cveUnique' => count($cveIds),
            'alertsOpen' => $openAlerts->count(),
            'alertsHighCritical' => $alertsBySeverity['high'] + $alertsBySeverity['critical'],
            'alertsBySeverity' => $alertsBySeverity,
            'events24h' => Event::query()->where('occurred_at', '>=', Carbon::now()->subDay())->count(),
            'riskAverage' => $avg,
            'riskBreakdown' => $riskBreakdown,
            'sensorsOnline' => $sensorsPayload->where('online', true)->count(),
            'sensorsTotal' => $sensors->count(),
            'sensors' => $sensorsPayload,
            'topPorts' => $topPorts,
        ], MessageHelper::make('resumen', 'show'));
    }
}
