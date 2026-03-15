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

        $response->assertRedirect();

        // Assert observation was created with local: prefixed paths
        $this->assertDatabaseHas('observations', [
            'user_id' => $user->id,
            'status' => 'processing',
        ]);

        // Assert job was dispatched
        Queue::assertPushed(AnalyzeObservationJob::class);

        // Files are stored on local disk (pending GCS upload by the job)
        $observation = Observation::first();
        $this->assertStringStartsWith('local:', $observation->original_path);
        $this->assertStringStartsWith('local:', $observation->thumb_path);
        $originalLocalPath = substr($observation->original_path, 6);
        $thumbLocalPath = substr($observation->thumb_path, 6);

        Storage::disk('local')->assertExists($originalLocalPath);
        Storage::disk('local')->assertExists($thumbLocalPath);

        // Original is stored as raw upload bytes; thumbnail is pre-generated WebP for immediate preview.
        $this->assertStringNotStartsWith('RIFF', Storage::disk('local')->get($originalLocalPath));
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
