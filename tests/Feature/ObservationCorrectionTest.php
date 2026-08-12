<?php

namespace Tests\Feature;

use App\Actions\UpdateObservationTagsAction;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use App\Models\Tag;
use App\Models\User;
use App\Services\ImageAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class ObservationCorrectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_start_correction_and_old_ai_content_is_cleared(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'title' => 'あやまった名前',
            'summary' => '古い説明',
            'kid_friendly' => '古いやさしい説明',
            'confidence' => 0.91,
            'selected_candidate_index' => 0,
            'ai_json' => ['fun_facts' => ['古い豆知識']],
            'gemini_model' => 'old-model',
        ]);
        $tag = Tag::create(['user_id' => $user->id, 'name' => '古いタグ']);
        $observation->tags()->attach($tag);

        $response = $this->actingAs($user)->postJson("/observations/{$observation->id}/correction", [
            'title' => 'ナナホシテントウ',
        ]);

        $response->assertAccepted()->assertJson([
            'status' => 'processing',
            'processing_type' => 'correction',
            'title' => 'ナナホシテントウ',
        ]);

        $observation->refresh();
        $this->assertSame('processing', $observation->status);
        $this->assertSame('correction', $observation->processing_type);
        $this->assertSame('ナナホシテントウ', $observation->title);
        $this->assertSame('ナナホシテントウ', $observation->correction_name);
        $this->assertNotNull($observation->processing_token);
        $this->assertNull($observation->summary);
        $this->assertNull($observation->kid_friendly);
        $this->assertNull($observation->confidence);
        $this->assertNull($observation->selected_candidate_index);
        $this->assertNull($observation->ai_json);
        $this->assertNull($observation->category);
        $this->assertNull($observation->gemini_model);
        $this->assertSame([], $observation->tags()->pluck('name')->all());

        Queue::assertPushed(CorrectObservationJob::class, fn (CorrectObservationJob $job) => $job->observationId === $observation->id
            && $job->processingToken === $observation->processing_token
        );
    }

    public function test_correction_job_replaces_related_content_but_keeps_user_name_and_milestones(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'processing_type' => 'correction',
            'processing_token' => '2f71bff9-65b5-4a82-b395-ff8162d85ce9',
            'correction_name' => 'ナナホシテントウ',
            'title' => 'ナナホシテントウ',
            'milestones' => [['type' => 'first_discovery']],
        ]);

        $service = Mockery::mock(ImageAnalysisService::class);
        $service->shouldReceive('correct')
            ->once()
            ->withArgs(fn (Observation $target, string $name) => $target->is($observation) && $name === 'ナナホシテントウ')
            ->andReturn([
                'gemini_model' => 'gemini-test',
                'ai_json' => [
                    'title' => 'AIが変えた名前',
                    'summary' => '赤い体のテントウムシです',
                    'kid_friendly' => 'くろい ほしが ななつ あるよ',
                    'category' => 'insect',
                    'confidence' => 0.99,
                    'tags' => ['てんとうむし', 'こんちゅう'],
                    'safety_notes' => [],
                    'fun_facts' => ['冬は集まって過ごします'],
                    'questions' => ['ほしはいくつある？'],
                    'candidate_cards' => [
                        [
                            'name' => 'AIが変えた名前',
                            'english_name' => 'seven-spotted ladybug',
                            'confidence' => 0.99,
                            'summary' => 'カード説明',
                            'kid_friendly' => 'カード説明だよ',
                            'fun_facts' => ['カード豆知識'],
                            'questions' => ['カード質問'],
                            'tags' => ['てんとうむし'],
                        ],
                        ['name' => '不要な第二候補'],
                    ],
                ],
            ]);

        $job = new CorrectObservationJob($observation->id, $observation->processing_token);
        $job->handle($service, app(UpdateObservationTagsAction::class));

        $observation->refresh();
        $this->assertSame('ready', $observation->status);
        $this->assertSame('ナナホシテントウ', $observation->title);
        $this->assertSame('ナナホシテントウ', $observation->ai_json['title']);
        $this->assertSame('ナナホシテントウ', $observation->ai_json['candidate_cards'][0]['name']);
        $this->assertCount(1, $observation->ai_json['candidate_cards']);
        $this->assertNull($observation->confidence);
        $this->assertNull($observation->ai_json['confidence']);
        $this->assertSame(0, $observation->selected_candidate_index);
        $this->assertSame('insect', $observation->category);
        $this->assertSame('gemini-test', $observation->gemini_model);
        $this->assertNull($observation->correction_name);
        $this->assertNull($observation->processing_token);
        $this->assertSame([['type' => 'first_discovery']], $observation->milestones);
        $this->assertEqualsCanonicalizing(
            ['てんとうむし', 'こんちゅう'],
            $observation->tags()->pluck('name')->all(),
        );
    }

    public function test_failed_correction_keeps_name_without_exposing_internal_error(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'processing_type' => 'correction',
            'processing_token' => '04df0549-32ca-4d44-a190-b5cf98914f1d',
            'correction_name' => 'ナナホシテントウ',
            'title' => 'ナナホシテントウ',
        ]);

        $service = Mockery::mock(ImageAnalysisService::class);
        $service->shouldReceive('correct')->once()->andThrow(new \RuntimeException('secret-provider-detail'));

        (new CorrectObservationJob($observation->id, $observation->processing_token))
            ->handle($service, app(UpdateObservationTagsAction::class));

        $observation->refresh();
        $this->assertSame('failed', $observation->status);
        $this->assertSame('ナナホシテントウ', $observation->title);
        $this->assertStringContainsString('エラーID:', $observation->error_message);
        $this->assertStringNotContainsString('secret-provider-detail', $observation->error_message);
    }

    public function test_stale_correction_job_does_not_call_ai_or_overwrite_state(): void
    {
        $observation = Observation::factory()->create([
            'status' => 'processing',
            'processing_type' => 'correction',
            'processing_token' => '5c745a18-cf00-4386-a667-7c5fbd5cc84b',
            'correction_name' => '新しい名前',
            'title' => '新しい名前',
        ]);
        $service = Mockery::mock(ImageAnalysisService::class);
        $service->shouldNotReceive('correct');

        (new CorrectObservationJob($observation->id, '2a39ab5e-488f-45c8-9425-f35555cf25f3'))
            ->handle($service, app(UpdateObservationTagsAction::class));

        $this->assertSame('新しい名前', $observation->fresh()->title);
    }

    public function test_user_can_keep_name_after_failed_correction(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'processing_type' => 'correction',
            'processing_token' => 'bc66421e-6831-47a5-b19b-6df9e1ffbe13',
            'correction_name' => 'ナナホシテントウ',
            'title' => 'ナナホシテントウ',
            'category' => null,
            'error_message' => '更新失敗',
        ]);

        $this->actingAs($user)
            ->postJson("/observations/{$observation->id}/correction/keep-name")
            ->assertOk();

        $observation->refresh();
        $this->assertSame('ready', $observation->status);
        $this->assertSame('ナナホシテントウ', $observation->title);
        $this->assertNull($observation->correction_name);
        $this->assertNull($observation->processing_token);
        $this->assertNull($observation->error_message);
    }

    public function test_correction_rejects_non_ready_and_other_users_observations(): void
    {
        Queue::fake();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ready = Observation::factory()->create(['user_id' => $owner->id]);
        $processing = Observation::factory()->create(['user_id' => $owner->id, 'status' => 'processing']);

        $this->actingAs($other)
            ->postJson("/observations/{$ready->id}/correction", ['title' => '正しい名前'])
            ->assertForbidden();

        $this->actingAs($owner)
            ->postJson("/observations/{$processing->id}/correction", ['title' => '正しい名前'])
            ->assertStatus(422);

        $this->actingAs($owner)
            ->postJson("/observations/{$ready->id}/correction", ['title' => ''])
            ->assertJsonValidationErrors('title');

        $this->actingAs($owner)
            ->postJson("/observations/{$ready->id}/correction", ['title' => '   '])
            ->assertJsonValidationErrors('title');

        Queue::assertNothingPushed();
    }
}
