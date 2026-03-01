<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TtsSynthesizeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // 認証はルートミドルウェア（auth, verified）が担保
    }

    public function rules(): array
    {
        return [
            'text' => 'required|string|max:200',
            'speakingRate' => 'nullable|numeric|min:0.5|max:2.0',
        ];
    }
}
