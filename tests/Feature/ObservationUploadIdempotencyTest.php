<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ObservationUploadIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Storage::fake('local');
    }

    private function payload(User $user, ?string $id = null): array
    {
        return ['image' => UploadedFile::fake()->image('photo.jpg'), 'upload_id' => $id ?? (string) Str::uuid(), 'upload_owner_id' => $user->id];
    }

    public function test_repeating_a_request_returns_the_same_record_without_another_job_or_files(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        $first = $this->actingAs($user)->postJson('/observations', $payload)->assertCreated()->json('id');
        $files = Storage::disk('local')->allFiles();
        $this->postJson('/observations', $payload)->assertCreated()->assertJsonPath('id', $first);
        $this->getJson('/observations/uploads/'.$payload['upload_id'].'?upload_owner_id='.$user->id)
            ->assertOk()->assertJsonPath('id', $first)->assertHeader('Cache-Control', 'no-store, private');
        $this->assertDatabaseCount('observations', 1);
        $this->assertDatabaseCount('observation_uploads', 1);
        $this->assertSame($files, Storage::disk('local')->allFiles());
        Queue::assertPushed(AnalyzeObservationJob::class, 1);
    }

    public function test_receipts_are_scoped_to_owner_and_reject_changed_sessions(): void
    {
        $one = User::factory()->create();
        $two = User::factory()->create();
        $payload = $this->payload($one);
        $first = $this->actingAs($one)->postJson('/observations', $payload)->assertCreated()->json('id');
        $this->actingAs($two)->postJson('/observations', $payload)->assertForbidden();
        $this->getJson('/observations/uploads/'.$payload['upload_id'].'?upload_owner_id='.$one->id)->assertForbidden();
        $this->getJson('/observations/uploads/'.$payload['upload_id'].'?upload_owner_id='.$two->id)->assertNotFound();
        $payload['upload_owner_id'] = $two->id;
        $second = $this->postJson('/observations', $payload)->assertCreated()->json('id');
        $this->assertNotSame($first, $second);
        Queue::assertPushed(AnalyzeObservationJob::class, 2);
    }

    public function test_reusing_an_id_for_different_content_is_rejected(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        $this->actingAs($user)->postJson('/observations', $payload)->assertCreated();
        $payload['image'] = UploadedFile::fake()->image('different.jpg', 400, 200);
        $this->postJson('/observations', $payload)->assertConflict();
        $this->assertDatabaseCount('observations', 1);
        Queue::assertPushed(AnalyzeObservationJob::class, 1);
    }

    public function test_deleted_observations_are_not_resurrected_by_retries(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        $id = $this->actingAs($user)->postJson('/observations', $payload)->assertCreated()->json('id');
        $observation = Observation::findOrFail($id);
        $observation->delete();
        $this->getJson('/observations/uploads/'.$payload['upload_id'].'?upload_owner_id='.$user->id)->assertGone();
        $this->postJson('/observations', $payload)->assertGone();
        $observation->forceDelete();
        $this->postJson('/observations', $payload)->assertGone();
        Queue::assertPushed(AnalyzeObservationJob::class, 1);
    }

    public function test_receipt_insert_failure_rolls_back_the_record_and_cleans_staging(): void
    {
        \Illuminate\Support\Facades\DB::unprepared("CREATE TRIGGER reject_receipt BEFORE INSERT ON observation_uploads BEGIN SELECT RAISE(ABORT, 'unavailable'); END");
        $user = User::factory()->create();
        $this->withoutExceptionHandling();
        try {
            $this->actingAs($user)->postJson('/observations', $this->payload($user));
            $this->fail('Expected receipt insertion to fail');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertDatabaseCount('observations', 0);
            $this->assertDatabaseCount('observation_uploads', 0);
            $this->assertSame([], Storage::disk('local')->allFiles());
            Queue::assertNothingPushed();
        }
    }

    public function test_lost_response_after_dispatch_failure_returns_the_same_failed_record(): void
    {
        \Illuminate\Support\Facades\Bus::shouldReceive('dispatch')->once()->andThrow(new \RuntimeException('unavailable'));
        $user = User::factory()->create();
        $payload = $this->payload($user);
        $id = $this->actingAs($user)->postJson('/observations', $payload)->assertCreated()->assertJsonPath('status', 'failed')->json('id');
        $this->postJson('/observations', $payload)->assertCreated()->assertJsonPath('id', $id)->assertJsonPath('status', 'failed');
        $this->assertDatabaseCount('observations', 1);
    }

    public function test_invalid_ids_and_missing_owner_do_not_save_any_image(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user, 'invalid');
        $this->actingAs($user)->postJson('/observations', $payload)->assertUnprocessable();
        $payload = $this->payload($user);
        unset($payload['upload_owner_id']);
        $this->postJson('/observations', $payload)->assertUnprocessable();
        $this->assertSame([], Storage::disk('local')->allFiles());
        Queue::assertNothingPushed();
    }
}
