<?php

namespace App\Http\Requests;

use App\Rules\ImageMagicBytes;
use Illuminate\Foundation\Http\FormRequest;

class StoreObservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $owner = $this->input('upload_owner_id');

        return $owner === null || ((is_int($owner) || is_string($owner)) && (string) $owner === (string) $this->user()?->id);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'upload_id' => ['nullable', 'uuid'],
            'upload_owner_id' => ['required_with:upload_id', 'integer'],
            'image' => [
                'required',
                'image',
                'max:10240', // 10MB
                'mimes:jpeg,png,webp,gif',
                new ImageMagicBytes,
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
