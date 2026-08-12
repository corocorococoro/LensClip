<?php

namespace App\Actions;

use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StartObservationCorrectionAction
{
    public function __construct(private UpdateObservationTagsAction $updateTagsAction) {}

    public function execute(Observation $observation, string $title): void
    {
        $title = trim($title);
        $token = (string) Str::uuid();

        DB::transaction(function () use ($observation, $title, $token): void {
            $observation->update([
                'status' => 'processing',
                'processing_type' => 'correction',
                'processing_token' => $token,
                'correction_name' => $title,
                'title' => $title,
                'summary' => null,
                'kid_friendly' => null,
                'confidence' => null,
                'selected_candidate_index' => null,
                'ai_json' => null,
                'category' => null,
                'gemini_model' => null,
                'error_message' => null,
            ]);

            $this->updateTagsAction->execute($observation, []);
        });

        CorrectObservationJob::dispatch($observation->id, $token);
    }
}
