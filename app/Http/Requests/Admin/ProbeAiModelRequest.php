<?php

namespace App\Http\Requests\Admin;

use App\Rules\GeminiModelName;
use Illuminate\Foundation\Http\FormRequest;

class ProbeAiModelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'model' => is_string($this->input('model')) ? trim($this->input('model')) : $this->input('model'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'model' => ['bail', 'required', 'string', new GeminiModelName],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'model.required' => 'モデル名を入力してください。',
        ];
    }
}
