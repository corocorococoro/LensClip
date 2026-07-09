<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class GeminiModelName implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match('/^gemini-[a-z0-9][a-z0-9._-]{0,127}$/', $value)) {
            $fail('Geminiモデル名は gemini- で始まる英数字・ドット・ハイフン・アンダースコアのみ指定できます。');
        }
    }
}
