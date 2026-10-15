<?php

namespace App\Events;

use App\Http\Resources\AlertResource;
use App\Models\Alert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AlertCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Alert $alert) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('argos.alerts'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'AlertCreated';
    }

    public function broadcastWith(): array
    {
        return (new AlertResource($this->alert->loadMissing('device')))->resolve();
    }
}
