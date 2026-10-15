<?php

namespace App\Http\Controllers\API;

use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginator = Event::query()
            ->with('device')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('occurred_at')
            ->paginate((int) $request->integer('per_page', 50));

        return $this->successResponse(
            EventResource::collection($paginator->items()),
            MessageHelper::make('eventos', 'index'),
            $this->paginationMeta($paginator)
        );
    }
}
