<?php

namespace App\Http\Requests\Admin;

use App\Rules\GeminiModelName;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAiSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'model' => $this->trimString($this->input('model')),
            'allowed_models' => $this->trimAllowedModelRows($this->input('allowed_models')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'model' => ['bail', 'required', 'string', new GeminiModelName],
            'allowed_models' => ['required', 'array', 'min:1', 'max:20'],
            'allowed_models.*.model' => ['bail', 'required', 'string', new GeminiModelName],
            'allowed_models.*.description' => ['nullable', 'string', 'max:160'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'model.required' => 'モデルを選択してください。',
            'allowed_models.required' => '許可モデルを1つ以上登録してください。',
            'allowed_models.min' => '許可モデルを1つ以上登録してください。',
            'allowed_models.*.model.required' => 'モデル名を入力してください。',
            'allowed_models.*.description.max' => '説明は160文字以内で入力してください。',
        ];
    }

    private function trimString(mixed $value): mixed
    {
        return is_string($value) ? trim($value) : $value;
    }

    private function trimAllowedModelRows(mixed $rows): mixed
    {
        if (! is_array($rows)) {
            return $rows;
        }

        return array_map(function (mixed $row): mixed {
            if (! is_array($row)) {
                return $row;
            }

            $row['model'] = $this->trimString($row['model'] ?? null);
            $row['description'] = $this->trimString($row['description'] ?? null);

            return $row;
        }, $rows);
    }
}
