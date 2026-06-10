<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServiceFieldRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $serviceId = $this->input('service_id');

        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'key' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z_][a-z0-9_]*$/', // snake_case validation
                Rule::unique('service_fields', 'key')->where('service_id', $serviceId),
            ],
            'label' => ['required', 'string', 'max:255'],
            'placeholder' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in(['text', 'number', 'email', 'date', 'select', 'textarea', 'file'])],
            'required' => ['boolean'],
            'description' => ['nullable', 'string'],
            'options_json' => ['nullable', 'array'],
            'options_json.*' => ['string'],
            'order' => ['integer', 'min:0'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'key.required' => 'La clé du champ est obligatoire',
            'key.regex' => 'La clé doit être en snake_case (ex: full_name)',
            'key.unique' => 'Un champ avec cette clé existe déjà pour ce service',
            'label.required' => 'Le libellé du champ est obligatoire',
            'type.required' => 'Le type du champ est obligatoire',
            'type.in' => 'Le type doit être l\'un de: text, number, email, date, select, textarea, file',
        ];
    }
}
