<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEdgeFirstObservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:100'],
            'summary' => ['nullable', 'string', 'max:500'],
            'kid_friendly' => ['nullable', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in(array_column(config('categories'), 'id'))],
            'confidence' => ['nullable', 'numeric', 'between:0,1'],
            'ai_json' => ['required', 'array'],
            'client_ref' => ['nullable', 'string', 'max:64'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
