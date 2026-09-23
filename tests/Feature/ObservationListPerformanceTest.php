<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ObservationListPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_date_and_category_pagination_do_not_skip_equal_timestamps(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $ids = Observation::factory()->count(31)->create([
            'user_id' => $user->id, 'created_at' => '2026-09-01 12:00:00', 'category' => 'insect',
        ])->pluck('id')->all();
        foreach (['date', 'category'] as $view) {
            $seen = [];
            $cursor = null;
            do {
                $response = $this->getJson('/library?'.http_build_query([
                    'view' => $view, 'category' => 'insect', 'cursor' => $cursor,
                ]))->assertOk();
                $items = $view === 'date' ? collect($response->json('dateGroups'))->flatMap(fn ($group) => $group['observations'])->all()
                    : $response->json('observations');
                foreach ($items as $item) {
                    $seen[] = $item['id'];
                    $this->assertArrayNotHasKey('ai_json', $item);
                    $this->assertArrayNotHasKey('vision_objects', $item);
                    $this->assertArrayNotHasKey('processing_token', $item);
                }
                $cursor = $response->json('pagination.nextCursor');
                $this->assertLessThanOrEqual(31, count($seen));
            } while ($response->json('pagination.hasMore'));
            $this->assertEqualsCanonicalizing($ids, $seen);
            $this->assertCount(31, array_unique($seen));
        }
    }

    public function test_home_partial_reload_only_queries_requested_observation_data(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing']);
        DB::enableQueryLog();
        DB::flushQueryLog();
        $response = $this->get(route('dashboard'), [
            'X-Inertia' => 'true', 'X-Inertia-Version' => app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()), 'X-Inertia-Partial-Component' => 'Home',
            'X-Inertia-Partial-Data' => 'stats,recent',
        ])->assertOk();
        $queries = array_filter(DB::getQueryLog(), fn ($query) => str_contains($query['query'], 'from "observations"'));
        DB::disableQueryLog();
        $this->assertCount(4, $queries, 'Only three counters and recent cards should query observations.');
        $response->assertJsonMissingPath('props.lookback')->assertJsonMissingPath('props.magazine')->assertJsonMissingPath('props.quizAvailable');
        $response->assertJsonMissingPath('props.recent.0.ai_json');
    }
}
