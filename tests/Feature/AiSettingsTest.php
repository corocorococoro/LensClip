<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\GeminiModelRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    private const MODEL_PRIMARY = 'gemini-test-flash';

    private const MODEL_SECONDARY = 'gemini-test-pro';

    private const MODEL_LEGACY = 'gemini-legacy-pro';

    private const MODEL_MISSING = 'gemini-test-missing';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedGeminiSettings();
    }

    private function seedGeminiSettings(): void
    {
        Setting::set('gemini_model', self::MODEL_PRIMARY);
        Setting::set('gemini_allowed_models', json_encode([
            self::MODEL_PRIMARY => '高速版。',
            self::MODEL_SECONDARY => '高精度版。',
        ], JSON_UNESCAPED_UNICODE));
    }

    public function test_admin_can_view_ai_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/AiSettings')
                ->has('currentModel')
                ->has('allowedModels')
        );
    }

    public function test_admin_can_view_ai_settings_when_saved_current_model_is_not_allowed(): void
    {
        Setting::set('gemini_model', self::MODEL_LEGACY);
        Setting::set('gemini_allowed_models', json_encode([
            self::MODEL_PRIMARY => '高速版。',
        ], JSON_UNESCAPED_UNICODE));
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/AiSettings')
                ->where('currentModel', self::MODEL_LEGACY)
                ->where('allowedModels', [self::MODEL_PRIMARY => '高速版。'])
        );
    }

    public function test_admin_can_view_ai_settings_when_initial_model_configuration_is_missing(): void
    {
        Setting::whereIn('key', ['gemini_model', 'gemini_allowed_models'])->delete();

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/AiSettings')
                ->where('currentModel', '')
                ->where('allowedModels', [])
                ->where('settingsError', 'Geminiモデル設定が未設定または不正です。許可モデルを登録して保存してください。')
        );
    }

    public function test_admin_can_view_ai_settings_when_saved_allowed_models_are_invalid(): void
    {
        Setting::set('gemini_allowed_models', '{not-json');

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/AiSettings')
                ->where('currentModel', self::MODEL_PRIMARY)
                ->where('allowedModels', [])
                ->where('settingsError', 'Geminiモデル設定が未設定または不正です。許可モデルを登録して保存してください。')
        );
    }

    public function test_admin_can_update_gemini_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => self::MODEL_PRIMARY,
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。日常の解析向け。'],
                ['model' => self::MODEL_SECONDARY, 'description' => '高精度版。精度重視。'],
            ],
        ]);

        $response->assertRedirect();
        $this->assertEquals(self::MODEL_PRIMARY, Setting::get('gemini_model'));
        $this->assertEquals(
            [
                self::MODEL_PRIMARY => '高速版。日常の解析向け。',
                self::MODEL_SECONDARY => '高精度版。精度重視。',
            ],
            app(GeminiModelRegistry::class)->allowedModels()
        );
    }

    public function test_admin_can_probe_gemini_model_connectivity(): void
    {
        config(['services.gemini.api_key' => 'test-key']);

        Http::fake(function (Request $request) {
            $this->assertStringContainsString('/models/'.self::MODEL_PRIMARY.':generateContent', $request->url());
            $this->assertContains('test-key', $request->header('x-goog-api-key'));
            $this->assertStringNotContainsString('key=', $request->url());

            return Http::response([
                'candidates' => [[
                    'finishReason' => 'STOP',
                    'content' => [
                        'parts' => [
                            ['text' => 'OK'],
                        ],
                    ],
                ]],
            ], 200);
        });

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/admin/settings/ai/probe', [
            'model' => ' '.self::MODEL_PRIMARY.' ',
        ]);

        $response->assertOk()
            ->assertJson([
                'ok' => true,
                'message' => '疎通確認に成功しました。',
                'status' => 200,
            ]);
    }

    public function test_probe_returns_safe_failure_when_gemini_model_is_unavailable(): void
    {
        config(['services.gemini.api_key' => 'test-key']);

        Http::fake([
            '*' => Http::response(['error' => ['message' => 'full provider error']], 404),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/admin/settings/ai/probe', [
            'model' => self::MODEL_MISSING,
        ]);

        $response->assertOk()
            ->assertJson([
                'ok' => false,
                'message' => '指定したモデルが見つからないか、このAPIで利用できません。',
                'status' => 404,
            ]);
    }

    public function test_probe_rejects_invalid_model_before_calling_gemini(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake();

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/admin/settings/ai/probe', [
            'model' => 'invalid-model-name',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('model');
        Http::assertNothingSent();
    }

    public function test_regular_user_cannot_probe_gemini_model_connectivity(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->postJson('/admin/settings/ai/probe', [
            'model' => self::MODEL_PRIMARY,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_update_trims_model_names_and_descriptions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => ' '.self::MODEL_PRIMARY.' ',
            'allowed_models' => [
                ['model' => ' '.self::MODEL_PRIMARY.' ', 'description' => ' 高速版。 '],
            ],
        ]);

        $response->assertRedirect();
        $this->assertEquals(self::MODEL_PRIMARY, Setting::get('gemini_model'));
        $this->assertEquals(
            [self::MODEL_PRIMARY => '高速版。'],
            app(GeminiModelRegistry::class)->allowedModels()
        );
    }

    public function test_admin_cannot_set_invalid_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => 'invalid-model-name',
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。'],
            ],
        ]);

        $response->assertSessionHasErrors('model');
    }

    public function test_admin_cannot_set_empty_model(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => '',
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。'],
            ],
        ]);

        $response->assertSessionHasErrors('model');
    }

    public function test_regular_user_cannot_update_ai_settings(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->put('/admin/settings/ai', [
            'model' => self::MODEL_PRIMARY,
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。'],
            ],
        ]);

        $response->assertStatus(403);
    }

    public function test_setting_model_get_returns_default_when_not_set(): void
    {
        Setting::where('key', 'gemini_model')->delete();
        Cache::forget('setting.gemini_model');

        $model = Setting::get('gemini_model', 'default-model');

        $this->assertEquals('default-model', $model);
    }

    public function test_setting_model_get_returns_stored_value(): void
    {
        Setting::set('gemini_model', self::MODEL_LEGACY);

        $model = Setting::get('gemini_model', 'default-model');

        $this->assertEquals(self::MODEL_LEGACY, $model);
    }

    public function test_admin_cannot_select_model_missing_from_allowed_models(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => self::MODEL_SECONDARY,
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。'],
            ],
        ]);

        $response->assertSessionHasErrors('model');
    }

    public function test_admin_cannot_register_duplicate_allowed_models(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->put('/admin/settings/ai', [
            'model' => self::MODEL_PRIMARY,
            'allowed_models' => [
                ['model' => self::MODEL_PRIMARY, 'description' => '高速版。'],
                ['model' => self::MODEL_PRIMARY, 'description' => '重複。'],
            ],
        ]);

        $response->assertSessionHasErrors('allowed_models');
    }

    public function test_registry_rejects_saved_current_model_that_is_not_allowed(): void
    {
        Setting::set('gemini_model', self::MODEL_LEGACY);
        Setting::set('gemini_allowed_models', json_encode([
            self::MODEL_PRIMARY => '高速版。',
        ], JSON_UNESCAPED_UNICODE));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Configured Gemini model is not allowed.');

        app(GeminiModelRegistry::class)->currentModel();
    }

    public function test_registry_does_not_fallback_when_saved_current_model_is_empty(): void
    {
        Setting::set('gemini_model', '');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Configured Gemini model is not allowed.');

        app(GeminiModelRegistry::class)->currentModel();
    }

    public function test_registry_rejects_malformed_saved_allowed_model_rows(): void
    {
        Setting::set('gemini_allowed_models', json_encode([
            self::MODEL_PRIMARY => '高速版。',
            '' => '壊れた行。',
        ], JSON_UNESCAPED_UNICODE));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Gemini allowed model row is invalid.');

        app(GeminiModelRegistry::class)->allowedModels();
    }

    public function test_registry_rejects_missing_allowed_model_configuration(): void
    {
        Setting::where('key', 'gemini_allowed_models')->delete();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Gemini allowed model list is not configured.');

        app(GeminiModelRegistry::class)->allowedModels();
    }

    public function test_allowed_models_response_includes_descriptions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/admin/settings/ai');

        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/AiSettings')
                ->has('allowedModels', 2)
        );
    }
}
