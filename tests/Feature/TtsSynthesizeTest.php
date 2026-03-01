<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
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

    public function test_unauthenticated_user_cannot_stream_audio(): void
    {
        $response = $this->get('/tts/audio/abc123');

        $response->assertRedirect(); // auth ミドルウェアがログインへリダイレクト
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

    // ---- POST /tts 正常系 ----

    public function test_authenticated_user_can_synthesize(): void
    {
        $user = User::factory()->create();

        $this->mock(TtsService::class, function ($mock) {
            $mock->shouldReceive('synthesize')
                ->once()
                ->with('ladybug', null)
                ->andReturn(['key' => 'abc123def456', 'cacheHit' => false]);
        });

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'ladybug']);

        $response->assertOk()
            ->assertJsonStructure(['url', 'cacheHit'])
            ->assertJsonFragment(['cacheHit' => false]);

        // URLが /tts/audio/{key} 形式であることを確認
        $this->assertStringContainsString('/tts/audio/abc123def456', $response->json('url'));
    }

    public function test_speaking_rate_is_passed_to_service(): void
    {
        $user = User::factory()->create();

        $this->mock(TtsService::class, function ($mock) {
            $mock->shouldReceive('synthesize')
                ->once()
                ->with('tulip', 1.5)
                ->andReturn(['key' => 'xyz789', 'cacheHit' => true]);
        });

        $response = $this->actingAs($user)
            ->postJson('/tts', ['text' => 'tulip', 'speakingRate' => 1.5]);

        $response->assertOk()
            ->assertJsonFragment(['cacheHit' => true]);
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

    // ---- GET /tts/audio/{key} ----

    public function test_stream_returns_audio_when_file_exists(): void
    {
        Storage::fake();
        Storage::disk()->put('tts/abc123.mp3', 'fake-mp3-content');

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->get('/tts/audio/abc123');

        $response->assertOk()
            ->assertHeader('Content-Type', 'audio/mpeg');
    }

    public function test_stream_returns_404_when_file_not_found(): void
    {
        Storage::fake();

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->get('/tts/audio/nonexistent');

        $response->assertNotFound();
    }
}
