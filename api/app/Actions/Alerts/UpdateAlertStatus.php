<?php

namespace App\Actions\Alerts;

use App\Models\Alert;
use InvalidArgumentException;

final class UpdateAlertStatus
{
    public function execute(Alert $alert, string $status): Alert
    {
        if (! in_array($status, ['acked', 'false_positive'], true)) {
            throw new InvalidArgumentException('Estado de alerta inválido');
        }

        $alert->forceFill(['status' => $status])->save();

        return $alert->fresh();
    }
}
