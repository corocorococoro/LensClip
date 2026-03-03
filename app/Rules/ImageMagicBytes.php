<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class ImageMagicBytes implements ValidationRule
{
    /**
     * Validate supported image signatures (JPEG, PNG, GIF, WebP).
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile) {
            $fail('有効な画像ファイルを選択してください。');

            return;
        }

        $path = $value->getRealPath();
        if (! $path) {
            $fail('画像ファイルの読み取りに失敗しました。');

            return;
        }

        $handle = @fopen($path, 'rb');
        if (! $handle) {
            $fail('画像ファイルの読み取りに失敗しました。');

            return;
        }

        $header = fread($handle, 12);
        fclose($handle);

        if (! is_string($header) || ! $this->hasSupportedSignature($header)) {
            $fail('画像フォーマットを確認できませんでした。JPEG/PNG/WebP/GIF を使用してください。');
        }
    }

    /**
     * Check if binary header matches one of supported image signatures.
     */
    private function hasSupportedSignature(string $header): bool
    {
        $isJpeg = str_starts_with($header, "\xFF\xD8\xFF");
        $isPng = str_starts_with($header, "\x89PNG\x0D\x0A\x1A\x0A");
        $isGif = str_starts_with($header, 'GIF87a') || str_starts_with($header, 'GIF89a');
        $isWebp = str_starts_with($header, 'RIFF') && substr($header, 8, 4) === 'WEBP';

        return $isJpeg || $isPng || $isGif || $isWebp;
    }
}
