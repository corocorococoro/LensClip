<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObservationTitleUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function readyObservationWithCandidates(User $user): Observation
    {
        return Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'title' => 'ななほしてんとう',
            'summary' => 'てんとうむしの一種',
            'kid_friendly' => 'あかい からだに ほしが あるよ',
            'confidence' => 0.9,
            'ai_json' => [
                'fun_facts' => ['トップの豆知識'],
                'questions' => ['トップの質問'],
                'candidate_cards' => [
                    [
                        'name' => 'ななほしてんとう',
                        'confidence' => 0.9,
                        'summary' => 'てんとうむしの一種',
                        'kid_friendly' => 'あかい からだに ほしが あるよ',
                        'fun_facts' => ['トップの豆知識'],
                        'questions' => ['トップの質問'],
                        'tags' => ['てんとうむし'],
                    ],
                    [
                        'name' => 'ナミテントウ',
                        'confidence' => 0.6,
                        'summary' => '模様の変化が多いてんとうむし',
                        'kid_friendly' => 'もようが いろいろ あるよ',
                        'fun_facts' => ['候補2の豆知識'],
                        'questions' => ['候補2の質問'],
                        'tags' => ['ナミテントウ', 'てんとうむし'],
                    ],
                ],
            ],
        ]);
    }

    public function test_user_can_confirm_candidate_and_columns_follow_the_card(): void
    {
        $user = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($user);

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", [
                'candidate_index' => 1,
            ]);

        $response->assertOk();
        $response->assertJson([
            'title' => 'ナミテントウ',
            'selected_candidate_index' => 1,
        ]);

        $observation->refresh();
        $this->assertSame(1, $observation->selected_candidate_index);
        $this->assertSame('ナミテントウ', $observation->title);
        $this->assertSame('模様の変化が多いてんとうむし', $observation->summary);
        $this->assertSame('もようが いろいろ あるよ', $observation->kid_friendly);
        $this->assertEqualsWithDelta(0.6, $observation->confidence, 0.0001);

        // fun_facts / questions は確定カードの内容を返す
        $this->assertSame(['候補2の豆知識'], $observation->fun_facts);
        $this->assertSame(['候補2の質問'], $observation->questions);

        // タグも確定カードの内容へ入れ替わる
        $this->assertEqualsCanonicalizing(
            ['ナミテントウ', 'てんとうむし'],
            $observation->tags()->pluck('name')->all()
        );
    }

    public function test_confirming_candidate_with_empty_tags_clears_previous_tags(): void
    {
        $user = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($user);

        // 候補1(タグあり)を確定してから、タグが空配列の候補を確定する
        $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", ['candidate_index' => 0])
            ->assertOk();

        $aiJson = $observation->fresh()->ai_json;
        $aiJson['candidate_cards'][1]['tags'] = [];
        $observation->update(['ai_json' => $aiJson]);

        $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", ['candidate_index' => 1])
            ->assertOk();

        // 確定カードの内容(タグなし)と食い違う旧タグが残らない
        $this->assertSame([], $observation->fresh()->tags()->pluck('name')->all());
    }

    public function test_invalid_candidate_index_is_rejected(): void
    {
        $user = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($user);

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", [
                'candidate_index' => 5,
            ]);

        $response->assertStatus(422);
        $this->assertNull($observation->fresh()->selected_candidate_index);
    }

    public function test_manual_title_edit_keeps_confirmed_candidate(): void
    {
        $user = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($user);

        $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", ['candidate_index' => 1])
            ->assertOk();

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", [
                'title' => 'てんとうむし（にわで はっけん）',
            ]);

        $response->assertOk();

        $observation->refresh();
        $this->assertSame('てんとうむし（にわで はっけん）', $observation->title);
        // 手動修正では確定済み候補(説明の出どころ)は変わらない
        $this->assertSame(1, $observation->selected_candidate_index);
        $this->assertSame(['候補2の豆知識'], $observation->fun_facts);
    }

    public function test_empty_or_missing_input_is_rejected(): void
    {
        $user = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($user);

        $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", [])
            ->assertStatus(422);

        $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", ['title' => ''])
            ->assertStatus(422);
    }

    public function test_title_cannot_be_updated_before_analysis_completes(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'title' => null,
        ]);

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/title", [
                'title' => 'かってにきめたなまえ',
            ]);

        $response->assertStatus(422);
        $this->assertNull($observation->fresh()->title);
    }

    public function test_other_user_cannot_update_title(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $observation = $this->readyObservationWithCandidates($owner);

        $response = $this->actingAs($other)
            ->patchJson("/observations/{$observation->id}/title", [
                'title' => 'よそのひとのなまえ',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_update_title(): void
    {
        $observation = Observation::factory()->create(['status' => 'ready']);

        $response = $this->patchJson("/observations/{$observation->id}/title", [
            'title' => 'ログインしていないひと',
        ]);

        $response->assertStatus(401);
    }
}
