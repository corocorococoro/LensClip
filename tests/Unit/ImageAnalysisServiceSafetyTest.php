<?php

namespace Tests\Unit;

use App\Services\GeminiModelRegistry;
use App\Services\ImageAnalysisService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Tests\TestCase;

class ImageAnalysisServiceSafetyTest extends TestCase
{
    public const MODEL_PRIMARY = 'gemini-test-flash';

    public const MODEL_LEGACY = 'gemini-legacy-pro';

    public function test_gemini_request_includes_safety_settings(): void
    {
        Http::fake(function (Request $request) {
            $payload = $request->data();

            $this->assertArrayHasKey('safetySettings', $payload);
            $this->assertCount(4, $payload['safetySettings']);
            $this->assertSame('HARM_CATEGORY_HARASSMENT', $payload['safetySettings'][0]['category']);
            $this->assertSame('BLOCK_MEDIUM_AND_ABOVE', $payload['safetySettings'][0]['threshold']);

            // API key must be in header, not URL query parameter
            $this->assertContains('test-key', $request->header('x-goog-api-key'));
            $this->assertStringNotContainsString('key=', $request->url());

            return Http::response([
                'candidates' => [[
                    'finishReason' => 'STOP',
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'title' => 'テスト',
                                'summary' => '説明',
                                'kid_friendly' => 'やさしい説明',
                                'category' => 'other',
                                'confidence' => 0.8,
                                'tags' => [],
                                'safety_notes' => [],
                                'fun_facts' => [],
                                'questions' => [],
                                'candidate_cards' => [[
                                    'name' => 'テスト',
                                    'english_name' => 'test',
                                    'confidence' => 0.8,
                                    'summary' => '説明',
                                    'kid_friendly' => 'やさしい説明',
                                ]],
                            ], JSON_UNESCAPED_UNICODE),
                        ]],
                    ],
                ]],
            ], 200);
        });

        $service = $this->makeService();

        $result = $service->callGeminiForTest('binary-image-content');

        $this->assertSame('テスト', $result['title']);
    }

    public function test_safety_blocked_response_throws_safety_exception(): void
    {
        Http::fake([
            '*' => Http::response([
                'promptFeedback' => [
                    'blockReason' => 'SAFETY',
                ],
                'candidates' => [],
            ], 200),
        ]);

        $service = $this->makeService();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('安全性の理由で判定できませんでした。別の写真を撮ってください。');

        $service->callGeminiForTest('binary-image-content');
    }

    public function test_missing_candidate_without_safety_signal_throws_generic_exception(): void
    {
        Http::fake([
            '*' => Http::response([
                'promptFeedback' => [
                    'blockReason' => 'OTHER',
                ],
                'candidates' => [],
            ], 200),
        ]);

        $service = $this->makeService();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Gemini response missing candidate');

        $service->callGeminiForTest('binary-image-content');
    }

    public function test_missing_gemini_text_part_throws_without_placeholder_json(): void
    {
        Http::fake([
            '*' => Http::response([
                'candidates' => [[
                    'finishReason' => 'STOP',
                    'content' => [
                        'parts' => [[]],
                    ],
                ]],
            ], 200),
        ]);

        $service = $this->makeService();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Gemini response missing text');

        $service->callGeminiForTest('binary-image-content');
    }

    public function test_gemini_request_uses_registry_resolved_model(): void
    {
        Http::fake(function (Request $request) {
            $this->assertStringContainsString('/models/'.self::MODEL_PRIMARY.':generateContent', $request->url());
            $this->assertStringNotContainsString('/models/'.self::MODEL_LEGACY.':generateContent', $request->url());

            return Http::response([
                'candidates' => [[
                    'finishReason' => 'STOP',
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'title' => 'テスト',
                                'summary' => '説明',
                                'kid_friendly' => 'やさしい説明',
                                'category' => 'other',
                                'confidence' => 0.8,
                                'tags' => [],
                                'safety_notes' => [],
                                'fun_facts' => [],
                                'questions' => [],
                                'candidate_cards' => [],
                            ], JSON_UNESCAPED_UNICODE),
                        ]],
                    ],
                ]],
            ], 200);
        });

        $registry = new class extends GeminiModelRegistry
        {
            public function currentModel(): string
            {
                return ImageAnalysisServiceSafetyTest::MODEL_PRIMARY;
            }
        };

        $service = new class($registry) extends ImageAnalysisService
        {
            public function callGeminiForTest(string $imageContent): array
            {
                return $this->callGemini($imageContent);
            }
        };

        $this->assertSame('テスト', $service->callGeminiForTest('binary-image-content')['title']);
    }

    public function test_model_resolution_is_deferred_until_gemini_call(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake();

        $registry = new class extends GeminiModelRegistry
        {
            public function currentModel(): string
            {
                throw new InvalidArgumentException('Configured Gemini model is not allowed.');
            }
        };

        $service = new class($registry) extends ImageAnalysisService
        {
            public function callGeminiForTest(string $imageContent): array
            {
                return $this->callGemini($imageContent);
            }
        };

        try {
            $service->callGeminiForTest('binary-image-content');
            $this->fail('Expected invalid Gemini model exception was not thrown.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('Configured Gemini model is not allowed.', $e->getMessage());
            Http::assertNothingSent();
        }
    }

    public function test_missing_english_name_is_not_filled_with_guess(): void
    {
        Http::fake([
            '*' => Http::response([
                'candidates' => [[
                    'finishReason' => 'STOP',
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'title' => 'りんご',
                                'summary' => '説明',
                                'kid_friendly' => 'やさしい説明',
                                'category' => 'other',
                                'confidence' => 0.8,
                                'tags' => [],
                                'safety_notes' => [],
                                'fun_facts' => [],
                                'questions' => [],
                                'candidate_cards' => [[
                                    'name' => 'りんご',
                                    'confidence' => 0.8,
                                    'summary' => '説明',
                                    'kid_friendly' => 'やさしい説明',
                                ]],
                            ], JSON_UNESCAPED_UNICODE),
                        ]],
                    ],
                ]],
            ], 200),
        ]);

        $result = $this->makeService()->callGeminiForTest('binary-image-content');

        $this->assertArrayNotHasKey('english_name', $result['candidate_cards'][0]);
    }

    public function test_missing_gemini_api_key_throws_without_mock_response(): void
    {
        Http::fake();

        $service = new class extends ImageAnalysisService
        {
            public function __construct()
            {
                $this->geminiApiKey = '';
                $this->geminiModel = ImageAnalysisServiceSafetyTest::MODEL_PRIMARY;
            }

            public function callGeminiForTest(string $imageContent): array
            {
                return $this->callGemini($imageContent);
            }
        };

        try {
            $service->callGeminiForTest('binary-image-content');
            $this->fail('Expected missing Gemini API key exception was not thrown.');
        } catch (\Exception $e) {
            $this->assertSame('Gemini API key is not configured.', $e->getMessage());
            Http::assertNothingSent();
        }
    }

    private function makeService(): object
    {
        return new class extends ImageAnalysisService
        {
            public function __construct()
            {
                $this->geminiApiKey = 'test-key';
                $this->geminiModel = ImageAnalysisServiceSafetyTest::MODEL_PRIMARY;
            }

            public function callGeminiForTest(string $imageContent): array
            {
                return $this->callGemini($imageContent);
            }
        };
    }
}
