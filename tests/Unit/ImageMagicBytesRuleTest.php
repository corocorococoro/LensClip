<?php

namespace Tests\Unit;

use App\Rules\ImageMagicBytes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ImageMagicBytesRuleTest extends TestCase
{
    /**
     * @var array<int, string>
     */
    private array $temporaryFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }

        parent::tearDown();
    }

    public function test_supported_image_signatures_pass_validation(): void
    {
        $files = [
            $this->createUploadedFile('valid.jpg', "\xFF\xD8\xFF\xE0".'test'),
            $this->createUploadedFile('valid.png', "\x89PNG\x0D\x0A\x1A\x0A".'test'),
            $this->createUploadedFile('valid.gif', 'GIF89a'.'test'),
            $this->createUploadedFile('valid.webp', 'RIFF1234WEBP'),
        ];

        foreach ($files as $file) {
            $validator = Validator::make(
                ['image' => $file],
                ['image' => [new ImageMagicBytes]]
            );

            $this->assertTrue($validator->passes(), implode(', ', $validator->errors()->all()));
        }
    }

    public function test_invalid_signature_fails_validation(): void
    {
        $file = $this->createUploadedFile('spoofed.jpg', 'NOT_AN_IMAGE');

        $validator = Validator::make(
            ['image' => $file],
            ['image' => [new ImageMagicBytes]]
        );

        $this->assertFalse($validator->passes());
        $this->assertArrayHasKey('image', $validator->errors()->toArray());
    }

    private function createUploadedFile(string $filename, string $binaryContent): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'magic_');
        if (! is_string($path)) {
            $this->fail('Failed to create temporary file for test.');
        }

        file_put_contents($path, $binaryContent);
        $this->temporaryFiles[] = $path;

        return new UploadedFile(
            $path,
            $filename,
            null,
            null,
            true
        );
    }
}
