<?php

namespace App\Http\Controllers\API\Ingest;

use App\Actions\Ingest\StoreAlerts;
use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ingest\StoreAlertsRequest;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Throwable;

class AlertController extends Controller
{
    use ApiResponse;

    public function store(StoreAlertsRequest $request, StoreAlerts $action): JsonResponse
    {
        try {
            $result = $action->execute($request->validated());

            return $this->successResponse(
                $result,
                MessageHelper::make('alertas', 'accepted'),
                [],
                ApiStatuses::STATUS_ACCEPTED
            );
        } catch (Throwable $e) {
            return $this->errorResponse(ErrorMessages::SERVER_ERROR, ApiStatuses::STATUS_INTERNAL_SERVER_ERROR, $e);
        }
    }
}
