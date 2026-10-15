<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Device */
class DeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mac' => $this->mac,
            'ip' => $this->ip,
            'hostname' => $this->hostname,
            'vendor' => $this->vendor,
            'osGuess' => $this->os_guess,
            'authorized' => $this->authorized,
            'firstSeen' => $this->first_seen?->toIso8601String(),
            'lastSeen' => $this->last_seen?->toIso8601String(),
            'risk' => $this->risk,
        ];
    }
}
