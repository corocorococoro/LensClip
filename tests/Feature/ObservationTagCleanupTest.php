<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObservationTagCleanupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_orphan_tag_is_deleted_when_observation_is_deleted()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // 1. Arrange: Create observation with a unique tag
        $observation = Observation::factory()->create(['user_id' => $user->id]);
        $tag = Tag::create(['user_id' => $user->id, 'name' => 'UniqueTag']);
        $observation->tags()->attach($tag->id);

        // Verify tag exists
        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'UniqueTag']);
        $this->assertEquals(1, $tag->observations()->count());

        // 2. Act: Delete the observation via API
        $response = $this->deleteJson(route('observations.destroy', $observation)); // Use deleteJson to see errors

        $response->assertStatus(204);

        // 3. Assert: Observation is soft deleted (or deleted)
        $this->assertSoftDeleted($observation);

        // Assert: Tag should be DELETED because it's orphaned
        $this->assertDatabaseMissing('tags', ['id' => $tag->id]);
    }

    public function test_shared_tag_is_kept_when_one_observation_is_deleted()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // 1. Arrange: Create two observations sharing the same tag
        $observation1 = Observation::factory()->create(['user_id' => $user->id]);
        $observation2 = Observation::factory()->create(['user_id' => $user->id]);

        $tag = Tag::create(['user_id' => $user->id, 'name' => 'SharedTag']);

        $observation1->tags()->attach($tag->id);
        $observation2->tags()->attach($tag->id);

        // Verify tag usage
        $this->assertEquals(2, $tag->observations()->count());

        // 2. Act: Delete only observation 1
        $this->delete(route('observations.destroy', $observation1));

        // 3. Assert: Observation 1 is deleted
        $this->assertSoftDeleted($observation1);

        // Assert: Tag should STILL EXIST because observation 2 needs it
        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'SharedTag']);

        // Tag count check (for active observations)
        // With SoftDeletes, the pivot row for obs1 usually remains unless explicitly detached.
        // But our logic counts $tag->observations()->count().
        // If default relation excludes soft deleted, count should be 1.
        $this->assertEquals(1, $tag->observations()->count());
    }
}
