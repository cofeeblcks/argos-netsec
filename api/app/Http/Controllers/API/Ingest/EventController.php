<?php

namespace App\Http\Controllers\API\Ingest;

use App\Actions\Ingest\StoreEvents;
use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ingest\StoreEventsRequest;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Throwable;

class EventController extends Controller
{
    use ApiResponse;

    public function store(StoreEventsRequest $request, StoreEvents $action): JsonResponse
    {
        try {
            $result = $action->execute($request->validated());

            return $this->successResponse(
                $result,
                MessageHelper::make('eventos', 'accepted'),
                [],
                ApiStatuses::STATUS_ACCEPTED
            );
        } catch (Throwable $e) {
            return $this->errorResponse(ErrorMessages::SERVER_ERROR, ApiStatuses::STATUS_INTERNAL_SERVER_ERROR, $e);
        }
    }
}
