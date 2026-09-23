<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use App\Services\ImageAnalysisService;
use App\Services\ObservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ObservationReliabilityTest extends TestCase
{
    use RefreshDatabase;

    private function analysisResult(): array
    {
        return ['ai_json' => ['title' => 'Ladybug', 'category' => 'insect', 'tags' => ['insect']]];
    }

    public function test_images_survive_promotion_on_each_supported_disk(): void
    {
        Queue::fake();
        foreach (['local', 'public', 'gcs'] as $disk) {
            config(['filesystems.default' => $disk]);
            Storage::fake('local');
            if ($disk !== 'local') {
                Storage::fake($disk);
            }
            $observation = app(ObservationService::class)->createObservation(
                User::factory()->create(), UploadedFile::fake()->image('photo.jpg', 1800, 1200)
            );
            $stagingPath = substr($observation->original_path, 6);
            $analysis = Mockery::mock(ImageAnalysisService::class);
            $analysis->shouldReceive('analyze')->once()->andReturnUsing(function ($current) use ($disk) {
                Storage::disk($disk)->assertExists([$current->original_path, $current->thumb_path]);
                $this->assertStringStartsWith('RIFF', Storage::disk($disk)->get($current->original_path));

                return $this->analysisResult();
            });
            (new AnalyzeObservationJob($observation->id, $observation->processing_token))->handle($analysis);
            $observation->refresh();
            $this->assertSame('ready', $observation->status, $disk);
            Storage::disk($disk)->assertExists([$observation->original_path, $observation->thumb_path]);
            Storage::disk('local')->assertMissing($stagingPath);
        }
    }

    public function test_legacy_local_paths_are_not_deleted(): void
    {
        config(['filesystems.default' => 'local']);
        Storage::fake('local');
        $upload = UploadedFile::fake()->image('old.jpg');
        $bytes = file_get_contents($upload->getPathname());
        Storage::disk('local')->put('observations/old.webp', $bytes);
        Storage::disk('local')->put('observations/old_thumb.webp', $bytes);
        $observation = Observation::factory()->create([
            'status' => 'processing', 'original_path' => 'local:observations/old.webp',
            'thumb_path' => 'local:observations/old_thumb.webp',
        ]);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldReceive('analyze')->once()->andReturn($this->analysisResult());
        (new AnalyzeObservationJob($observation->id))->handle($analysis);
        $this->assertSame('ready', $observation->fresh()->status);
        Storage::disk('local')->assertExists(['observations/old.webp', 'observations/old_thumb.webp']);
    }

    public function test_failed_final_write_retains_staging_files_and_paths(): void
    {
        Queue::fake();
        $local = Storage::fake('local');
        $observation = app(ObservationService::class)->createObservation(
            User::factory()->create(), UploadedFile::fake()->image('photo.jpg')
        );
        $originalPath = $observation->original_path;
        $thumbPath = $observation->thumb_path;
        $target = Mockery::mock(\Illuminate\Filesystem\FilesystemAdapter::class);
        $target->shouldReceive('put')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('local')->andReturn($local);
        Storage::shouldReceive('disk')->withNoArgs()->andReturn($target);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldNotReceive('analyze');
        (new AnalyzeObservationJob($observation->id, $observation->processing_token))->handle($analysis);
        $observation->refresh();
        $this->assertSame('failed', $observation->status);
        $this->assertSame($originalPath, $observation->original_path);
        $this->assertSame($thumbPath, $observation->thumb_path);
        $local->assertExists([substr($originalPath, 6), substr($thumbPath, 6)]);
    }

    public function test_late_failure_does_not_overwrite_a_completed_result(): void
    {
        $observation = Observation::factory()->create(['status' => 'processing']);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldReceive('analyze')->once()->andReturnUsing(function () use ($observation) {
            $observation->update(['status' => 'ready', 'title' => 'Completed']);
            throw new \RuntimeException('late failure');
        });
        $job = new AnalyzeObservationJob($observation->id);
        $job->handle($analysis);
        $job->failed(new \RuntimeException('late terminal failure'));
        $this->assertSame('ready', $observation->fresh()->status);
        $this->assertSame('Completed', $observation->fresh()->title);
    }

    public function test_old_job_cannot_finish_or_fail_a_new_attempt(): void
    {
        $observation = Observation::factory()->create(['status' => 'processing', 'processing_token' => 'old']);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldReceive('analyze')->once()->andReturnUsing(function () use ($observation) {
            $observation->update(['processing_token' => 'new', 'title' => 'New attempt']);

            return $this->analysisResult();
        });
        $job = new AnalyzeObservationJob($observation->id, 'old');
        $job->handle($analysis);
        $job->failed(new \RuntimeException('old failure'));
        $this->assertSame('processing', $observation->fresh()->status);
        $this->assertSame('New attempt', $observation->fresh()->title);
    }

    public function test_tag_failure_rolls_back_result_and_milestones(): void
    {
        $observation = Observation::factory()->create(['status' => 'processing', 'ai_json' => null, 'milestones' => null]);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldReceive('analyze')->once()->andReturn($this->analysisResult());
        $job = new class($observation->id) extends AnalyzeObservationJob
        {
            protected function syncTags(Observation $observation, array $tagNames): void
            {
                throw new \RuntimeException('tag persistence failed');
            }
        };
        $job->handle($analysis);
        $observation->refresh();
        $this->assertSame('failed', $observation->status);
        $this->assertNull($observation->ai_json);
        $this->assertNull($observation->milestones);
    }

    public function test_transient_connection_failure_is_rethrown_without_finalizing_the_record(): void
    {
        $observation = Observation::factory()->create(['status' => 'processing']);
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $failure = new ConnectionException('private-provider-response');
        $analysis->shouldReceive('analyze')->once()->andThrow($failure);
        $job = new AnalyzeObservationJob($observation->id);
        try {
            $job->handle($analysis);
            $this->fail('Transient errors must reach the queue retry mechanism.');
        } catch (\RuntimeException $caught) {
            $this->assertSame('Temporary external service failure.', $caught->getMessage());
            $this->assertNull($caught->getPrevious());
        }
        $this->assertSame('processing', $observation->fresh()->status);
        $job->failed($failure);
        $this->assertSame('failed', $observation->fresh()->status);
    }

    public function test_legacy_queued_payload_gets_a_default_processing_token(): void
    {
        $class = AnalyzeObservationJob::class;
        $id = 'legacy-id';
        $job = unserialize('O:'.strlen($class).':"'.$class.'":1:{s:13:"observationId";s:'.strlen($id).':"'.$id.'";}');
        $this->assertNull($job->processingToken);
        $this->assertCount(1, $job->middleware());
    }

    public function test_duplicate_delivery_is_skipped_while_the_same_attempt_is_running(): void
    {
        $job = new AnalyzeObservationJob('observation-id', 'attempt-id');
        $lock = \Illuminate\Support\Facades\Cache::lock('laravel-queue-overlap:observation:observation-id:attempt-id', 150);
        $this->assertTrue($lock->get());
        $called = false;
        $job->middleware()[0]->handle($job, function () use (&$called) {
            $called = true;
        });
        $this->assertFalse($called);
        $lock->release();
        $job->middleware()[0]->handle($job, function () use (&$called) {
            $called = true;
        });
        $this->assertTrue($called);
    }

    public function test_normalized_local_images_are_visible_only_to_the_owner(): void
    {
        Queue::fake();
        config(['filesystems.default' => 'local']);
        Storage::fake('local');
        $owner = User::factory()->create();
        $observation = app(ObservationService::class)->createObservation($owner, UploadedFile::fake()->image('photo.jpg'));
        $originalUrl = route('observations.image', ['observation' => $observation->id, 'variant' => 'original']);
        $this->actingAs($owner)->get($originalUrl)->assertNotFound();
        $analysis = Mockery::mock(ImageAnalysisService::class);
        $analysis->shouldReceive('analyze')->once()->andReturn($this->analysisResult());
        (new AnalyzeObservationJob($observation->id, $observation->processing_token))->handle($analysis);
        $observation->refresh();
        foreach ([$observation->original_url, $observation->thumb_url] as $url) {
            $this->actingAs($owner)->get($url)->assertOk()->assertHeader('Content-Type', 'image/webp');
            $this->actingAs(User::factory()->create())->get($url)->assertForbidden();
        }
    }

    public function test_tag_uniqueness_is_kept_within_each_owner(): void
    {
        $owner = User::factory()->create();
        \App\Models\Tag::create(['user_id' => $owner->id, 'name' => 'insect']);
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        \App\Models\Tag::create(['user_id' => $owner->id, 'name' => 'insect']);
    }

    public function test_tag_migration_rollback_preserves_shared_names_instead_of_deleting_data(): void
    {
        foreach (User::factory()->count(2)->create() as $owner) {
            \App\Models\Tag::create(['user_id' => $owner->id, 'name' => 'insect']);
        }
        $migration = require database_path('migrations/2026_09_23_000001_scope_tag_name_uniqueness_to_user.php');
        try {
            $migration->down();
            $this->fail('Rollback cannot restore global uniqueness without losing user data.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('No tags were removed', $exception->getMessage());
        }
        $this->assertSame(2, \App\Models\Tag::where('name', 'insect')->count());
    }
}
