<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ObservationRetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_retry_failed_observation(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'failed',
            'original_path' => 'test/original.webp',
            'thumb_path' => 'test/thumb.webp',
            'error_message' => 'Previous error',
        ]);

        $response = $this->actingAs($user)
            ->post("/observations/{$observation->id}/retry");

        $response->assertRedirect(route('observations.show', $observation));

        // Assert status changed to processing
        $observation->refresh();
        $this->assertEquals('processing', $observation->status);
        $this->assertNull($observation->error_message);

        // Assert job was dispatched
        Queue::assertPushed(AnalyzeObservationJob::class);
    }

    public function test_user_cannot_retry_ready_observation(): void
    {
        $user = User::factory()->create();
        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'ready',
            'original_path' => 'test/original.webp',
            'thumb_path' => 'test/thumb.webp',
        ]);

        $response = $this->actingAs($user)
            ->post("/observations/{$observation->id}/retry");

        $response->assertForbidden();
    }

    public function test_failed_correction_retries_the_correction_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'processing_type' => 'correction',
            'correction_name' => 'ナナホシテントウ',
            'processing_token' => '49cfc2ff-f24b-4e07-ac1d-e81e3391089f',
            'title' => 'ナナホシテントウ',
            'error_message' => 'Previous correction error',
        ]);

        $this->actingAs($user)
            ->post("/observations/{$observation->id}/retry")
            ->assertRedirect(route('observations.show', $observation));

        $observation->refresh();
        $this->assertSame('processing', $observation->status);
        $this->assertSame('correction', $observation->processing_type);
        $this->assertSame('ナナホシテントウ', $observation->correction_name);
        $this->assertNotSame('49cfc2ff-f24b-4e07-ac1d-e81e3391089f', $observation->processing_token);
        $this->assertNull($observation->error_message);

        Queue::assertPushed(CorrectObservationJob::class, fn (CorrectObservationJob $job) => $job->observationId === $observation->id
            && $job->processingToken === $observation->processing_token
        );
        Queue::assertNotPushed(AnalyzeObservationJob::class);
    }

    public function test_user_cannot_retry_others_observation(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $observation = Observation::create([
            'user_id' => $user1->id,
            'status' => 'failed',
            'original_path' => 'test/original.webp',
            'thumb_path' => 'test/thumb.webp',
        ]);

        $response = $this->actingAs($user2)
            ->post("/observations/{$observation->id}/retry");

        $response->assertForbidden();
    }
}
