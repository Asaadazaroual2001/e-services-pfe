<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'current_status' => ['nullable', 'in:DRAFT,SUBMITTED'],
            'field_values' => ['nullable', 'array'],
            'field_values.*.service_field_id' => ['required', 'integer', 'exists:service_fields,id'],
            'field_values.*.value' => ['nullable'],
        ];
    }
}
