<?php

namespace Tests\Unit;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use App\Services\ImageAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AnalyzeObservationJobErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_internal_exception_message_is_not_exposed_to_users(): void
    {
        $user = User::factory()->create();

        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'processing',
            'original_path' => 'observations/original.webp',
            'thumb_path' => 'observations/thumb.webp',
        ]);

        $analysisService = Mockery::mock(ImageAnalysisService::class);
        $analysisService->shouldReceive('analyze')
            ->once()
            ->withArgs(fn (Observation $obs): bool => $obs->id === $observation->id)
            ->andThrow(new \RuntimeException('internal failure token=secret-123'));

        $job = new AnalyzeObservationJob($observation->id);
        $job->handle($analysisService);

        $observation->refresh();

        $this->assertSame('failed', $observation->status);
        $this->assertStringContainsString('エラーID:', (string) $observation->error_message);
        $this->assertStringNotContainsString('secret-123', (string) $observation->error_message);
    }

    public function test_safety_related_failures_return_safety_fallback_message(): void
    {
        $user = User::factory()->create();

        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'processing',
            'original_path' => 'observations/original.webp',
            'thumb_path' => 'observations/thumb.webp',
        ]);

        $analysisService = Mockery::mock(ImageAnalysisService::class);
        $analysisService->shouldReceive('analyze')
            ->once()
            ->andThrow(new \RuntimeException('安全性の理由で判定できませんでした。別の写真を撮ってください。'));

        $job = new AnalyzeObservationJob($observation->id);
        $job->handle($analysisService);

        $observation->refresh();

        $this->assertSame('failed', $observation->status);
        $this->assertStringContainsString('この写真は安全のため判定できませんでした。', (string) $observation->error_message);
    }
}
