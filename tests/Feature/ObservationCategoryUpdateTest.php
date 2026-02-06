<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObservationCategoryUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_observation_category(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
            'category' => 'other',
        ]);

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/category", [
                'category' => 'plant',
            ]);

        $response->assertOk();
        $response->assertJson(['category' => 'plant']);
        $this->assertDatabaseHas('observations', [
            'id' => $observation->id,
            'category' => 'plant',
        ]);
    }

    public function test_invalid_category_is_rejected(): void
    {
        $user = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->patchJson("/observations/{$observation->id}/category", [
                'category' => 'nonexistent_category',
            ]);

        $response->assertStatus(422);
    }

    public function test_other_user_cannot_update_category(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $observation = Observation::factory()->create([
            'user_id' => $owner->id,
        ]);

        $response = $this->actingAs($other)
            ->patchJson("/observations/{$observation->id}/category", [
                'category' => 'plant',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_update_category(): void
    {
        $observation = Observation::factory()->create();

        $response = $this->patchJson("/observations/{$observation->id}/category", [
            'category' => 'plant',
        ]);

        $response->assertStatus(401);
    }

    public function test_category_filter_uses_column(): void
    {
        $user = User::factory()->create();

        Observation::factory()->create([
            'user_id' => $user->id,
            'category' => 'plant',
            'title' => 'Tulip',
        ]);
        Observation::factory()->create([
            'user_id' => $user->id,
            'category' => 'animal',
            'title' => 'Cat',
        ]);

        $response = $this->actingAs($user)
            ->get('/library?view=category&category=plant');

        $response->assertStatus(200);
    }
}
