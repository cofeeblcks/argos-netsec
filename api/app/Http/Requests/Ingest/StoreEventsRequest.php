<?php

namespace App\Http\Requests\Ingest;

use App\Constants\ValidationPatterns;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'events' => ['required', 'array', 'min:1', 'max:500'],
            'events.*.occurredAt' => ['nullable', 'date'],
            'events.*.type' => ['required', 'string', Rule::in(ValidationPatterns::EVENT_TYPE)],
            'events.*.deviceId' => ['nullable', 'integer'],
            'events.*.deviceMac' => ['nullable', 'string', 'regex:'.ValidationPatterns::MAC],
            'events.*.detail' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'events.required' => 'Debes enviar al menos un evento.',
            'events.*.type.in' => 'El tipo de evento no es válido.',
            'events.*.deviceMac.regex' => 'La MAC del evento no es válida.',
        ];
    }
}
