<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;

class StoreScanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // present|array: empty lists are valid (discovery often has services: [])
            'devices' => ['present', 'array'],
            'devices.*.mac' => ['required', 'string'],
            'devices.*.ip' => ['required', 'ip'],
            'devices.*.hostname' => ['nullable', 'string'],
            'devices.*.vendor' => ['nullable', 'string'],
            'devices.*.osGuess' => ['nullable', 'string'],
            'devices.*.authorized' => ['sometimes', 'boolean'],
            'devices.*.firstSeen' => ['nullable', 'date'],
            'devices.*.lastSeen' => ['nullable', 'date'],
            'devices.*.risk' => ['nullable', 'string'],
            'services' => ['present', 'array'],
            'services.*.deviceMac' => ['required', 'string'],
            'services.*.port' => ['required', 'integer', 'min:1', 'max:65535'],
            'services.*.protocol' => ['required', 'in:tcp,udp'],
            'services.*.name' => ['nullable', 'string'],
            'services.*.version' => ['nullable', 'string'],
            'services.*.cveIds' => ['nullable', 'array'],
            'services.*.severity' => ['nullable', 'string'],
            'services.*.lastSeen' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'devices.present' => 'Debes enviar el arreglo de dispositivos (puede estar vacío).',
            'services.present' => 'Debes enviar el arreglo de servicios (puede estar vacío).',
        ];
    }
}
