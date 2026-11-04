<?php

namespace App\Http\Requests\Ingest;

use App\Constants\ValidationPatterns;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'devices' => ['present', 'array', 'max:500'],
            'devices.*.mac' => ['required', 'string', 'regex:'.ValidationPatterns::MAC],
            'devices.*.ip' => ['required', 'ip'],
            'devices.*.hostname' => ['nullable', 'string', 'max:255'],
            'devices.*.vendor' => ['nullable', 'string', 'max:255'],
            'devices.*.osGuess' => ['nullable', 'string', 'max:255'],
            'devices.*.authorized' => ['sometimes', 'boolean'],
            'devices.*.firstSeen' => ['nullable', 'date'],
            'devices.*.lastSeen' => ['nullable', 'date'],
            'devices.*.risk' => ['nullable', 'string', Rule::in(ValidationPatterns::RISK)],
            'services' => ['present', 'array', 'max:2000'],
            'services.*.deviceMac' => ['required', 'string', 'regex:'.ValidationPatterns::MAC],
            'services.*.port' => ['required', 'integer', 'min:1', 'max:65535'],
            'services.*.protocol' => ['required', 'in:tcp,udp'],
            'services.*.name' => ['nullable', 'string', 'max:128'],
            'services.*.version' => ['nullable', 'string', 'max:255'],
            'services.*.cveIds' => ['nullable', 'array', 'max:100'],
            'services.*.cveIds.*' => ['string', 'max:64'],
            'services.*.severity' => ['nullable', 'string', Rule::in(ValidationPatterns::SEVERITY)],
            'services.*.lastSeen' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'devices.present' => 'Debes enviar el arreglo de dispositivos (puede estar vacío).',
            'services.present' => 'Debes enviar el arreglo de servicios (puede estar vacío).',
            'devices.*.mac.regex' => 'La MAC del dispositivo no es válida.',
            'services.*.deviceMac.regex' => 'La MAC del servicio no es válida.',
        ];
    }
}
