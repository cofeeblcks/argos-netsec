<?php

namespace App\Http\Requests\Alerts;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAlertStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:acked,false_positive'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'El estado es obligatorio.',
            'status.in' => 'El estado debe ser acked o false_positive.',
        ];
    }
}
