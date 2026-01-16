<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
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

        $response->assertRedirect();

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
