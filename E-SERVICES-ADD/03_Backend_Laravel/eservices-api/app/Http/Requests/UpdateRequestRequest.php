<?php

namespace App\Http\Requests;

use App\Models\Request;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => ['sometimes', 'integer', 'exists:services,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'is_active' => ['boolean'],
            'current_status' => [
                'sometimes',
                'string',
                Rule::in([
                    Request::STATUS_DRAFT,
                    Request::STATUS_SUBMITTED,
                    Request::STATUS_IN_REVIEW,
                    Request::STATUS_NEEDS_INFO,
                    Request::STATUS_APPROVED,
                    Request::STATUS_REJECTED,
                    Request::STATUS_CLOSED,
                ]),
            ],
        ];
    }
}
