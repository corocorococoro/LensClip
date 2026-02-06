<?php

namespace App\Services;

use App\Models\Observation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageAnalysisService
{
    protected ?string $geminiApiKey;
    protected string $geminiModel;

    public function __construct()
    {
        // API Key is centralized in config/services.php (gemini.api_key)
        $this->geminiApiKey = config('services.gemini.api_key');

        // Read from database settings first, then fall back to config
        $this->geminiModel = \App\Models\Setting::get(
            'gemini_model',
            config('services.gemini.model', 'gemini-2.5-flash-lite')
        );
    }

    /**
     * Analyze an observation: Vision (crop) -> Gemini (identify)
     */
    public function analyze(Observation $observation): array
    {
        $originalPath = Storage::disk('public')->path($observation->original_path);
        $imageContent = file_get_contents($originalPath);

        $result = [
            'cropped_path' => null,
            'crop_bbox' => null,
            'vision_objects' => null,
            'ai_json' => null,
        ];

        // Step 1: Vision API - Object Localization
        Log::info('ImageAnalysisService: Starting Vision object localization');
        $visionResult = $this->callVisionObjectLocalization($imageContent);
        $result['vision_objects'] = $visionResult;

        // Step 2: Select best bbox and crop
        $selectedBbox = $this->selectBestBbox($visionResult, $originalPath);

        if ($selectedBbox) {
            Log::info('ImageAnalysisService: Bbox selected, cropping image', [
                'name' => $selectedBbox['name'],
                'score' => $selectedBbox['score']
            ]);
            $result['crop_bbox'] = $selectedBbox;
            $croppedPath = $this->cropImage($originalPath, $selectedBbox, $observation);
            $result['cropped_path'] = $croppedPath;
        } else {
            Log::info('ImageAnalysisService: No bbox selected, using original image');
        }

        // Step 3: Gemini - Use cropped image if available, otherwise original
        $imageForGemini = $result['cropped_path']
            ? Storage::disk('public')->get($result['cropped_path'])
            : $imageContent;

        Log::info('ImageAnalysisService: Sending image to Gemini');
        $geminiResult = $this->callGemini($imageForGemini);

        Log::info('ImageAnalysisService: Gemini analysis completed', [
            'title' => $geminiResult['title'] ?? 'N/A',
            'category' => $geminiResult['category'] ?? 'N/A',
            'confidence' => $geminiResult['confidence'] ?? 0,
            'tag_count' => count($geminiResult['tags'] ?? []),
        ]);

        $result['ai_json'] = $geminiResult;
        $result['gemini_model'] = $this->geminiModel;

        return $result;
    }

    /**
     * Call Vision API for Object Localization using REST API (API Key)
     */
    protected function callVisionObjectLocalization(string $imageContent): ?array
    {
        if (!$this->geminiApiKey) {
            Log::warning('Gemini API Key not configured, skipping Vision API');
            return null;
        }

        try {
            // Retry with exponential backoff (100ms, 200ms, 400ms)
            $response = Http::retry(3, 100)->post("https://vision.googleapis.com/v1/images:annotate?key={$this->geminiApiKey}", [
                'requests' => [
                    [
                        'image' => [
                            'content' => base64_encode($imageContent)
                        ],
                        'features' => [
                            [
                                'type' => 'OBJECT_LOCALIZATION',
                                'maxResults' => 10
                            ],
                            [
                                'type' => 'SAFE_SEARCH_DETECTION'
                            ]
                        ]
                    ]
                ]
            ]);

            if (!$response->successful()) {
                Log::error('Vision API Error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }

            $data = $response->json();
            $responses = $data['responses'] ?? [];

            if (empty($responses)) {
                return null;
            }

            $annotatedImage = $responses[0];
            if (isset($annotatedImage['error'])) {
                throw new \Exception("Vision API Error: " . ($annotatedImage['error']['message'] ?? 'Unknown error'));
            }

            // Check SafeSearch
            $safeSearch = $annotatedImage['safeSearchAnnotation'] ?? null;
            if ($safeSearch) {
                $this->checkSafeSearch($safeSearch);
            }

            // Extract localized objects
            $localizedObjects = $annotatedImage['localizedObjectAnnotations'] ?? [];
            if (empty($localizedObjects)) {
                return null;
            }

            // Convert to array format (consistent with PHP client structure logic)
            $objects = [];
            foreach ($localizedObjects as $obj) {
                $vertices = $obj['boundingPoly']['normalizedVertices'] ?? [];

                // REST API returns normalizedVertices directly as array of {x: ..., y: ...}
                // No need to convert from object getX/getY

                $objects[] = [
                    'name' => $obj['name'] ?? 'Unknown',
                    'score' => $obj['score'] ?? 0,
                    'boundingPoly' => [
                        'normalizedVertices' => $vertices,
                    ],
                ];
            }

            return $objects;

        } catch (\Exception $e) {
            Log::error('Vision API exception', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Check SafeSearch results
     */
    protected function checkSafeSearch(array $safeSearch): void
    {
        $forbidden = ['LIKELY', 'VERY_LIKELY'];

        $adult = $safeSearch['adult'] ?? 'UNKNOWN';
        $violence = $safeSearch['violence'] ?? 'UNKNOWN';

        if (in_array($adult, $forbidden) || in_array($violence, $forbidden)) {
            throw new \Exception('画像の安全性を確認できませんでした。別の写真を撮ってください。');
        }
    }

    /**
     * Select best bbox from Vision results
     * Score = vision_score * 0.5 + area_ratio * 0.3 + center_bonus * 0.2
     */
    protected function selectBestBbox(?array $objects, string $imagePath): ?array
    {
        if (empty($objects)) {
            return null;
        }

        // Get image dimensions
        $imageInfo = getimagesize($imagePath);
        if (!$imageInfo) {
            return null;
        }
        $imageWidth = $imageInfo[0];
        $imageHeight = $imageInfo[1];

        $bestScore = -1;
        $bestBbox = null;

        foreach ($objects as $obj) {
            $vertices = $obj['boundingPoly']['normalizedVertices'] ?? [];
            if (count($vertices) < 4)
                continue;

            // Calculate bbox in normalized coordinates
            $minX = min(array_column($vertices, 'x'));
            $minY = min(array_column($vertices, 'y'));
            $maxX = max(array_column($vertices, 'x'));
            $maxY = max(array_column($vertices, 'y'));

            $bboxWidth = $maxX - $minX;
            $bboxHeight = $maxY - $minY;

            // Vision score
            $visionScore = $obj['score'] ?? 0;

            // Area ratio (normalized area)
            $areaRatio = $bboxWidth * $bboxHeight;

            // Center bonus: distance from center (0-1, 1 = center)
            $centerX = ($minX + $maxX) / 2;
            $centerY = ($minY + $maxY) / 2;
            $distFromCenter = sqrt(pow($centerX - 0.5, 2) + pow($centerY - 0.5, 2));
            $centerBonus = 1 - min($distFromCenter / 0.707, 1); // 0.707 = sqrt(0.5)

            // Combined score
            $finalScore = $visionScore * 0.5 + $areaRatio * 0.3 + $centerBonus * 0.2;

            if ($finalScore > $bestScore) {
                $bestScore = $finalScore;
                $bestBbox = [
                    'name' => $obj['name'] ?? 'unknown',
                    'score' => $visionScore,
                    'normalized' => [
                        'x' => $minX,
                        'y' => $minY,
                        'width' => $bboxWidth,
                        'height' => $bboxHeight,
                    ],
                    'pixels' => [
                        'x' => (int) ($minX * $imageWidth),
                        'y' => (int) ($minY * $imageHeight),
                        'width' => (int) ($bboxWidth * $imageWidth),
                        'height' => (int) ($bboxHeight * $imageHeight),
                    ],
                    'final_score' => $finalScore,
                ];
            }
        }

        return $bestBbox;
    }

    /**
     * Crop image with margin
     */
    protected function cropImage(string $imagePath, array $bbox, Observation $observation): string
    {
        $manager = new ImageManager(new Driver());
        $image = $manager->read($imagePath);
        $image->orient();

        $imageWidth = $image->width();
        $imageHeight = $image->height();

        // Get pixel coordinates
        $px = $bbox['pixels'];

        // Add 10% margin
        $marginX = (int) ($px['width'] * 0.1);
        $marginY = (int) ($px['height'] * 0.1);

        $x = max(0, $px['x'] - $marginX);
        $y = max(0, $px['y'] - $marginY);
        $width = min($imageWidth - $x, $px['width'] + 2 * $marginX);
        $height = min($imageHeight - $y, $px['height'] + 2 * $marginY);

        // Crop
        $image->crop($width, $height, $x, $y);

        // Generate cropped path
        $originalPath = $observation->original_path;
        $croppedPath = str_replace('.webp', '_cropped.webp', $originalPath);

        // Save
        Storage::disk('public')->put($croppedPath, (string) $image->toWebp(quality: 80));

        return $croppedPath;
    }

    /**
     * Call Gemini API for identification
     */
    protected function callGemini(string $imageContent): array
    {
        if (empty($this->geminiApiKey)) {
            Log::warning('Gemini API key not set, using mock response');
            return $this->mockGeminiResponse();
        }

        $imageBase64 = base64_encode($imageContent);

        // カテゴリリストをconfigから動的生成
        $categories = config('categories');
        $categoryIds = implode('|', array_column($categories, 'id'));
        $categoryHint = collect($categories)->map(fn($c) => "{$c['id']}({$c['description']})")->implode(' / ');

        $prompt = <<<EOT
あなたは子供向け図鑑アプリのAIです。この画像に写っている主な対象を同定し、3-6歳の子供に説明してください。

**重要**: 可能性のある候補を最大3つまで挙げ、それぞれについてカード情報を生成してください。
候補は確信度の高い順に並べてください。

**必須**: 各候補には必ず「english_name」を含めてください（対象の英語名。例: apple, tulip, cat）。

以下のJSONフォーマットで返答してください。JSON以外は絶対に含めないでください。

{
  "title": "第1候補の名前（ひらがな/カタカナ推奨）",
  "summary": "第1候補の簡潔な説明（大人向け、100文字以内）",
  "kid_friendly": "第1候補の子供向けのやさしい説明（50文字以内、ひらがな多め）",
  "category": "{$categoryIds} のいずれか。分類の参考: {$categoryHint}",
  "confidence": 0.0-1.0,
  "tags": ["関連タグ"],
  "safety_notes": ["危険や注意事項があれば"],
  "fun_facts": ["豆知識"],
  "questions": ["子供に聞いてみたい質問"],
  "candidate_cards": [
    {
      "name": "第1候補の名前",
      "english_name": "english name (required, lowercase)",
      "confidence": 0.0-1.0,
      "summary": "簡潔な説明（大人向け、80文字以内）",
      "kid_friendly": "子供向け説明（40文字以内）",
      "look_for": ["見分けポイント1", "見分けポイント2"],
      "fun_facts": ["この候補の豆知識"],
      "questions": ["この候補に関する質問"],
      "tags": ["タグ"]
    }
  ]
}

候補が1つしか考えられない場合は、candidate_cardsに1つだけ入れてください。
english_nameは必ず各候補に含めてください。色や形の場合も英語で表現してください（例: red, square）。
EOT;

        try {
            // Retry with exponential backoff (100ms, 200ms, 400ms)
            $response = Http::retry(3, 100)->timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$this->geminiModel}:generateContent?key={$this->geminiApiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                                [
                                    'inline_data' => [
                                        'mime_type' => 'image/webp',
                                        'data' => $imageBase64,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'response_mime_type' => 'application/json',
                    ],
                ]
            );

            Log::info('Gemini API Response Status: ' . $response->status());

            if (!$response->successful()) {
                Log::error('Gemini API error', ['body' => $response->body()]);
                throw new \Exception('Gemini API error: ' . $response->status());
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';

            // Cleanup markdown if present
            $text = preg_replace('/^```json\s*|\s*```$/', '', trim($text));

            $json = json_decode($text, true);

            if (!$json) {
                Log::error('Gemini JSON parse error', ['text' => $text]);
                throw new \Exception('Gemini response parse error');
            }

            // Ensure english_name exists in candidate_cards (AI may omit it)
            if (isset($json['candidate_cards']) && is_array($json['candidate_cards'])) {
                foreach ($json['candidate_cards'] as $index => $card) {
                    if (!isset($card['english_name']) || empty($card['english_name'])) {
                        // Use name as fallback (will be in Japanese, but better than nothing)
                        $json['candidate_cards'][$index]['english_name'] = $card['name'] ?? 'unknown';
                    }
                }
            }

            return $json;

        } catch (\Exception $e) {
            Log::error('Gemini API exception', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Mock response for development
     */
    protected function mockGeminiResponse(): array
    {
        return [
            'title' => 'テスト画像',
            'alt_names' => [],
            'summary' => 'APIキーが設定されていないためモックを表示しています。',
            'kid_friendly' => 'これはテストだよ！',
            'category' => 'other',
            'tags' => ['テスト'],
            'confidence' => 0.8,
            'safety_notes' => [],
            'fun_facts' => ['これはモックデータです。'],
            'questions' => ['なにがうつってる？'],
            'candidate_cards' => [
                [
                    'name' => 'テスト画像',
                    'english_name' => 'test image',
                    'confidence' => 0.8,
                    'summary' => 'APIキーが設定されていないためモックを表示しています。',
                    'kid_friendly' => 'これはテストだよ！',
                    'look_for' => ['モックデータです'],
                    'fun_facts' => ['これは1番目の候補です'],
                    'questions' => ['なにがうつってる？'],
                    'tags' => ['テスト'],
                ],
                [
                    'name' => 'べつのもの',
                    'english_name' => 'something else',
                    'confidence' => 0.5,
                    'summary' => '2番目の候補のテストデータです。',
                    'kid_friendly' => 'これかもしれないよ！',
                    'look_for' => ['かたちがにてる'],
                    'fun_facts' => ['これは2番目の候補です'],
                    'questions' => ['どっちだとおもう？'],
                    'tags' => ['テスト'],
                ],
            ],
        ];
    }
}
