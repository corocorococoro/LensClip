<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrivateObservationImagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_cloud_images_require_the_owner_and_never_redirect_to_public_storage(): void
    {
        config(['filesystems.default' => 'gcs']);
        Storage::fake('gcs');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $observation = Observation::factory()->for($owner)->create([
            'original_path' => 'observations/original.webp',
            'cropped_path' => 'observations/cropped.webp',
            'thumb_path' => 'observations/thumb.webp',
        ]);
        foreach (['original', 'cropped', 'thumb'] as $variant) {
            $path = $observation->{$variant.'_path'};
            Storage::disk('gcs')->put($path, 'private-'.$variant);
            $url = $observation->{$variant.'_url'};
            $this->assertStringContainsString('/observations/'.$observation->id.'/', $url);
            $this->get($url)->assertRedirect(route('login'));
            $this->actingAs($other)->get($url)->assertForbidden();
            $this->actingAs($owner)->get($url)->assertOk()
                ->assertContent('private-'.$variant)
                ->assertHeader('Cache-Control', 'no-store, private')
                ->assertHeader('X-Content-Type-Options', 'nosniff');
            auth()->forgetGuards();
        }
    }

    public function test_staged_original_is_not_served_and_staged_thumbnail_stays_private(): void
    {
        config(['filesystems.default' => 'gcs']);
        Storage::fake('local');
        Storage::fake('gcs');
        $owner = User::factory()->create();
        $observation = Observation::factory()->for($owner)->create([
            'original_path' => 'local:pending/original.jpg',
            'thumb_path' => 'local:pending/thumb.webp',
        ]);
        Storage::disk('local')->put('pending/original.jpg', 'raw-with-metadata');
        Storage::disk('local')->put('pending/thumb.webp', 'normalized-thumbnail');
        $this->actingAs($owner)->get(route('observations.image', [$observation, 'original']))->assertNotFound();
        $this->get($observation->thumb_url)->assertOk()->assertContent('normalized-thumbnail');
        Storage::disk('local')->delete('pending/thumb.webp');
        $this->get($observation->thumb_url)->assertNotFound();
    }
}
