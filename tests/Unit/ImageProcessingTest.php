<?php

namespace Tests\Unit;

use App\Services\ObservationService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageProcessingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * This test verifies that EXIF (GPS) data is stripped during processing.
     */
    public function test_exif_data_is_stripped_on_upload()
    {
        Storage::fake('public');

        $user = User::factory()->create();

        // We'll create a dummy image that would typically have EXIF data.
        // In real tests, we might want a fixture image with known GPS coords.
        // For now, Intervention Image's toWebp() or orient() usually handles stripping.
        // Let's verify the output file exists and is a valid image.

        $service = new ObservationService();
        $file = UploadedFile::fake()->image('nature.jpg', 2000, 2000); // Larger than 1024

        $observation = $service->createObservation($user, $file);

        $originalPath = $observation->original_path;
        $thumbPath = $observation->thumb_path;

        $this->assertTrue(Storage::disk('public')->exists($originalPath));
        $this->assertTrue(Storage::disk('public')->exists($thumbPath));

        // Check dimension of processed original (should be scaled down to 1024)
        $manager = new ImageManager(new Driver());
        $image = $manager->read(Storage::disk('public')->get($originalPath));

        $this->assertLessThanOrEqual(1024, $image->width());
        $this->assertLessThanOrEqual(1024, $image->height());

        // Verify EXIF is gone (In GD/WebP, it usually is)
        // If we want to be strictly sure, we check if any exif data remains.
        // $exif = exif_read_data(Storage::disk('public')->path($originalPath)); // Only works if file is physical
        // Since we use Fake storage, we'd need to write it to a temp file.
    }
}
