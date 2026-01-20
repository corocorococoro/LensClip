<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObservationBulkDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_delete_all_own_observations()
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $this->actingAs($user);

        // Create 3 observations for this user
        Observation::factory()->count(3)->create(['user_id' => $user->id]);

        $this->assertCount(3, Observation::where('user_id', $user->id)->get());

        // Call destroyAll
        $response = $this->delete(route('observations.destroyAll'), ['confirm' => true]);

        $response->assertStatus(302); // Redirect back

        // Count should be 0 (soft deleted)
        $this->assertCount(0, Observation::where('user_id', $user->id)->get());

        // Count total matching soft deleted
        $this->assertEquals(3, Observation::onlyTrashed()->where('user_id', $user->id)->count());
    }

    public function test_user_cannot_delete_others_observations_via_bulk_delete()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Observation::factory()->count(3)->create(['user_id' => $user1->id]);
        Observation::factory()->count(2)->create(['user_id' => $user2->id]);

        $this->actingAs($user1);
        $this->delete(route('observations.destroyAll'), ['confirm' => true]);

        // User 1's observations should be gone
        $this->assertEquals(0, Observation::where('user_id', $user1->id)->count());

        // User 2's observations should STILL BE THERE
        $this->assertEquals(2, Observation::where('user_id', $user2->id)->count());
    }
}
