<?php

namespace App\Jobs;

use App\Models\Observation;
use App\Services\ImageAnalysisService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class AnalyzeObservationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $observationId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ImageAnalysisService $analysisService): void
    {
        Log::withContext([
            'observation_id' => $this->observationId,
            'job_id' => $this->job?->getJobId(),
        ]);

        $observation = Observation::find($this->observationId);

        if (! $observation) {
            Log::warning('AnalyzeObservationJob: Observation not found');

            return;
        }

        // Skip if not in processing status
        if ($observation->status !== 'processing') {
            Log::info('AnalyzeObservationJob: Skipping, status is not processing', [
                'status' => $observation->status,
            ]);

            return;
        }

        Log::info('AnalyzeObservationJob: Starting analysis');

        try {
            // Upload local files to GCS before running AI analysis.
            // Files are stored locally during the HTTP request to avoid blocking the redirect.
            if (str_starts_with($observation->original_path ?? '', 'local:')) {
                $this->uploadLocalFilesToGcs($observation);
            }

            $result = $analysisService->analyze($observation);

            // カテゴリをconfigの許可リストで検証
            $aiCategory = $result['ai_json']['category'] ?? 'other';
            $allowedCategories = array_column(config('categories'), 'id');
            if (! in_array($aiCategory, $allowedCategories)) {
                $aiCategory = 'other';
            }

            $observation->update([
                'status' => 'ready',
                'cropped_path' => $result['cropped_path'] ?? null,
                'crop_bbox' => $result['crop_bbox'] ?? null,
                'vision_objects' => $result['vision_objects'] ?? null,
                'ai_json' => $result['ai_json'],
                'title' => $result['ai_json']['title'] ?? null,
                'summary' => $result['ai_json']['summary'] ?? null,
                'kid_friendly' => $result['ai_json']['kid_friendly'] ?? null,
                'confidence' => $result['ai_json']['confidence'] ?? null,
                'gemini_model' => $result['gemini_model'] ?? null,
                'category' => $aiCategory,
            ]);

            // Sync tags from AI result
            $this->syncTags($observation, $result['ai_json']['tags'] ?? []);

            Log::info('AnalyzeObservationJob: Success', ['id' => $this->observationId]);

        } catch (\Exception $e) {
            $errorId = (string) Str::uuid();
            Log::error('AnalyzeObservationJob: Failed', [
                'id' => $this->observationId,
                'error_id' => $errorId,
                'error' => $e->getMessage(),
            ]);

            $observation->update([
                'status' => 'failed',
                'error_message' => $this->userVisibleMessageForException($e, $errorId),
            ]);
        }
    }

    /**
     * Upload locally-stored image files to GCS and update the observation paths.
     *
     * Files are saved to local disk during the HTTP request cycle to avoid blocking
     * the redirect with synchronous GCS uploads. This method is called as the first
     * step of the job to move them to their final GCS location before AI analysis.
     */
    protected function uploadLocalFilesToGcs(Observation $observation): void
    {
        $localOriginalPath = substr($observation->original_path, 6);
        $localThumbPath = substr($observation->thumb_path, 6);

        if (! Storage::disk('local')->exists($localOriginalPath)) {
            throw new \RuntimeException(
                "Local image file not found (container may have restarted): {$localOriginalPath}"
            );
        }

        Log::info('AnalyzeObservationJob: Uploading local files to GCS', [
            'original' => $localOriginalPath,
            'thumb' => $localThumbPath,
        ]);

        // Orient, resize, and re-encode the raw original before uploading to GCS.
        // This work was deferred from the HTTP request handler to keep the redirect fast.
        $manager = new ImageManager(new Driver);
        $image = $manager->read(Storage::disk('local')->get($localOriginalPath));
        $image->orient();
        $image->scaleDown(width: 1024);
        $encodedOriginal = (string) $image->toWebp(quality: 80);
        unset($image);

        Storage::disk()->put($localOriginalPath, $encodedOriginal);

        if (Storage::disk('local')->exists($localThumbPath)) {
            Storage::disk()->put($localThumbPath, Storage::disk('local')->get($localThumbPath));
        }

        $observation->update([
            'original_path' => $localOriginalPath,
            'thumb_path' => $localThumbPath,
        ]);

        // Clean up local copies
        Storage::disk('local')->delete([$localOriginalPath, $localThumbPath]);

        // Reload model so subsequent reads use the GCS paths
        $observation->refresh();
    }

    /**
     * Sync tags from AI result
     */
    protected function syncTags(Observation $observation, array $tagNames): void
    {
        if (empty($tagNames)) {
            return;
        }

        $tagIds = [];
        foreach (array_slice($tagNames, 0, 10) as $name) { // Limit to 10 tags
            $name = trim($name);
            if (empty($name)) {
                continue;
            }

            $tag = \App\Models\Tag::firstOrCreate(
                ['user_id' => $observation->user_id, 'name' => $name],
                ['user_id' => $observation->user_id, 'name' => $name]
            );
            $tagIds[] = $tag->id;
        }

        $observation->tags()->sync($tagIds);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $observation = Observation::find($this->observationId);
        if ($observation) {
            $errorId = (string) Str::uuid();
            Log::error('AnalyzeObservationJob: Terminal failure', [
                'id' => $this->observationId,
                'error_id' => $errorId,
                'error' => $exception->getMessage(),
            ]);

            $observation->update([
                'status' => 'failed',
                'error_message' => $this->userVisibleMessageForException($exception, $errorId),
            ]);
        }
    }

    /**
     * Map internal exceptions to safe user-facing messages.
     */
    private function userVisibleMessageForException(\Throwable $exception, string $errorId): string
    {
        $message = $exception->getMessage();

        if (str_contains($message, '安全性')) {
            return "この写真は安全のため判定できませんでした。別の写真を撮ってください。（エラーID: {$errorId}）";
        }

        return "AI分析に失敗しました。時間をおいてもう一度お試しください。（エラーID: {$errorId}）";
    }
}
