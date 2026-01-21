<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_ai_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
        $response->assertInertia(
            fn($page) => $page
                ->component('Admin/AiSettings')
                ->has('currentModel')
                ->has('allowedModels')
        );
    }

    public function test_admin_can_update_gemini_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // services.phpに定義されているモデルを使用
        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => 'gemini-2.5-flash',
        ]);

        $response->assertRedirect();
        $this->assertEquals('gemini-2.5-flash', Setting::get('gemini_model'));
    }

    public function test_admin_cannot_set_invalid_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => 'invalid-model-name',
        ]);

        $response->assertSessionHasErrors('model');
    }

    public function test_admin_cannot_set_empty_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => '',
        ]);

        $response->assertSessionHasErrors('model');
    }

    public function test_regular_user_cannot_update_ai_settings(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->put('/admin/settings/ai', [
            'model' => 'gemini-2.5-flash',
        ]);

        $response->assertStatus(403);
    }

    public function test_setting_model_get_returns_default_when_not_set(): void
    {
        $model = Setting::get('gemini_model', 'default-model');

        $this->assertEquals('default-model', $model);
    }

    public function test_setting_model_get_returns_stored_value(): void
    {
        Setting::set('gemini_model', 'gemini-2.5-pro');

        $model = Setting::get('gemini_model', 'default-model');

        $this->assertEquals('gemini-2.5-pro', $model);
    }

    public function test_allowed_models_response_includes_descriptions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertInertia(
            fn($page) => $page
                ->component('Admin/AiSettings')
                ->has('allowedModels', 3) // 3つのモデルがある
        );
    }
}
