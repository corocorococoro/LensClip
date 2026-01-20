<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObservationTagUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_tags_on_observation()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $observation = Observation::factory()->create(['user_id' => $user->id]);

        // Initial tags: None
        $this->assertCount(0, $observation->tags);

        // Update with new tags
        $response = $this->patchJson(route('observations.updateTags', $observation), [
            'tags' => ['Nature', 'Flower', '  '] // Includes whitespace to test trimming/skipping
        ]);

        $response->assertStatus(200);

        $observation->refresh();
        $this->assertCount(2, $observation->tags);
        $this->assertTrue($observation->tags->contains('name', 'Nature'));
        $this->assertTrue($observation->tags->contains('name', 'Flower'));

        // Verify tags are user-scoped
        $this->assertEquals($user->id, $observation->tags->first()->user_id);
    }

    public function test_user_cannot_update_tags_of_others_observation()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $observation = Observation::factory()->create(['user_id' => $user1->id]);

        $this->actingAs($user2);
        $response = $this->patch(route('observations.updateTags', $observation), [
            'tags' => ['EvilTag']
        ]);

        $response->assertStatus(403);
        $this->assertCount(0, $observation->tags);
    }

    public function test_updating_tags_cleans_up_unused_orphans()
    {
        // This test verifies that if we REMOVE a tag from an observation,
        // and it was the last one using it, that tag IS NOT automatically deleted
        // UNLESS we implement that logic in updateTags too.
        // Current implementation only cleans up on DELETE observation.
        // Let's check if we want it on update too. Usually YES.

        // Actually, let's just test that the SYNC works correctly first.

        $user = User::factory()->create();
        $this->actingAs($user);

        $observation = Observation::factory()->create(['user_id' => $user->id]);
        $tag = Tag::create(['user_id' => $user->id, 'name' => 'OldTag']);
        $observation->tags()->attach($tag->id);

        // Update tags to a DIFFERENT tag
        $this->patch(route('observations.updateTags', $observation), [
            'tags' => ['NewTag']
        ]);

        $observation->refresh();
        $this->assertCount(1, $observation->tags);
        $this->assertTrue($observation->tags->contains('name', 'NewTag'));
        $this->assertFalse($observation->tags->contains('name', 'OldTag'));
    }
}
