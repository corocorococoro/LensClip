<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LibraryActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_unfinished_photos_remain_accessible_outside_search_category_and_map(): void
    {
        $user = User::factory()->create();
        $processing = Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing', 'category' => null, 'latitude' => null, 'longitude' => null]);
        $failed = Observation::factory()->create(['user_id' => $user->id, 'status' => 'failed']);
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'ready']);
        Observation::factory()->create(['status' => 'processing']);

        $this->actingAs($user)->get('/library?activity=1&view=map&q=no-match&tag=no-match&category=animal')
            ->assertInertia(fn (Assert $page) => $page->component('Library')
                ->where('viewMode', 'date')->where('activityCount', 2)
                ->where('filters.activity', '1')->has('dateGroups.0.observations', 2));
        $items = collect($this->getJson('/library?activity=1')->assertOk()->json('dateGroups'))->flatMap(fn ($group) => $group['observations']);
        $this->assertEqualsCanonicalizing([$processing->id, $failed->id], $items->pluck('id')->all());
    }

    public function test_activity_paginates_without_including_completed_or_foreign_records(): void
    {
        $user = User::factory()->create();
        $ids = Observation::factory()->count(31)->create(['user_id' => $user->id, 'status' => 'processing'])->pluck('id')->all();
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'ready']);
        $this->actingAs($user);
        $first = $this->getJson('/library?activity=1')->assertOk();
        $second = $this->getJson('/library?activity=1&cursor='.urlencode($first->json('pagination.nextCursor')))->assertOk();
        $seen = collect([...$first->json('dateGroups'), ...$second->json('dateGroups')])->flatMap(fn ($group) => $group['observations'])->pluck('id')->all();
        $this->assertEqualsCanonicalizing($ids, $seen);
        $second->assertJsonPath('pagination.hasMore', false);
    }

    public function test_retry_keeps_a_safe_collection_return_destination(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create(['user_id' => $user->id, 'status' => 'failed']);
        \Illuminate\Support\Facades\Bus::fake();
        $this->actingAs($user)->post("/observations/{$observation->id}/retry", ['return_to' => '/library?view=category&category=plant'])
            ->assertRedirect(route('observations.show', ['observation' => $observation, 'return_to' => '/library?view=category&category=plant']));
        $observation->refresh()->update(['status' => 'failed']);
        $this->post("/observations/{$observation->id}/retry", ['return_to' => 'https://example.com'])
            ->assertRedirect(route('observations.show', $observation));
    }
}
