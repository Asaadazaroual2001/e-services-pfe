<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClientRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'service_id' => ['required', 'exists:services,id'],
            'values' => ['required', 'array', 'min:1'],
            'values.*.field_id' => ['required', 'exists:service_fields,id'],
            'values.*.value' => ['required'],
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'service_id.required' => 'Le service est obligatoire.',
            'service_id.exists' => 'Le service sélectionné n\'existe pas.',
            'values.required' => 'Au moins un champ doit être rempli.',
            'values.*.field_id.required' => 'L\'ID du champ est obligatoire.',
            'values.*.field_id.exists' => 'Le champ sélectionné n\'existe pas.',
            'values.*.value.required' => 'La valeur du champ est obligatoire.',
        ];
    }
}
