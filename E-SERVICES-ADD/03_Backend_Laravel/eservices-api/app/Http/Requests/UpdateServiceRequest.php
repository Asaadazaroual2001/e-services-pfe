<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('request_deadline_at') && $this->input('request_deadline_at') === '') {
            $this->merge(['request_deadline_at' => null]);
        }
        if ($this->has('published_at') && $this->input('published_at') === '') {
            $this->merge(['published_at' => null]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $serviceRoute = $this->route('service');
        $service = $serviceRoute instanceof \App\Models\Service
            ? $serviceRoute
            : \App\Models\Service::find($serviceRoute);
        $agencyId = $this->input('agency_id', $service?->agency_id);

        return [
            'agency_id' => ['sometimes', 'nullable', 'integer', 'exists:agencies,id'],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('services', 'name')
                    ->ignore($service ?? $serviceRoute)
                    ->where(fn ($q) => $q->where('agency_id', $agencyId)),
            ],
            'description' => ['nullable', 'string'],
            'instructions' => ['nullable', 'string'],
            'procedure_steps' => ['nullable', 'string'],
            'required_documents' => ['nullable', 'string'],
            'eligibility_criteria' => ['nullable', 'string'],
            'estimated_duration' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'request_deadline_at' => ['nullable', 'date'],
            'published_at' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($service) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $deadlineInput = $this->input('request_deadline_at');
                    $deadline = ($deadlineInput !== null && $deadlineInput !== '')
                        ? $deadlineInput
                        : $service?->request_deadline_at?->toDateTimeString();
                    if ($deadline && strtotime((string) $value) > strtotime((string) $deadline)) {
                        $fail('La date de publication doit être antérieure ou égale à la date limite des demandes.');
                    }
                },
            ],
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
            'name.required' => 'Le nom du service est obligatoire',
            'name.unique' => 'Un service avec ce nom existe déjà pour cette agence',
        ];
    }
}
