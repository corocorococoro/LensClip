<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ObservationCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_image_and_create_observation(): void
    {
        Storage::fake('local');
        Queue::fake();

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->post('/observations', [
                'image' => UploadedFile::fake()->image('test.jpg', 800, 600),
            ]);

        // Assert observation was created with local: prefixed paths
        $this->assertDatabaseHas('observations', [
            'user_id' => $user->id,
            'status' => 'processing',
        ]);

        // Assert job was dispatched
        Queue::assertPushed(AnalyzeObservationJob::class);

        // Files are stored on local disk (pending GCS upload by the job)
        $observation = Observation::first();
        $response->assertRedirect(route('observations.show', $observation));

        $this->assertStringStartsWith('local:', $observation->original_path);
        $this->assertStringStartsWith('local:', $observation->thumb_path);
        $originalLocalPath = substr($observation->original_path, 6);
        $thumbLocalPath = substr($observation->thumb_path, 6);

        Storage::disk('local')->assertExists($originalLocalPath);
        Storage::disk('local')->assertExists($thumbLocalPath);

        // Original is stored as raw upload bytes; thumbnail is pre-generated WebP for immediate preview.
        $this->assertFalse(str_starts_with(Storage::disk('local')->get($originalLocalPath), 'RIFF'));
        $this->assertStringStartsWith('RIFF', Storage::disk('local')->get($thumbLocalPath));
    }

    public function test_observation_requires_image(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->post('/observations', []);

        $response->assertSessionHasErrors('image');
    }

    public function test_observation_rejects_invalid_file(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->post('/observations', [
                'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
            ]);

        $response->assertSessionHasErrors('image');
    }

    public function test_unauthenticated_user_cannot_create_observation(): void
    {
        $response = $this->post('/observations', [
            'image' => UploadedFile::fake()->image('test.jpg'),
        ]);

        $response->assertRedirect('/login');
    }

    public function test_user_can_view_own_observation(): void
    {
        $user = User::factory()->create();
        $observation = Observation::create([
            'user_id' => $user->id,
            'status' => 'ready',
            'original_path' => 'test/original.webp',
            'thumb_path' => 'test/thumb.webp',
            'title' => 'Test',
        ]);

        $response = $this->actingAs($user)
            ->getJson("/observations/{$observation->id}");

        $response->assertOk();
        $response->assertJson(['id' => $observation->id, 'title' => 'Test']);
    }

    public function test_show_returns_observation_show_for_all_statuses(): void
    {
        $user = User::factory()->create();

        foreach (['processing', 'ready', 'failed'] as $status) {
            $observation = Observation::factory()->create([
                'user_id' => $user->id,
                'status' => $status,
                'error_message' => $status === 'failed' ? 'AI分析に失敗しました' : null,
            ]);

            $response = $this->actingAs($user)->get(route('observations.show', $observation));

            $response->assertOk();
            $response->assertInertia(
                fn (Assert $page) => $page
                    ->component('Observations/Show')
                    ->where('observation.id', $observation->id)
                    ->where('observation.status', $status)
            );
        }
    }

    public function test_thumb_returns_404_when_thumb_path_is_empty(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'thumb_path' => '',
        ]);

        $this->actingAs($user)
            ->get(route('observations.thumb', $observation))
            ->assertNotFound();
    }

    public function test_user_can_fetch_lightweight_statuses_for_own_observations(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ready = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'title' => 'Ready Item',
        ]);
        $failed = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'title' => 'Failed Item',
        ]);
        $other = Observation::factory()->create([
            'user_id' => $otherUser->id,
            'status' => 'ready',
            'title' => 'Other Item',
        ]);

        $response = $this->actingAs($user)->getJson(route('observations.statuses', [
            'ids' => [$ready->id, $failed->id, $other->id],
        ]));

        $response->assertOk();
        $response->assertJsonFragment(['id' => $ready->id, 'status' => 'ready']);
        $response->assertJsonFragment(['id' => $failed->id, 'status' => 'failed']);
        $response->assertJsonMissing(['id' => $other->id]);
        $this->assertCount(2, $response->json('observations'));
    }

    public function test_statuses_include_milestones_for_completed_cards(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'milestones' => [['type' => 'first_discovery']],
        ]);

        $response = $this->actingAs($user)->getJson(route('observations.statuses', [
            'ids' => [$observation->id],
        ]));

        // 図鑑で解析完了を待つ場合もポーリング更新で節目バッジが出るようにする
        $response->assertOk();
        $this->assertSame(
            [['type' => 'first_discovery']],
            $response->json('observations.0.milestones')
        );
    }

    public function test_user_cannot_view_others_observation(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $observation = Observation::create([
            'user_id' => $user1->id,
            'status' => 'ready',
            'original_path' => 'test/original.webp',
            'thumb_path' => 'test/thumb.webp',
        ]);

        $response = $this->actingAs($user2)
            ->getJson("/observations/{$observation->id}");

        $response->assertForbidden();
    }
}
