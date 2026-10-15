<?php

namespace App\Http\Controllers\API\Ingest;

use App\Actions\Ingest\StoreScan;
use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ingest\StoreScanRequest;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Throwable;

class ScanController extends Controller
{
    use ApiResponse;

    public function store(StoreScanRequest $request, StoreScan $action): JsonResponse
    {
        try {
            $result = $action->execute($request->validated());

            return $this->successResponse(
                $result,
                MessageHelper::make('escaneo', 'accepted'),
                [],
                ApiStatuses::STATUS_ACCEPTED
            );
        } catch (Throwable $e) {
            return $this->errorResponse(ErrorMessages::SERVER_ERROR, ApiStatuses::STATUS_INTERNAL_SERVER_ERROR, $e);
        }
    }
}
