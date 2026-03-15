<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ObservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageProcessingTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploaded_original_is_stored_raw_locally_and_thumb_is_webp(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $service = new ObservationService;
        $file = UploadedFile::fake()->image('nature.jpg', 2000, 2000);

        $observation = $service->createObservation($user, $file);

        $this->assertStringStartsWith('local:observations/', (string) $observation->original_path);
        $this->assertStringEndsWith('.webp', (string) $observation->original_path);
        $this->assertStringStartsWith('local:observations/', (string) $observation->thumb_path);
        $this->assertStringEndsWith('_thumb.webp', (string) $observation->thumb_path);

        $originalLocalPath = substr((string) $observation->original_path, 6);
        $thumbLocalPath = substr((string) $observation->thumb_path, 6);

        Storage::disk('local')->assertExists($originalLocalPath);
        Storage::disk('local')->assertExists($thumbLocalPath);

        $this->assertSame(file_get_contents($file->getPathname()), Storage::disk('local')->get($originalLocalPath));
        $this->assertStringStartsWith('RIFF', Storage::disk('local')->get($thumbLocalPath));
    }
}
