<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;

class StoreAlertsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alerts' => ['required', 'array', 'min:1'],
            'alerts.*.occurredAt' => ['nullable', 'date'],
            'alerts.*.rule' => ['required', 'string'],
            'alerts.*.severity' => ['required', 'in:low,medium,high,critical'],
            'alerts.*.srcIp' => ['nullable', 'ip'],
            'alerts.*.dstIp' => ['nullable', 'ip'],
            'alerts.*.deviceId' => ['nullable', 'integer'],
            'alerts.*.raw' => ['nullable', 'array'],
            'alerts.*.status' => ['nullable', 'in:open,acked,false_positive'],
        ];
    }

    public function messages(): array
    {
        return [
            'alerts.required' => 'Debes enviar al menos una alerta.',
            'alerts.*.severity.in' => 'La severidad no es válida.',
        ];
    }
}
