<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TtsSynthesizeTest extends TestCase
{
    use RefreshDatabase;

    // ---- 認証・認可 ----

    public function test_unauthenticated_user_cannot_synthesize(): void
    {
        $response = $this->postJson('/tts', ['text' => 'ladybug']);

        $response->assertUnauthorized();
    }

    // ---- バリデーション ----

    public function test_text_is_required(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/tts', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['text']);
    }

    public function test_text_max_200_chars(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => str_repeat('a', 201)]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['text']);
    }

    public function test_speaking_rate_must_be_between_0_5_and_2_0(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'ladybug', 'speakingRate' => 3.0]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['speakingRate']);
    }

    // ---- 正常系 ----

    public function test_authenticated_verified_user_can_synthesize(): void
    {
        $user = User::factory()->create();

        $this->mock(TtsService::class, function ($mock) {
            $mock->shouldReceive('synthesize')
                ->once()
                ->with('ladybug', null)
                ->andReturn(['url' => 'https://example.com/tts/test.mp3', 'cacheHit' => false]);
        });

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'ladybug']);

        $response->assertOk()
            ->assertJsonStructure(['url', 'cacheHit'])
            ->assertJsonPath('url', 'https://example.com/tts/test.mp3');
    }

    public function test_speaking_rate_is_passed_to_service(): void
    {
        $user = User::factory()->create();

        $this->mock(TtsService::class, function ($mock) {
            $mock->shouldReceive('synthesize')
                ->once()
                ->with('tulip', 1.5)
                ->andReturn(['url' => 'https://example.com/tts/test.mp3', 'cacheHit' => true]);
        });

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'tulip', 'speakingRate' => 1.5]);

        $response->assertOk();
    }

    public function test_returns_500_when_tts_service_throws(): void
    {
        $user = User::factory()->create();

        $this->mock(TtsService::class, function ($mock) {
            $mock->shouldReceive('synthesize')
                ->once()
                ->andThrow(new \Exception('Google TTS API error'));
        });

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'sunflower']);

        $response->assertStatus(500)
            ->assertJsonPath('error', 'TTS synthesis failed');
    }
}
