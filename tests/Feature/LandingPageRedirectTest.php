<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPageRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_sees_welcome_page(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page->component('Welcome'));
    }

    public function test_authenticated_user_is_redirected_to_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/');

        $response->assertRedirect(route('dashboard'));
    }
}
