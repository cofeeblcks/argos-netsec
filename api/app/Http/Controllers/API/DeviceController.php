<?php

namespace App\Http\Controllers\API;

use App\Actions\Devices\AuthorizeDevice;
use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Devices\UpdateDeviceRequest;
use App\Http\Resources\DeviceResource;
use App\Models\Device;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DeviceController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginator = Device::query()
            ->when($request->filled('authorized'), fn ($q) => $q->where('authorized', $request->boolean('authorized')))
            ->orderByDesc('last_seen')
            ->paginate((int) $request->integer('per_page', 50));

        return $this->successResponse(
            DeviceResource::collection($paginator->items()),
            MessageHelper::make('dispositivos', 'index'),
            $this->paginationMeta($paginator)
        );
    }

    public function update(UpdateDeviceRequest $request, Device $device, AuthorizeDevice $action): JsonResponse
    {
        try {
            $device = $action->execute($device, $request->boolean('authorized'));

            return $this->successResponse(
                new DeviceResource($device),
                MessageHelper::make('dispositivo', 'update')
            );
        } catch (Throwable $e) {
            return $this->errorResponse(ErrorMessages::SERVER_ERROR, ApiStatuses::STATUS_INTERNAL_SERVER_ERROR, $e);
        }
    }
}
