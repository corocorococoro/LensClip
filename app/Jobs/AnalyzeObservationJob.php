<?php

namespace App\Jobs;

use App\Models\Observation;
use App\Models\User;
use App\Services\ImageAnalysisService;
use App\Support\RetriesTransientObservationFailures;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class AnalyzeObservationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, RetriesTransientObservationFailures, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    // Explicit default also applies when a pre-deployment queued payload is unserialized.
    public ?string $processingToken = null;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $observationId,
        ?string $processingToken = null,
    ) {
        $this->processingToken = $processingToken;
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

        if (! $observation) {
            Log::warning('AnalyzeObservationJob: Observation not found');

            return;
        }

        // Skip if not in processing status
        if (! $this->isCurrentAnalysis($observation)) {
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

            // AI category must be explicit and valid; do not silently substitute another value.
            $aiCategory = $result['ai_json']['category'] ?? null;
            $allowedCategories = array_column(config('categories'), 'id');
            if (! is_string($aiCategory) || ! in_array($aiCategory, $allowedCategories, true)) {
                throw new \UnexpectedValueException('AI response category is missing or invalid.');
            }

            // 節目の判定と ready 遷移を同一トランザクションで行い、
            // SSE 経由の再取得が「ready だが節目未判定」の状態を見ないようにする
            $updated = DB::transaction(function () use ($observation, $result, $aiCategory): bool {
                // 同一ユーザーの同時解析による節目の二重付与を防ぐ
                User::whereKey($observation->user_id)->lockForUpdate()->first();

                // 同一観察の重複ジョブ対策: ロック後に最新状態を取り直し、
                // 先行ジョブが確定済みなら上書きしない
                $current = Observation::whereKey($observation->id)->lockForUpdate()->first();
                if (! $this->isCurrentAnalysis($current)) {
                    return false;
                }

                // 節目は「初めて ready になった時」の一度だけ判定する(再判定・遡及なし)
                $milestones = $current->milestones ?? $this->judgeMilestones($current, $aiCategory);

                $current->update([
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
                    'milestones' => $milestones,
                ]);

                $this->syncTags($current, $result['ai_json']['tags'] ?? []);

                return true;
            });

            if (! $updated) {
                Log::info('AnalyzeObservationJob: Skipping, observation was finalized by another job', [
                    'id' => $this->observationId,
                ]);

                return;
            }

            Log::info('AnalyzeObservationJob: Success', ['id' => $this->observationId]);

        } catch (\Throwable $e) {
            if (! $this->isCurrentAnalysis($observation->fresh())) {
                return;
            }
            if ($this->isTransientFailure($e)) {
                Log::warning('Observation job: transient provider failure', [
                    'observation_id' => $this->observationId,
                    'exception' => $e::class,
                ]);
                // Workers persist/report thrown exceptions; never pass provider response bodies through.
                throw new \RuntimeException('Temporary external service failure.');
            }
            $errorId = (string) Str::uuid();
            Log::error('AnalyzeObservationJob: Failed', [
                'id' => $this->observationId,
                'error_id' => $errorId,
                'exception' => $e::class,
            ]);

            $this->currentAnalysisQuery()->update([
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

        $originalPath = str_starts_with($localOriginalPath, 'pending/')
            ? substr($localOriginalPath, 8) : $localOriginalPath;
        $thumbPath = str_starts_with($localThumbPath, 'pending/')
            ? substr($localThumbPath, 8) : $localThumbPath;

        if (! Storage::disk()->put($originalPath, $encodedOriginal)) {
            throw new \RuntimeException('Could not persist the normalized image.');
        }

        if (! Storage::disk('local')->exists($localThumbPath)) {
            throw new \RuntimeException('Staged thumbnail is missing.');
        }
        if (! Storage::disk()->put($thumbPath, Storage::disk('local')->get($localThumbPath))) {
            throw new \RuntimeException('Could not persist the thumbnail.');
        }

        $observation->update([
            'original_path' => $originalPath,
            'thumb_path' => $thumbPath,
        ]);

        // Clean up local copies
        // Keep final files for legacy jobs whose local staging path is also the destination.
        if (config('filesystems.default') !== 'local' || $localOriginalPath !== $originalPath) {
            Storage::disk('local')->delete([$localOriginalPath, $localThumbPath]);
        }

        // Reload model so subsequent reads use the GCS paths
        $observation->refresh();
    }

    /**
     * Judge milestones for an observation that is about to become ready.
     * Counts are based on existing ready observations (soft-deleted excluded),
     * so users who already have records never get a false "first" celebration.
     */
    protected function judgeMilestones(Observation $observation, string $category): array
    {
        $readyCount = Observation::forUser($observation->user_id)->ready()->count() + 1;

        if ($readyCount === 1) {
            return [['type' => 'first_discovery']];
        }

        $milestones = [];

        if (in_array($readyCount, config('milestones.count_thresholds', []), true)) {
            $milestones[] = ['type' => 'count', 'value' => $readyCount];
        }

        $categoryCount = Observation::forUser($observation->user_id)
            ->ready()
            ->forCategory($category)
            ->count() + 1;

        if ($categoryCount === 1) {
            $milestones[] = ['type' => 'first_category', 'category' => $category];
        }

        return $milestones;
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
        if ($this->isCurrentAnalysis($observation)) {
            $errorId = (string) Str::uuid();
            Log::error('AnalyzeObservationJob: Terminal failure', [
                'id' => $this->observationId,
                'error_id' => $errorId,
                'exception' => $exception::class,
            ]);

            $this->currentAnalysisQuery()->update([
                'status' => 'failed',
                'error_message' => $this->userVisibleMessageForException($exception, $errorId),
            ]);
        }
    }

    private function isCurrentAnalysis(?Observation $observation): bool
    {
        return $observation !== null
            && $observation->status === 'processing'
            && $observation->processing_type === 'identify'
            && $observation->processing_token === $this->processingToken;
    }

    private function currentAnalysisQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return Observation::whereKey($this->observationId)
            ->where('status', 'processing')
            ->where('processing_type', 'identify')
            ->where('processing_token', $this->processingToken);
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
