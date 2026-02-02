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
    public function createObservation(
        User $user,
        UploadedFile $file,
        ?float $latitude = null,
        ?float $longitude = null
    ): Observation {
        $tempPath = $file->getPathname();

        // Extract GPS from EXIF before processing (WebP will strip EXIF)
        $gps = $this->extractGpsFromExif($tempPath);

        // Use EXIF GPS if available, otherwise fall back to provided coordinates
        // (browsers often strip EXIF for privacy, so we accept coordinates from frontend)
        $finalLatitude = $gps['latitude'] ?? $latitude;
        $finalLongitude = $gps['longitude'] ?? $longitude;

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
            'latitude' => $finalLatitude,
            'longitude' => $finalLongitude,
        ]);

        Log::withContext([
            'observation_id' => $observation->id,
            'user_id' => $user->id,
        ]);

        Log::info('Observation created, dispatching analysis job', [
            'original_path' => $originalPath,
            'has_gps' => !empty($gps),
        ]);

        // Dispatch analysis job
        AnalyzeObservationJob::dispatch($observation->id);

        return $observation;
    }

    /**
     * Extract GPS coordinates from EXIF data.
     */
    protected function extractGpsFromExif(string $imagePath): array
    {
        try {
            $exif = @exif_read_data($imagePath);

            if (!$exif || !isset($exif['GPSLatitude'], $exif['GPSLongitude'])) {
                return [];
            }

            $latitude = $this->convertGpsToDecimal(
                $exif['GPSLatitude'],
                $exif['GPSLatitudeRef'] ?? 'N'
            );

            $longitude = $this->convertGpsToDecimal(
                $exif['GPSLongitude'],
                $exif['GPSLongitudeRef'] ?? 'E'
            );

            if ($latitude === null || $longitude === null) {
                return [];
            }

            return [
                'latitude' => $latitude,
                'longitude' => $longitude,
            ];
        } catch (\Exception $e) {
            Log::debug('Failed to extract GPS from EXIF', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Convert GPS coordinates from EXIF format to decimal degrees.
     */
    protected function convertGpsToDecimal(array $coords, string $ref): ?float
    {
        if (count($coords) !== 3) {
            return null;
        }

        $degrees = $this->evalFraction($coords[0]);
        $minutes = $this->evalFraction($coords[1]);
        $seconds = $this->evalFraction($coords[2]);

        if ($degrees === null || $minutes === null || $seconds === null) {
            return null;
        }

        $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

        // South and West are negative
        if (in_array(strtoupper($ref), ['S', 'W'])) {
            $decimal *= -1;
        }

        return round($decimal, 7);
    }

    /**
     * Evaluate a fraction string (e.g., "35/1") to float.
     */
    protected function evalFraction(string $fraction): ?float
    {
        $parts = explode('/', $fraction);

        if (count($parts) === 2 && is_numeric($parts[0]) && is_numeric($parts[1]) && $parts[1] != 0) {
            return (float) $parts[0] / (float) $parts[1];
        }

        if (is_numeric($fraction)) {
            return (float) $fraction;
        }

        return null;
    }

    /**
     * Delete an observation and its associated files.
     * Also removes orphan tags (tags with no other observations).
     */
    public function deleteObservation(Observation $observation): void
    {
        // Get tag ids before detaching/deleting
        $tagIds = $observation->tags()->pluck('tags.id')->toArray();

        // Delete files
        $paths = array_filter([
            $observation->original_path,
            $observation->cropped_path,
            $observation->thumb_path,
        ]);

        if (!empty($paths)) {
            Storage::disk('public')->delete($paths);
        }

        // Delete observation (cascades pivot, but let's be explicit if needed, currently delete handles it)
        $observation->delete();

        // Cleanup orphan tags
        if (!empty($tagIds)) {
            // Check each tag
            foreach ($tagIds as $tagId) {
                // If the tag has no observations left, delete it
                // Note: SoftDeletes on Observation might affect this count if not handled.
                // Assuming we want to count only ACTIVE (non-deleted) observations.
                // Pivot table entries usually remain on SoftDelete unless manually removed,
                // BUT ObservationController uses strict delete() which triggers SoftDeletes trait.
                // However, standard pivot relationships don't auto-remove on SoftDelete.
                // LensClip likely uses standard SoftDeletes.
                // If we want to genuinely clean up, user must see them gone.
                // Let's check the Observation model. It uses SoftDeletes.
                // If we SoftDelete an observation, the pivot row stays.
                // So the tag count will NOT go to 0 unless we detach first.

                // Wait, if we use SoftDeletes, we usually KEEP the data.
                // If the user "Deletes" an item in UI, do we mean SoftDelete or ForceDelete?
                // The Controller calls ->delete(), which is SoftDelete.
                // If an item is in Trash, should the tag still exist?
                // Usually YES, because you might restore it.
                // BUT the user request implies "Cleaning up".
                // If I have 1 photo of "Tulip" and I delete it, I probably want "Tulip" tag gone from my filter list.

                // Strategy: Only count tags on NON-DELETED observations.
                // But the pivot row still exists for the soft-deleted one.
                // So $tag->observations()->count() will include soft-deleted ones?
                // Eloquent belongsToMany by default excludes soft-deleted related models?
                // Actually belongsToMany DOES filter out soft-deleted related models by default if the related model has SoftDeletes.
                // Observation has SoftDeletes.
                // So $tag->observations()->count() should return only active ones.

                // Let's verify manually:
                // Tag::find($id)->observations()->count() -> select count(*) ... where deletion_at is null.

                // So simple logic:
                $count = \App\Models\Tag::find($tagId)->observations()->count();
                if ($count === 0) {
                    \App\Models\Tag::destroy($tagId);
                }
            }
        }
    }
}
