<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PromoteUserCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_promotion_log_uses_internal_id_without_email_address(): void
    {
        Log::spy();
        $user = User::factory()->create(['email' => 'private@example.com']);

        $this->artisan('user:promote', ['email' => $user->email])
            ->assertSuccessful();

        Log::shouldHaveReceived('info')->with(
            'User promoted to admin',
            [
                'user_id' => $user->id,
                'promoted_by' => 'artisan command',
            ],
        );
    }
}
