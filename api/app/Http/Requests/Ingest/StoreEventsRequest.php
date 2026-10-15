<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'events' => ['required', 'array', 'min:1'],
            'events.*.occurredAt' => ['nullable', 'date'],
            'events.*.type' => ['required', 'string'],
            'events.*.deviceId' => ['nullable', 'integer'],
            'events.*.deviceMac' => ['nullable', 'string'],
            'events.*.detail' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'events.required' => 'Debes enviar al menos un evento.',
        ];
    }
}
