<?php

namespace App\Http\Requests\Ingest;

use App\Constants\ValidationPatterns;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAlertsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alerts' => ['required', 'array', 'min:1', 'max:500'],
            'alerts.*.occurredAt' => ['nullable', 'date'],
            'alerts.*.rule' => ['required', 'string', 'max:255'],
            'alerts.*.severity' => ['required', 'string', Rule::in(ValidationPatterns::ALERT_SEVERITY)],
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
