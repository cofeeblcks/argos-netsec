<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Event */
class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'occurredAt' => $this->occurred_at?->toIso8601String(),
            'type' => $this->type,
            'deviceId' => $this->device_id,
            'deviceMac' => $this->whenLoaded('device', fn () => $this->device?->mac),
            'detail' => $this->detail ?? [],
        ];
    }
}
