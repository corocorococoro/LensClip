<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_admin_logs(): void
    {
        $response = $this->get('/admin/logs');

        $response->assertRedirect('/login');
    }

    public function test_unauthenticated_user_cannot_access_admin_settings(): void
    {
        $response = $this->get('/admin/settings/ai');

        $response->assertRedirect('/login');
    }

    public function test_regular_user_cannot_access_admin_logs(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->get('/admin/logs');

        $response->assertStatus(403);
    }

    public function test_regular_user_cannot_access_admin_settings(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->get('/admin/settings/ai');

        $response->assertStatus(403);
    }

    public function test_admin_can_access_admin_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/logs');

        $response->assertStatus(200);
    }

    public function test_admin_can_access_admin_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
    }

    public function test_is_admin_returns_true_for_admin_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->assertTrue($admin->isAdmin());
    }

    public function test_is_admin_returns_false_for_user_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->assertFalse($user->isAdmin());
    }
}
