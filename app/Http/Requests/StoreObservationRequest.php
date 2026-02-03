<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreObservationRequest extends FormRequest
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
            'image' => [
                'required',
                'image',
                'max:10240', // 10MB
                'mimes:jpeg,png,webp,gif',
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'image.required' => '画像を選択してください。',
            'image.image' => '有効な画像ファイルを選択してください。',
            'image.max' => '画像サイズは10MB以下にしてください。',
            'image.mimes' => 'JPEG、PNG、WebP、GIF形式の画像を選択してください。',
        ];
    }
}
