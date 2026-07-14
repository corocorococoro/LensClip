<?php

namespace App\Actions;

use App\Models\Observation;
use Illuminate\Validation\ValidationException;

class SelectObservationCandidateAction
{
    public function __construct(
        private UpdateObservationTagsAction $updateTagsAction,
    ) {}

    /**
     * Persist the user's choice of a candidate card and promote its
     * content to the observation's canonical columns.
     */
    public function execute(Observation $observation, int $candidateIndex): void
    {
        $card = $observation->ai_json['candidate_cards'][$candidateIndex] ?? null;

        if (! is_array($card)) {
            throw ValidationException::withMessages([
                'candidate_index' => '指定した候補が見つかりません。',
            ]);
        }

        $observation->update([
            'selected_candidate_index' => $candidateIndex,
            'title' => $card['name'] ?? $observation->title,
            'summary' => $card['summary'] ?? $observation->summary,
            'kid_friendly' => $card['kid_friendly'] ?? $observation->kid_friendly,
            'confidence' => $card['confidence'] ?? $observation->confidence,
        ]);

        // カードに tags キーがある場合は空配列でも同期し、確定内容と食い違う旧タグを残さない
        if (isset($card['tags']) && is_array($card['tags'])) {
            $this->updateTagsAction->execute($observation, $card['tags']);
        }
    }
}
