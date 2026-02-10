<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class ObservationListTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_filter_observations_by_search_query()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create observations with different titles
        Observation::factory()->create(['user_id' => $user->id, 'title' => 'Apple Fruit']);
        Observation::factory()->create(['user_id' => $user->id, 'title' => 'Banana Yellow']);

        // Search for 'Apple' (date view returns observations inside dateGroups)
        $response = $this->get(route('library', ['q' => 'Apple']));

        $response->assertStatus(200);
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Library')
                ->has('dateGroups', 1)
                ->has('dateGroups.0.observations', 1)
                ->where('dateGroups.0.observations.0.title', 'Apple Fruit')
        );
    }

    public function test_user_can_filter_observations_by_tag()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create observations
        $obsWithTag = Observation::factory()->create(['user_id' => $user->id, 'title' => 'Tagged Item']);
        $obsWithoutTag = Observation::factory()->create(['user_id' => $user->id, 'title' => 'Plain Item']);

        $tag = Tag::create(['user_id' => $user->id, 'name' => 'Nature']);
        $obsWithTag->tags()->attach($tag->id);

        // Filter by 'Nature' tag (date view returns observations inside dateGroups)
        $response = $this->get(route('library', ['tag' => 'Nature']));

        $response->assertStatus(200);
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Library')
                ->has('dateGroups', 1)
                ->has('dateGroups.0.observations', 1)
                ->where('dateGroups.0.observations.0.title', 'Tagged Item')
        );
    }

    public function test_user_cannot_see_others_observations_in_list()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Observation::factory()->create(['user_id' => $user1->id, 'title' => 'User 1 Item']);
        Observation::factory()->create(['user_id' => $user2->id, 'title' => 'User 2 Item']);

        $this->actingAs($user1);
        $response = $this->get(route('library'));

        $response->assertInertia(
            fn(Assert $page) => $page
                ->has('dateGroups', 1)
                ->has('dateGroups.0.observations', 1)
                ->where('dateGroups.0.observations.0.title', 'User 1 Item')
        );
    }
}
