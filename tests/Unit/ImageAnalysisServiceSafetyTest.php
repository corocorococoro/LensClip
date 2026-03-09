<?php

namespace Tests\Unit;

use App\Services\ImageAnalysisService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ImageAnalysisServiceSafetyTest extends TestCase
{
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

    private function makeService(): object
    {
        return new class extends ImageAnalysisService
        {
            public function __construct()
            {
                $this->geminiApiKey = 'test-key';
                $this->geminiModel = 'gemini-2.5-flash-lite';
            }

            public function callGeminiForTest(string $imageContent): array
            {
                return $this->callGemini($imageContent);
            }
        };
    }
}
