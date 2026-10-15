<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Service */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deviceId' => $this->device_id,
            'deviceMac' => $this->whenLoaded('device', fn () => $this->device?->mac),
            'port' => $this->port,
            'protocol' => $this->protocol,
            'name' => $this->name,
            'version' => $this->version,
            'cveIds' => $this->cve_ids ?? [],
            'severity' => $this->severity,
            'lastSeen' => $this->last_seen?->toIso8601String(),
        ];
    }
}
