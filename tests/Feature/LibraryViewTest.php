<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LibraryViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_library_date_groups_have_correct_year_month_format()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create observations in different months/years
        $date1 = Carbon::create(2025, 12, 15, 12, 0, 0);
        $date2 = Carbon::create(2026, 1, 15, 12, 0, 0);

        Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => $date1,
            'updated_at' => $date1,
        ]);

        Observation::factory()->create([
            'user_id' => $user->id,
            'created_at' => $date2,
            'updated_at' => $date2,
        ]);

        $response = $this->get(route('library'));

        $response->assertStatus(200);

        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Library')
                ->has('dateGroups', 2)
                ->where('dateGroups.0.yearMonth', '2026-01')
                ->where('dateGroups.0.label', '2026年1月')
                ->where('dateGroups.1.yearMonth', '2025-12')
                ->where('dateGroups.1.label', '2025年12月')
                ->has('categories')
                ->has('pagination')
                ->where('pagination.hasMore', false)
        );
    }

    public function test_library_passes_categories_props()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('library'));

        $response->assertStatus(200);

        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Library')
                ->has('categories')
                ->where('categories.0.id', 'animal')
        );
    }
}
