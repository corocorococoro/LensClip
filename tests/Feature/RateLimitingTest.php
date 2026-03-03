<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_observation_upload_is_limited_to_ten_requests_per_minute(): void
    {
        Storage::fake();
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $response = $this->post('/observations', [
                'image' => UploadedFile::fake()->image("photo-{$attempt}.jpg", 400, 400),
            ]);

            $response->assertRedirect();
            $response->assertSessionHasNoErrors();
        }

        $limited = $this->post('/observations', [
            'image' => UploadedFile::fake()->image('blocked.jpg', 400, 400),
        ]);

        $limited->assertStatus(429);
        $this->assertDatabaseCount('observations', 10);
        Queue::assertPushed(AnalyzeObservationJob::class, 10);
    }

    public function test_general_api_routes_are_limited_to_sixty_requests_per_minute(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 60; $attempt++) {
            $response = $this->get('/tags');
            $response->assertOk();
        }

        $limited = $this->get('/tags');
        $limited->assertStatus(429);
    }

    public function test_general_api_rate_limit_is_scoped_per_route(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 60; $attempt++) {
            $response = $this->get('/tags');
            $response->assertOk();
        }

        $this->get('/library')->assertOk();

        $this->get('/tags')->assertStatus(429);
    }

    public function test_observation_retry_is_limited_to_five_requests_per_minute(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $observation = Observation::create([
                'user_id' => $user->id,
                'status' => 'failed',
                'original_path' => "observations/original-{$attempt}.webp",
                'thumb_path' => "observations/thumb-{$attempt}.webp",
            ]);

            $response = $this->post("/observations/{$observation->id}/retry");
            $response->assertRedirect();
        }

        $blockedObservation = Observation::create([
            'user_id' => $user->id,
            'status' => 'failed',
            'original_path' => 'observations/original-blocked.webp',
            'thumb_path' => 'observations/thumb-blocked.webp',
        ]);

        $this->post("/observations/{$blockedObservation->id}/retry")
            ->assertStatus(429);
    }
}
