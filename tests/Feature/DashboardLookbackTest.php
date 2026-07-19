<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardLookbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // 季節・日付窓の判定を決定的にするため時刻を固定する
        $this->travelTo(Carbon::create(2026, 7, 14, 10));
    }

    public function test_lookback_is_null_for_user_without_observations(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Home')
                ->where('lookback', null)
            );
    }

    public function test_recent_observations_are_not_resurfaced(): void
    {
        $user = User::factory()->create();
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'created_at' => now()->subDays(3),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('lookback', null));
    }

    public function test_one_year_ago_is_preferred(): void
    {
        $user = User::factory()->create();

        $yearAgo = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'created_at' => now()->subYear()->addDay(),
        ]);
        // 同じ季節の別の記録(優先度は下)
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'created_at' => now()->subDays(20),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lookback.label', '1年前のきょう')
                ->where('lookback.observation.id', $yearAgo->id)
            );
    }

    public function test_falls_back_to_one_month_ago(): void
    {
        $user = User::factory()->create();
        $monthAgo = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'created_at' => now()->subMonthNoOverflow()->subDay(),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lookback.label', '1か月前の はっけん')
                ->where('lookback.observation.id', $monthAgo->id)
            );
    }

    public function test_falls_back_to_same_season(): void
    {
        $user = User::factory()->create();
        // 20日前(夏)。1年前・1か月前の日付窓には入らない
        $seasonal = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'created_at' => now()->subDays(20),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lookback.label', 'おなじ きせつの はっけん')
                ->where('lookback.observation.id', $seasonal->id)
            );
    }

    public function test_falls_back_to_nearby_location(): void
    {
        $user = User::factory()->create();

        // 直近の記録(アンカー): 座標あり、新しいので振り返り対象外
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'latitude' => 35.68,
            'longitude' => 139.76,
            'created_at' => now()->subDays(2),
        ]);

        // 春(別season)の近所の記録 → ①②③に該当せず④で拾われる
        $nearby = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'latitude' => 35.681,
            'longitude' => 139.761,
            'created_at' => Carbon::create(2026, 3, 10),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lookback.label', 'この ばしょの ちかくの はっけん')
                ->where('lookback.observation.id', $nearby->id)
            );
    }

    public function test_falls_back_to_first_discovery(): void
    {
        $user = User::factory()->create();
        // 春(別season)・座標なし → ⑤いちばん最初の発見
        $first = Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'ready',
            'latitude' => null,
            'longitude' => null,
            'created_at' => Carbon::create(2026, 3, 10),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('lookback.label', 'いちばん さいしょの はっけん')
                ->where('lookback.observation.id', $first->id)
            );
    }

    public function test_lookback_never_shows_other_users_or_unready_observations(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Observation::factory()->create([
            'user_id' => $other->id,
            'status' => 'ready',
            'created_at' => now()->subYear(),
        ]);
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'created_at' => now()->subYear(),
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('lookback', null));
    }
}
