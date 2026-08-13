<?php

namespace App\Jobs;

use App\Actions\UpdateObservationTagsAction;
use App\Models\Observation;
use App\Services\ImageAnalysisService;
use App\Support\CategoryCatalog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CorrectObservationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public string $observationId,
        public string $processingToken,
    ) {}

    public function handle(
        ImageAnalysisService $analysisService,
        UpdateObservationTagsAction $updateTagsAction,
    ): void {
        $observation = Observation::find($this->observationId);

        if (! $this->isCurrentCorrection($observation)) {
            return;
        }

        try {
            $correctionName = $observation->correction_name;
            $result = $analysisService->correct($observation, $correctionName);
            $aiJson = $result['ai_json'] ?? [];
            $category = $aiJson['category'] ?? null;

            if (! is_string($category) || ! in_array($category, CategoryCatalog::ids(), true)) {
                throw new \UnexpectedValueException('AI response category is missing or invalid.');
            }

            $card = is_array($aiJson['candidate_cards'][0] ?? null)
                ? $aiJson['candidate_cards'][0]
                : [];
            $card['name'] = $correctionName;
            $card['confidence'] = null;
            $aiJson['title'] = $correctionName;
            $aiJson['confidence'] = null;
            $aiJson['candidate_cards'] = [$card];

            $updated = DB::transaction(function () use ($aiJson, $category, $correctionName, $result, $updateTagsAction): bool {
                $current = Observation::whereKey($this->observationId)->lockForUpdate()->first();

                if (! $this->isCurrentCorrection($current)) {
                    return false;
                }

                $current->update([
                    'status' => 'ready',
                    'title' => $correctionName,
                    'summary' => $aiJson['summary'] ?? null,
                    'kid_friendly' => $aiJson['kid_friendly'] ?? null,
                    'confidence' => null,
                    'selected_candidate_index' => 0,
                    'ai_json' => $aiJson,
                    'category' => $category,
                    'milestones' => $this->correctCategoryMilestone($current->milestones, $category),
                    'gemini_model' => $result['gemini_model'] ?? null,
                    'correction_name' => null,
                    'processing_token' => null,
                    'error_message' => null,
                ]);

                $tagNames = is_array($aiJson['tags'] ?? null)
                    ? array_slice($aiJson['tags'], 0, 10)
                    : [];
                $updateTagsAction->execute($current, $tagNames);

                return true;
            });

            if ($updated) {
                Log::info('CorrectObservationJob: Success', ['observation_id' => $this->observationId]);
            }
        } catch (\Throwable $exception) {
            $this->markFailed($exception);
        }
    }

    public function failed(\Throwable $exception): void
    {
        $this->markFailed($exception);
    }

    private function isCurrentCorrection(?Observation $observation): bool
    {
        return $observation !== null
            && $observation->status === 'processing'
            && $observation->processing_type === 'correction'
            && hash_equals((string) $observation->processing_token, $this->processingToken)
            && is_string($observation->correction_name)
            && $observation->correction_name !== '';
    }

    /**
     * Keep the achievement itself, but make its category label follow the corrected result.
     *
     * @param  array<int, array<string, mixed>>|null  $milestones
     * @return array<int, array<string, mixed>>|null
     */
    private function correctCategoryMilestone(?array $milestones, string $category): ?array
    {
        if ($milestones === null) {
            return null;
        }

        return array_map(function (array $milestone) use ($category): array {
            if (($milestone['type'] ?? null) === 'first_category') {
                $milestone['category'] = $category;
            }

            return $milestone;
        }, $milestones);
    }

    private function markFailed(\Throwable $exception): void
    {
        $errorId = (string) Str::uuid();

        Log::error('CorrectObservationJob: Failed', [
            'observation_id' => $this->observationId,
            'error_id' => $errorId,
            'exception' => $exception::class,
        ]);

        Observation::query()
            ->whereKey($this->observationId)
            ->where('status', 'processing')
            ->where('processing_type', 'correction')
            ->where('processing_token', $this->processingToken)
            ->update([
                'status' => 'failed',
                'error_message' => "図鑑情報の更新に失敗しました。時間をおいてもう一度お試しください。（エラーID: {$errorId}）",
            ]);
    }
}
