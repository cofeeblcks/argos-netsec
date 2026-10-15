<?php

namespace App\Http\Requests\Devices;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'authorized' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'authorized.required' => 'Debes indicar si el dispositivo está autorizado.',
        ];
    }
}
