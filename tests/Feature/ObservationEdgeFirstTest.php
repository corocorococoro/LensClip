<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObservationEdgeFirstTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_edge_first_observation_without_media(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/observations/edge-first', [
            'title' => 'あかい くるま',
            'summary' => 'ローカル推論で同定した結果です。',
            'kid_friendly' => 'ぴかぴかの くるまだよ',
            'category' => 'vehicle',
            'confidence' => 0.91,
            'ai_json' => [
                'title' => 'あかい くるま',
                'tags' => ['car', 'red'],
            ],
            'client_ref' => 'device-job-1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'ready')
            ->assertJsonPath('media_uploaded', false)
            ->assertJsonPath('title', 'あかい くるま');

        $this->assertDatabaseHas('observations', [
            'user_id' => $user->id,
            'status' => 'ready',
            'media_uploaded' => false,
            'client_ref' => 'device-job-1',
            'original_path' => 'pending://edge-first',
            'thumb_path' => 'pending://edge-first',
        ]);
    }

    public function test_user_can_upload_media_later_for_edge_first_observation(): void
    {
        $defaultDisk = config('filesystems.default');
        Storage::fake($defaultDisk);

        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'media_uploaded' => false,
            'media_uploaded_at' => null,
            'original_path' => 'pending://edge-first',
            'thumb_path' => 'pending://edge-first',
        ]);

        $response = $this->actingAs($user)->postJson("/observations/{$observation->id}/media", [
            'image' => UploadedFile::fake()->image('flower.jpg', 1200, 900),
        ]);

        $response->assertOk()
            ->assertJsonPath('media_uploaded', true);

        $observation->refresh();
        $this->assertTrue($observation->media_uploaded);
        $this->assertNotNull($observation->media_uploaded_at);
        $this->assertStringStartsWith('observations/', $observation->original_path);
        $this->assertStringStartsWith('observations/', $observation->thumb_path);

        Storage::disk($defaultDisk)->assertExists($observation->original_path);
        Storage::disk($defaultDisk)->assertExists($observation->thumb_path);
    }

    public function test_user_cannot_upload_media_to_other_users_observation(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $owner->id,
            'media_uploaded' => false,
            'original_path' => 'pending://edge-first',
            'thumb_path' => 'pending://edge-first',
        ]);

        $response = $this->actingAs($other)->postJson("/observations/{$observation->id}/media", [
            'image' => UploadedFile::fake()->image('x.jpg', 800, 600),
        ]);

        $response->assertForbidden();
    }
}
