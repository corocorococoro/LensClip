<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MagazineTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('magazine.index'))->assertRedirect(route('login'));
        $this->get(route('magazine.show', ['yearMonth' => '2026-07']))->assertRedirect(route('login'));
    }

    public function test_issue_contains_only_own_ready_observations_with_processing_note(): void
    {
        $this->travelTo(Carbon::parse('2026-07-20 12:00:00'));

        $user = User::factory()->create();
        $other = User::factory()->create();

        $ready = Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => '2026-07-05 10:00:00',
        ]);
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'created_at' => '2026-07-06 10:00:00',
        ]);
        Observation::factory()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'created_at' => '2026-07-07 10:00:00',
        ]);
        Observation::factory()->create([
            'user_id' => $other->id,
            'created_at' => '2026-07-08 10:00:00',
        ]);

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page) => $page
                    ->component('Magazine/Show')
                    ->where('yearMonth', '2026-07')
                    ->where('isEmpty', false)
                    ->has('entries', 1)
                    ->where('entries.0.id', $ready->id)
                    ->where('processingCount', 1)
            );
    }

    public function test_month_boundaries_use_app_timezone(): void
    {
        $this->travelTo(Carbon::parse('2026-08-15 12:00:00'));

        $user = User::factory()->create();
        $july = Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => '2026-07-31 23:59:59',
        ]);
        $august = Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => '2026-08-01 00:00:00',
        ]);

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertInertia(
                fn (Assert $page) => $page
                    ->has('entries', 1)
                    ->where('entries.0.id', $july->id)
            );

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-08']))
            ->assertInertia(
                fn (Assert $page) => $page
                    ->has('entries', 1)
                    ->where('entries.0.id', $august->id)
                    ->where('isCurrentMonth', true)
            );
    }

    public function test_past_empty_month_shows_empty_state_and_future_or_invalid_months_are_404(): void
    {
        $this->travelTo(Carbon::parse('2026-08-15 12:00:00'));

        $user = User::factory()->create();
        $this->actingAs($user);

        // 過去の 0 件月は空状態(オーナー自身の URL 操作なので 404 にしない)
        $this->get(route('magazine.show', ['yearMonth' => '2026-03']))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page) => $page
                    ->where('isEmpty', true)
                    ->has('entries', 0)
            );

        // 未来月・不正な月・形式外は 404
        $this->get(route('magazine.show', ['yearMonth' => '2026-09']))->assertNotFound();
        $this->get(route('magazine.show', ['yearMonth' => '2026-13']))->assertNotFound();
        $this->get(route('magazine.show', ['yearMonth' => '2026-00']))->assertNotFound();
        $this->get('/magazine/abc')->assertNotFound();
    }

    public function test_archive_lists_only_months_with_own_ready_observations_in_descending_order(): void
    {
        $this->travelTo(Carbon::parse('2026-08-15 12:00:00'));

        $user = User::factory()->create();
        $other = User::factory()->create();

        Observation::factory()->count(2)->create(['user_id' => $user->id, 'created_at' => '2026-06-10 10:00:00']);
        Observation::factory()->create(['user_id' => $user->id, 'created_at' => '2026-08-01 10:00:00']);
        // 対象外: processing のみの月 / 他ユーザーだけの月
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing', 'created_at' => '2026-07-10 10:00:00']);
        Observation::factory()->create(['user_id' => $other->id, 'created_at' => '2026-05-10 10:00:00']);

        $this->actingAs($user)->get(route('magazine.index'))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page) => $page
                    ->component('Magazine/Index')
                    ->has('issues', 2)
                    ->where('issues.0.yearMonth', '2026-08')
                    ->where('issues.0.count', 1)
                    ->where('issues.1.yearMonth', '2026-06')
                    ->where('issues.1.count', 2)
            );
    }

    public function test_cover_prefers_oldest_milestone_observation_then_first_of_month(): void
    {
        $this->travelTo(Carbon::parse('2026-07-20 12:00:00'));

        $user = User::factory()->create();

        $first = Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => '2026-07-01 10:00:00',
            'milestones' => [],
        ]);
        $milestone = Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => '2026-07-10 10:00:00',
            'milestones' => [['type' => 'count', 'value' => 10]],
        ]);

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertInertia(
                fn (Assert $page) => $page->where('cover.id', $milestone->id)
            );

        // 節目つきが消えたら月内最初の記録が表紙になる
        $milestone->delete();

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertInertia(
                fn (Assert $page) => $page->where('cover.id', $first->id)
            );
    }

    public function test_category_breakdown_counts_exclude_null_category_and_entries_are_ascending(): void
    {
        $this->travelTo(Carbon::parse('2026-07-20 12:00:00'));

        $user = User::factory()->create();

        $second = Observation::factory()->create([
            'user_id' => $user->id,
            'category' => 'insect',
            'created_at' => '2026-07-10 10:00:00',
        ]);
        $firstEntry = Observation::factory()->create([
            'user_id' => $user->id,
            'category' => 'insect',
            'created_at' => '2026-07-02 10:00:00',
        ]);
        Observation::factory()->create([
            'user_id' => $user->id,
            'category' => null,
            'created_at' => '2026-07-05 10:00:00',
        ]);

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertInertia(function (Assert $page) use ($firstEntry, $second) {
                $page->has('entries', 3)
                    ->where('entries.0.id', $firstEntry->id)
                    ->where('entries.2.id', $second->id);

                $breakdown = collect($page->toArray()['props']['categoryBreakdown']);
                $this->assertSame(
                    [['id' => 'insect', 'count' => 2]],
                    $breakdown->map(fn ($row) => ['id' => $row['id'], 'count' => $row['count']])->all(),
                );

                return $page;
            });
    }

    public function test_entry_payload_is_minimal_and_does_not_leak_ai_json(): void
    {
        $this->travelTo(Carbon::parse('2026-07-20 12:00:00'));

        $user = User::factory()->create();
        Observation::factory()->create([
            'user_id' => $user->id,
            'kid_friendly' => null,
            'created_at' => '2026-07-05 10:00:00',
            'ai_json' => [
                'fun_facts' => ['まめちしき'],
                'safety_notes' => ['ひみつ'],
            ],
        ]);

        $this->actingAs($user)->get(route('magazine.show', ['yearMonth' => '2026-07']))
            ->assertInertia(function (Assert $page) {
                $entry = $page->toArray()['props']['entries'][0];
                $this->assertEqualsCanonicalizing(
                    ['id', 'image_url', 'date', 'title', 'category', 'description', 'milestones'],
                    array_keys($entry),
                );
                // kid_friendly が無い場合は fun_facts の先頭にフォールバック
                $this->assertSame('まめちしき', $entry['description']);

                return $page;
            });
    }
}
