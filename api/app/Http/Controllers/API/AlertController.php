<?php

namespace App\Http\Controllers\API;

use App\Actions\Alerts\UpdateAlertStatus;
use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Alerts\UpdateAlertStatusRequest;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AlertController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginator = Alert::query()
            ->with('device')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->orderByDesc('occurred_at')
            ->paginate((int) $request->integer('per_page', 50));

        return $this->successResponse(
            AlertResource::collection($paginator->items()),
            MessageHelper::make('alertas', 'index'),
            $this->paginationMeta($paginator)
        );
    }

    public function update(UpdateAlertStatusRequest $request, Alert $alert, UpdateAlertStatus $action): JsonResponse
    {
        try {
            $alert = $action->execute($alert, $request->string('status')->toString());

            return $this->successResponse(
                new AlertResource($alert),
                MessageHelper::make('alerta', 'update')
            );
        } catch (Throwable $e) {
            return $this->errorResponse(ErrorMessages::SERVER_ERROR, ApiStatuses::STATUS_INTERNAL_SERVER_ERROR, $e);
        }
    }
}
