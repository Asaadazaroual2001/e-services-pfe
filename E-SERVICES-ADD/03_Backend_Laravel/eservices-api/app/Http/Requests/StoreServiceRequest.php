<?php

namespace App\Http\Requests;

use App\Models\Agency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServiceRequest extends FormRequest
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
        $agencyId = $this->input('agency_id');

        return [
            'agency_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $agency = Agency::query()->find($value);
                    if (!$agency) {
                        $fail('Agence introuvable.');

                        return;
                    }
                    $user = $this->user();
                    if ($user->hasRole('admin')) {
                        if ($agency->responsable_user_id === null) {
                            $fail('L’agence doit avoir un responsable désigné.');
                        }

                        return;
                    }
                    if ($user->hasRole('responsable')) {
                        if ((int) $agency->responsable_user_id === (int) $user->id) {
                            return;
                        }
                        if ($user->agency_id && (int) $agency->id === (int) $user->agency_id) {
                            return;
                        }
                        $fail('Vous ne pouvez pas créer de service pour cette agence.');

                        return;
                    }
                    $fail('Non autorisé.');
                },
            ],
            'name' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('services', 'name')->where(
                    fn ($q) => $q->where('agency_id', $agencyId)
                ),
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
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $deadline = $this->input('request_deadline_at');
                    if ($deadline && strtotime((string) $value) > strtotime((string) $deadline)) {
                        $fail('La date de publication doit être antérieure ou égale à la date limite des demandes.');
                    }
                },
            ],
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.type' => ['required', 'string', 'in:text,number,email,date,textarea,select,file'],
            'fields.*.title' => ['required', 'string', 'max:255'],
            'fields.*.description' => ['nullable', 'string', 'max:1000'],
            'fields.*.required' => ['sometimes', 'boolean'],
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
            'agency_id.required' => 'Choisissez une agence',
            'name.unique' => 'Un service avec ce nom existe déjà pour cette agence',
            'fields.required' => 'Au moins un champ est requis',
            'fields.min' => 'Au moins un champ est requis',
            'fields.*.type.required' => 'Le type du champ est obligatoire',
            'fields.*.type.in' => 'Le type du champ est invalide',
            'fields.*.title.required' => 'Le titre du champ est obligatoire',
        ];
    }
}
