<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Alert */
class AlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'occurredAt' => $this->occurred_at?->toIso8601String(),
            'rule' => $this->rule,
            'severity' => $this->severity,
            'srcIp' => $this->src_ip,
            'dstIp' => $this->dst_ip,
            'deviceId' => $this->device_id,
            'raw' => $this->raw ?? [],
            'status' => $this->status,
        ];
    }
}
