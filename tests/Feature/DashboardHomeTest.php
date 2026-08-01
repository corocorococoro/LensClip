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

    public function test_quiz_availability_follows_eligible_ready_count(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // ready + title ありが 2 件ではクイズ導線を出さない
        Observation::factory()->count(2)->create(['user_id' => $user->id]);
        // processing / title 未確定は出題対象に数えない
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing']);
        Observation::factory()->create(['user_id' => $user->id, 'title' => null]);

        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page->where('quizAvailable', false)
        );

        Observation::factory()->create(['user_id' => $user->id]);

        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page->where('quizAvailable', true)
        );
    }

    public function test_magazine_teaser_falls_back_from_current_month_to_previous_month(): void
    {
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-08-15 12:00:00'));

        $user = User::factory()->create();
        $this->actingAs($user);

        // 当月・前月とも発見なし → 導線を出さない
        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page->where('magazine', null)
        );

        // 前月に ready があれば前月号(processing は数えない)
        Observation::factory()->create(['user_id' => $user->id, 'created_at' => '2026-07-10 10:00:00']);
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing', 'created_at' => '2026-08-10 10:00:00']);

        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page
                ->where('magazine.yearMonth', '2026-07')
                ->where('magazine.count', 1)
        );

        // 当月に ready ができたら当月号を優先
        Observation::factory()->create(['user_id' => $user->id, 'created_at' => '2026-08-12 10:00:00']);

        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page
                ->where('magazine.yearMonth', '2026-08')
                ->where('magazine.count', 1)
        );
    }
}
