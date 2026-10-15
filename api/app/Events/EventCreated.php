<?php

namespace App\Events;

use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EventCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Event $event) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('argos.events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'EventCreated';
    }

    public function broadcastWith(): array
    {
        return (new EventResource($this->event->loadMissing('device')))->resolve();
    }
}
