<?php

namespace Tests\Feature;

use App\Actions\RetryObservationAction;
use App\Actions\StartObservationCorrectionAction;
use App\Jobs\AnalyzeObservationJob;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use App\Models\User;
use App\Services\ObservationService;
use App\Support\DispatchObservationJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObservationDispatchRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_retry_requests_only_dispatch_one_attempt(): void
    {
        Queue::fake();
        foreach (['identify', 'correction'] as $type) {
            $observation = Observation::factory()->create([
                'status' => 'failed', 'processing_type' => $type, 'correction_name' => 'Ladybug',
            ]);
            $stale = $observation->fresh();
            app(RetryObservationAction::class)->execute($observation);
            $token = $observation->processing_token;
            app(RetryObservationAction::class)->execute($stale);
            $this->assertSame($token, $stale->processing_token);
        }
        Queue::assertPushed(AnalyzeObservationJob::class, 1);
        Queue::assertPushed(CorrectObservationJob::class, 1);
    }

    public function test_upload_dispatch_failure_preserves_images_and_can_be_retried(): void
    {
        Storage::fake('local');
        Bus::shouldReceive('dispatch')->once()->andThrow(new \RuntimeException('secret provider response'));
        $observation = app(ObservationService::class)->createObservation(
            User::factory()->create(), UploadedFile::fake()->image('photo.jpg')
        );
        $this->assertSame('failed', $observation->status);
        $this->assertStringNotContainsString('secret', $observation->error_message);
        Storage::disk('local')->assertExists(substr($observation->original_path, 6));
        Storage::disk('local')->assertExists(substr($observation->thumb_path, 6));
        Bus::shouldReceive('dispatch')->once()->withArgs(fn ($job) => $job instanceof AnalyzeObservationJob)->andReturnNull();
        app(RetryObservationAction::class)->execute($observation);
        $this->assertSame('processing', $observation->status);
    }

    public function test_retry_and_correction_dispatch_failures_are_recoverable(): void
    {
        Bus::shouldReceive('dispatch')->twice()->andThrow(new \RuntimeException('secret'));
        $observation = Observation::factory()->create(['status' => 'failed']);
        app(RetryObservationAction::class)->execute($observation);
        $this->assertSame('failed', $observation->status);
        app(StartObservationCorrectionAction::class)->execute($observation, 'Ladybug');
        $this->assertSame('failed', $observation->status);
        $this->assertSame('correction', $observation->processing_type);
        $this->assertSame('Ladybug', $observation->correction_name);
    }

    public function test_json_responses_report_dispatch_failure_instead_of_processing(): void
    {
        Bus::shouldReceive('dispatch')->twice()->andThrow(new \RuntimeException('secret'));
        $user = User::factory()->create();
        $observation = Observation::factory()->create(['user_id' => $user->id, 'status' => 'failed']);
        $this->actingAs($user)->postJson("/observations/{$observation->id}/retry")
            ->assertOk()->assertJsonPath('status', 'failed');
        $observation->update(['status' => 'ready']);
        $this->postJson("/observations/{$observation->id}/correction", ['title' => 'Ladybug'])
            ->assertOk()->assertJsonPath('status', 'failed');
    }

    public function test_dispatch_failure_does_not_overwrite_a_newer_attempt(): void
    {
        $observation = Observation::factory()->create(['status' => 'processing', 'processing_token' => 'new']);
        Bus::shouldReceive('dispatch')->once()->andThrow(new \RuntimeException('secret'));
        app(DispatchObservationJob::class)->execute(new AnalyzeObservationJob($observation->id, 'old'));
        $this->assertSame('processing', $observation->fresh()->status);
    }

    public function test_invalid_image_leaves_no_staging_files_or_observation(): void
    {
        Storage::fake('local');
        Queue::fake();
        $user = User::factory()->create();
        try {
            app(ObservationService::class)->createObservation(
                $user, UploadedFile::fake()->createWithContent('broken.jpg', 'invalid image')
            );
            $this->fail('Expected image decoding to fail');
        } catch (\Intervention\Image\Exceptions\DecoderException) {
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertDatabaseCount('observations', 0);
            Queue::assertNothingPushed();
        }
    }

    public function test_thumbnail_write_failures_clean_up_staging(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        foreach ([false, true] as $throws) {
            $disk = \Mockery::mock();
            Storage::shouldReceive('disk')->with('local')->times(3)->andReturn($disk);
            $disk->shouldReceive('put')->once()->ordered()->andReturnTrue();
            $write = $disk->shouldReceive('put')->once()->ordered();
            if ($throws) {
                $write->andThrow(new \RuntimeException('storage unavailable'));
            } else {
                $write->andReturnFalse();
            }
            $disk->shouldReceive('delete')->once()->withArgs(fn ($paths) => count($paths) === 2)->andReturnTrue();
            try {
                app(ObservationService::class)->createObservation($user, UploadedFile::fake()->image('photo.jpg'));
                $this->fail('Expected thumbnail write to fail');
            } catch (\RuntimeException) {
                $this->assertDatabaseCount('observations', 0);
                Queue::assertNothingPushed();
            }
        }
    }

    public function test_database_failure_removes_both_staged_images(): void
    {
        Storage::fake('local');
        Queue::fake();
        try {
            app(ObservationService::class)->createObservation(
                new User(['id' => 999999]), UploadedFile::fake()->image('photo.jpg')
            );
            $this->fail('Expected database insert to fail');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertDatabaseCount('observations', 0);
            Queue::assertNothingPushed();
        }
    }
}
