<?php

namespace App\Http\Requests;

use App\Rules\ImageMagicBytes;
use Illuminate\Foundation\Http\FormRequest;

class UploadEdgeFirstMediaRequest extends FormRequest
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
                'max:10240',
                'mimes:jpeg,png,webp,gif',
                new ImageMagicBytes,
            ],
        ];
    }
}
