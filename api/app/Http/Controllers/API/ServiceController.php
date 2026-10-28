<?php

namespace App\Http\Controllers\API;

use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginator = Service::query()
            ->with('device')
            ->when($request->filled('device_id'), fn ($q) => $q->where('device_id', $request->integer('device_id')))
            ->when($request->filled('device_ids'), function ($q) use ($request) {
                $ids = collect(explode(',', (string) $request->input('device_ids')))
                    ->map(fn ($id) => (int) trim((string) $id))
                    ->filter(fn (int $id) => $id > 0)
                    ->unique()
                    ->values()
                    ->all();
                if ($ids !== []) {
                    $q->whereIn('device_id', $ids);
                }
            })
            ->orderByDesc('last_seen')
            ->paginate((int) $request->integer('per_page', 50));

        return $this->successResponse(
            ServiceResource::collection($paginator->items()),
            MessageHelper::make('servicios', 'index'),
            $this->paginationMeta($paginator)
        );
    }
}
