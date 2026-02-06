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
    ) {
    }

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

        if (!$observation) {
            Log::warning('AnalyzeObservationJob: Observation not found');
            return;
        }

        // Skip if not in processing status
        if ($observation->status !== 'processing') {
            Log::info('AnalyzeObservationJob: Skipping, status is not processing', [
                'status' => $observation->status
            ]);
            return;
        }

        Log::info('AnalyzeObservationJob: Starting analysis');

        try {
            $result = $analysisService->analyze($observation);

            // カテゴリをconfigの許可リストで検証
            $aiCategory = $result['ai_json']['category'] ?? 'other';
            $allowedCategories = array_column(config('categories'), 'id');
            if (!in_array($aiCategory, $allowedCategories)) {
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
            Log::error('AnalyzeObservationJob: Failed', [
                'id' => $this->observationId,
                'error' => $e->getMessage()
            ]);

            $observation->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
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
            if (empty($name))
                continue;

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
            $observation->update([
                'status' => 'failed',
                'error_message' => 'AI分析に失敗しました: ' . $exception->getMessage(),
            ]);
        }
    }
}
