<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_user_cannot_access_metrics(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->get('/admin/metrics');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_metrics(): void
    {
        $response = $this->get('/admin/metrics');

        $response->assertRedirect('/login');
    }

    public function test_admin_sees_funnel_counting_first_and_second_observations(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // 今週登録: 記録2件(2件目まで到達)、記録1件、記録0件
        $reachedSecond = User::factory()->create(['created_at' => now()]);
        Observation::factory()->count(2)->create(['user_id' => $reachedSecond->id]);

        $reachedFirst = User::factory()->create(['created_at' => now()]);
        Observation::factory()->create(['user_id' => $reachedFirst->id]);

        User::factory()->create(['created_at' => now()]);

        $response = $this->actingAs($admin)->get('/admin/metrics');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Metrics')
            ->has('funnel', 8)
            // 最後の要素が今週のコホート(admin 含め4人登録)
            ->where('funnel.7.registered', 4)
            ->where('funnel.7.firstObservation', 2)
            ->where('funnel.7.secondObservation', 1)
        );
    }

    public function test_retention_counts_user_active_on_day_n(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'created_at' => now()]);

        // 10日前に登録し、翌日(D1)に記録したユーザー
        $retained = User::factory()->create(['created_at' => now()->subDays(10)]);
        Observation::factory()->create([
            'user_id' => $retained->id,
            'created_at' => now()->subDays(10)->addDay(),
        ]);

        // 10日前に登録し、記録なしのユーザー
        User::factory()->create(['created_at' => now()->subDays(10)]);

        $response = $this->actingAs($admin)->get('/admin/metrics');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Metrics')
            ->where('retention.0.day', 1)
            ->where('retention.0.eligible', 2)
            ->where('retention.0.retained', 1)
            // D30 は誰も丸30日経過していないので分母0
            ->where('retention.2.day', 30)
            ->where('retention.2.eligible', 0)
            ->where('retention.2.retained', 0)
        );
    }

    public function test_usage_distribution_counts_current_month_per_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $heavy = User::factory()->create();
        Observation::factory()->count(3)->create(['user_id' => $heavy->id]);

        $light = User::factory()->create();
        Observation::factory()->create(['user_id' => $light->id]);

        // 先月の記録は今月の利用量に含めない
        Observation::factory()->create([
            'user_id' => $light->id,
            'created_at' => now()->subMonthNoOverflow()->startOfMonth(),
        ]);

        $response = $this->actingAs($admin)->get('/admin/metrics');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Metrics')
            ->where('usage.activeUsers', 2)
            ->where('usage.totalAnalyses', 4)
            ->where('usage.max', 3)
        );
    }

    public function test_ai_cost_shows_missing_unit_cost_without_amount(): void
    {
        config(['ai_costs.per_analysis_jpy' => ['model-priced' => 2.0]]);

        $admin = User::factory()->create(['role' => 'admin']);

        Observation::factory()->count(2)->create(['gemini_model' => 'model-priced']);
        Observation::factory()->create(['gemini_model' => 'model-unpriced']);

        $response = $this->actingAs($admin)->get('/admin/metrics');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Metrics')
            ->has('aiCost.models', 2)
            ->where('aiCost.totalJpy', 4)
            ->where('aiCost.hasMissingUnitCost', true)
        );
    }

    public function test_soft_deleted_observations_still_count_as_activity_and_cost(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $user = User::factory()->create(['created_at' => now()]);
        $observation = Observation::factory()->create(['user_id' => $user->id]);
        $observation->delete();

        $response = $this->actingAs($admin)->get('/admin/metrics');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Metrics')
            ->where('funnel.7.firstObservation', 1)
            ->where('usage.totalAnalyses', 1)
        );
    }
}
