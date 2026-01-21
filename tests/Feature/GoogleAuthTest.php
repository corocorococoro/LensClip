<?php

namespace Tests\Feature;

use App\Models\AuthIdentity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Tests\TestCase;
use Mockery;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function mockSocialite($email = 'test@example.com', $id = '1234567890', $name = 'Test User')
    {
        $abstractUser = Mockery::mock('Laravel\Socialite\Two\User');
        $abstractUser->shouldReceive('getId')->andReturn($id);
        $abstractUser->shouldReceive('getEmail')->andReturn($email);
        $abstractUser->shouldReceive('getName')->andReturn($name);

        $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_redirect_to_google()
    {
        $response = $this->get(route('auth.google.redirect'));
        $response->assertRedirect();
        $this->assertStringContainsString('accounts.google.com', $response->getTargetUrl());
    }

    public function test_callback_creates_new_user()
    {
        $this->mockSocialite('newuser@example.com', 'google-123');

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();

        $user = User::where('email', 'newuser@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->password);

        $this->assertDatabaseHas('auth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'subject' => 'google-123',
        ]);
    }

    public function test_callback_logs_in_existing_google_user()
    {
        // Setup existing user linked to Google
        $user = User::factory()->create(['email' => 'existing@example.com']);
        AuthIdentity::create([
            'user_id' => $user->id,
            'provider' => 'google',
            'issuer' => 'https://accounts.google.com',
            'subject' => 'google-existing',
            'email_at_link' => 'existing@example.com',
        ]);

        $this->mockSocialite('existing@example.com', 'google-existing');

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_callback_redirects_to_link_confirmation_if_email_exists_but_not_linked()
    {
        // Setup existing user NOT linked
        $user = User::factory()->create(['email' => 'conflict@example.com']);

        $this->mockSocialite('conflict@example.com', 'google-new');

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('auth.google.link'));
        $this->assertGuest();

        $this->assertEquals('conflict@example.com', session('google_link')['email']);
    }

    public function test_link_process_links_account_with_correct_password()
    {
        $user = User::factory()->create([
            'email' => 'linkme@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->withSession([
            'google_link' => [
                'issuer' => 'https://accounts.google.com',
                'subject' => 'google-link-id',
                'email' => 'linkme@example.com',
                'name' => 'Link Me',
                'user_id' => $user->id,
            ]
        ]);

        $response = $this->post(route('auth.google.link.process'), [
            'password' => 'password',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);

        $this->assertDatabaseHas('auth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'subject' => 'google-link-id',
        ]);
    }

    public function test_link_process_fails_with_wrong_password()
    {
        $user = User::factory()->create([
            'email' => 'linkme@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->withSession([
            'google_link' => [
                'issuer' => 'https://accounts.google.com',
                'subject' => 'google-link-id',
                'email' => 'linkme@example.com',
                'name' => 'Link Me',
                'user_id' => $user->id,
            ]
        ]);

        $response = $this->post(route('auth.google.link.process'), [
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('password');
        $this->assertGuest();
        $this->assertDatabaseMissing('auth_identities', [
            'subject' => 'google-link-id',
        ]);
    }
}
