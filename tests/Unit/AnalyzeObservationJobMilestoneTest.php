<?php

namespace Tests\Unit;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use App\Services\ImageAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AnalyzeObservationJobMilestoneTest extends TestCase
{
    use RefreshDatabase;

    private function processingObservation(User $user): Observation
    {
        return Observation::create([
            'user_id' => $user->id,
            'status' => 'processing',
            'original_path' => 'observations/original.webp',
            'thumb_path' => 'observations/thumb.webp',
        ]);
    }

    private function runJob(Observation $observation, string $category = 'insect'): void
    {
        $analysisService = Mockery::mock(ImageAnalysisService::class);
        $analysisService->shouldReceive('analyze')
            ->once()
            ->andReturn([
                'ai_json' => [
                    'title' => 'テスト',
                    'category' => $category,
                ],
                'gemini_model' => 'gemini-test',
            ]);

        (new AnalyzeObservationJob($observation->id))->handle($analysisService);
    }

    public function test_first_ready_observation_gets_first_discovery(): void
    {
        $user = User::factory()->create();
        $observation = $this->processingObservation($user);

        $this->runJob($observation);

        $observation->refresh();
        $this->assertSame('ready', $observation->status);
        $this->assertSame([['type' => 'first_discovery']], $observation->milestones);
    }

    public function test_new_category_gets_first_category_but_not_first_discovery(): void
    {
        $user = User::factory()->create();
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'category' => 'plant',
        ]);

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        $this->assertSame(
            [['type' => 'first_category', 'category' => 'insect']],
            $observation->fresh()->milestones
        );
    }

    public function test_repeat_category_gets_no_milestones_but_is_marked_as_judged(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(2)->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'category' => 'insect',
        ]);

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        // 判定済みだが該当なし = 空配列(null は未判定を意味する)
        $this->assertSame([], $observation->fresh()->milestones);
    }

    public function test_count_threshold_grants_count_milestone(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(9)->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'category' => 'insect',
        ]);

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        $this->assertSame(
            [['type' => 'count', 'value' => 10]],
            $observation->fresh()->milestones
        );
    }

    public function test_count_and_first_category_can_be_granted_together(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(9)->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'category' => 'insect',
        ]);

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'plant');

        $this->assertSame([
            ['type' => 'count', 'value' => 10],
            ['type' => 'first_category', 'category' => 'plant'],
        ], $observation->fresh()->milestones);
    }

    public function test_already_judged_observation_keeps_existing_milestones(): void
    {
        $user = User::factory()->create();
        $observation = $this->processingObservation($user);
        $observation->update(['milestones' => [['type' => 'count', 'value' => 10]]]);

        $this->runJob($observation);

        $this->assertSame(
            [['type' => 'count', 'value' => 10]],
            $observation->fresh()->milestones
        );
    }

    public function test_other_users_observations_do_not_affect_judgement(): void
    {
        $other = User::factory()->create();
        Observation::factory()->count(3)->create([
            'user_id' => $other->id,
            'status' => 'ready',
            'category' => 'insect',
        ]);

        $user = User::factory()->create();
        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        $this->assertSame([['type' => 'first_discovery']], $observation->fresh()->milestones);
    }

    public function test_soft_deleted_observations_are_excluded_from_counts(): void
    {
        $user = User::factory()->create();
        $deleted = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'category' => 'insect',
        ]);
        $deleted->delete();

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        $this->assertSame([['type' => 'first_discovery']], $observation->fresh()->milestones);
    }

    public function test_processing_and_failed_observations_do_not_count_as_ready(): void
    {
        $user = User::factory()->create();
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'category' => null,
        ]);

        $observation = $this->processingObservation($user);
        $this->runJob($observation, 'insect');

        $this->assertSame([['type' => 'first_discovery']], $observation->fresh()->milestones);
    }
}
