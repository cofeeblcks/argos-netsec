<?php

namespace App\Actions\Devices;

use App\Models\Device;

final class AuthorizeDevice
{
    public function execute(Device $device, bool $authorized): Device
    {
        $device->forceFill([
            'authorized' => $authorized,
            'risk' => $authorized && $device->risk === 'high' ? 'low' : $device->risk,
        ])->save();

        return $device->fresh();
    }
}
