<?php

namespace App\Services;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ObservationService
{
    /**
     * Create a new observation with image processing.
     */
    public function createObservation(User $user, UploadedFile $file): Observation
    {
        $tempPath = $file->getPathname();

        // Process image
        $manager = new ImageManager(new Driver());
        $image = $manager->read($tempPath);
        $image->orient();

        // Resize for API cost/speed (max 1024px)
        $image->scaleDown(width: 1024);

        // Generate unique filenames
        $hashName = Str::random(40);
        $originalPath = "observations/{$hashName}.webp";
        $thumbPath = "observations/{$hashName}_thumb.webp";

        // Save Original (WebP, strip EXIF by default)
        $encoded = $image->toWebp(quality: 80);
        Storage::disk('public')->put($originalPath, (string) $encoded);

        // Save Thumbnail
        $thumb = clone $image;
        $thumb->scaleDown(width: 300);
        Storage::disk('public')->put($thumbPath, (string) $thumb->toWebp(quality: 70));

        // Create Observation with processing status
        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'processing',
            'original_path' => $originalPath,
            'thumb_path' => $thumbPath,
        ]);

        Log::withContext([
            'observation_id' => $observation->id,
            'user_id' => $user->id,
        ]);

        Log::info('Observation created, dispatching analysis job', [
            'original_path' => $originalPath,
        ]);

        // Dispatch analysis job
        AnalyzeObservationJob::dispatch($observation->id);

        return $observation;
    }

    /**
     * Delete an observation and its associated files.
     */
    public function deleteObservation(Observation $observation): void
    {
        Storage::disk('public')->delete([
            $observation->original_path,
            $observation->cropped_path,
            $observation->thumb_path,
        ]);

        $observation->delete();
    }
}
