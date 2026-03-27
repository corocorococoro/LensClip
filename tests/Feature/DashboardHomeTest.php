<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardHomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_processing_stats_and_recent_processing_items_first(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $oldReady = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'title' => 'old-ready',
            'created_at' => now()->subMinutes(5),
        ]);

        $processing = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'title' => 'processing-item',
            'created_at' => now()->subMinutes(4),
        ]);

        $newReady = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'title' => 'new-ready',
            'created_at' => now()->subMinutes(1),
        ]);

        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'title' => 'failed-item',
        ]);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Home')
                ->where('stats.total', 4)
                ->where('stats.processing', 1)
                ->has('recent', 3)
                ->where('recent.0.id', $processing->id)
                ->where('recent.1.id', $newReady->id)
                ->where('recent.2.id', $oldReady->id)
        );
    }

    public function test_dashboard_counts_only_current_user_processing_items(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
        ]);

        Observation::factory()->create([
            'user_id' => $otherUser->id,
            'status' => 'processing',
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Home')
                ->where('stats.processing', 1)
                ->has('recent', 1)
        );
    }
}
