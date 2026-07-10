<?php

namespace App\Services;

use App\Models\Observation;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\BatchAnnotateImagesRequest;
use Google\Cloud\Vision\V1\Client\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;
use Google\Cloud\Vision\V1\Likelihood;
use Google\Cloud\Vision\V1\SafeSearchAnnotation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ImageAnalysisService
{
    protected ?string $geminiApiKey;

    protected ?string $geminiModel = null;

    public function __construct(private readonly GeminiModelRegistry $modelRegistry)
    {
        $this->geminiApiKey = config('services.gemini.api_key');
    }

    /**
     * Analyze an observation: Vision (crop) -> Gemini (identify)
     */
    public function analyze(Observation $observation): array
    {
        $this->geminiModel = $this->modelRegistry->currentModel();

        $imageContent = Storage::disk()->get($observation->original_path);

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
        $selectedBbox = $this->selectBestBbox($visionResult, $imageContent);

        if ($selectedBbox) {
            Log::info('ImageAnalysisService: Bbox selected, cropping image', [
                'name' => $selectedBbox['name'],
                'score' => $selectedBbox['score'],
            ]);
            $result['crop_bbox'] = $selectedBbox;
            // cropImage はパスとエンコード済みバイト列を返す（Storage 再読み込み不要）
            $cropped = $this->cropImage($imageContent, $selectedBbox, $observation);
            $result['cropped_path'] = $cropped['path'];
            $imageForGemini = $cropped['content'];
        } else {
            Log::info('ImageAnalysisService: No bbox selected, using original image');
            $imageForGemini = $imageContent;
        }

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
     * Call Vision API for Object Localization using SDK (Service Account)
     */
    protected function callVisionObjectLocalization(string $imageContent): ?array
    {
        try {
            $image = (new Image)->setContent($imageContent);

            $features = [
                (new Feature)->setType(Type::OBJECT_LOCALIZATION),
                (new Feature)->setType(Type::SAFE_SEARCH_DETECTION),
            ];

            $request = (new AnnotateImageRequest)
                ->setImage($image)
                ->setFeatures($features);

            $batchRequest = (new BatchAnnotateImagesRequest)
                ->setRequests([$request]);

            $client = new ImageAnnotatorClient(GoogleCloudClientFactory::clientOptions());
            $batchResponse = $client->batchAnnotateImages($batchRequest);
            $client->close();

            $responses = $batchResponse->getResponses();
            if (count($responses) === 0) {
                return null;
            }
            $response = $responses[0];

            if ($response->getError()) {
                throw new \Exception('Vision API Error: '.$response->getError()->getMessage());
            }

            // Check SafeSearch
            $safeSearch = $response->getSafeSearchAnnotation();
            if ($safeSearch) {
                $this->checkSafeSearch($safeSearch);
            }

            // Extract localized objects
            $localizedObjects = $response->getLocalizedObjectAnnotations();
            if (count($localizedObjects) === 0) {
                return null;
            }

            // Convert to array format (consistent with existing logic)
            $objects = [];
            foreach ($localizedObjects as $obj) {
                $vertices = [];
                $poly = $obj->getBoundingPoly();
                if ($poly) {
                    foreach ($poly->getNormalizedVertices() as $vertex) {
                        $vertices[] = [
                            'x' => $vertex->getX(),
                            'y' => $vertex->getY(),
                        ];
                    }
                }

                $objects[] = [
                    'name' => $obj->getName() ?: null,
                    'score' => $obj->getScore(),
                    'boundingPoly' => [
                        'normalizedVertices' => $vertices,
                    ],
                ];
            }

            return $objects;

        } catch (\Exception $e) {
            Log::error('Vision API exception', ['exception' => $e::class]);
            throw $e;
        }
    }

    /**
     * Check SafeSearch results
     */
    protected function checkSafeSearch(SafeSearchAnnotation $safeSearch): void
    {
        $forbidden = [Likelihood::LIKELY, Likelihood::VERY_LIKELY];

        $adult = $safeSearch->getAdult();
        $violence = $safeSearch->getViolence();

        if (in_array($adult, $forbidden) || in_array($violence, $forbidden)) {
            throw new \Exception('画像の安全性を確認できませんでした。別の写真を撮ってください。');
        }
    }

    /**
     * Select best bbox from Vision results
     * Score = vision_score * 0.5 + area_ratio * 0.3 + center_bonus * 0.2
     */
    protected function selectBestBbox(?array $objects, string $imageContent): ?array
    {
        if (empty($objects)) {
            return null;
        }

        // Get image dimensions from binary content (no local path on GCS)
        $imageInfo = getimagesizefromstring($imageContent);
        if (! $imageInfo) {
            return null;
        }
        $imageWidth = $imageInfo[0];
        $imageHeight = $imageInfo[1];

        $bestScore = -1;
        $bestBbox = null;

        foreach ($objects as $obj) {
            $vertices = $obj['boundingPoly']['normalizedVertices'] ?? [];
            if (count($vertices) < 4) {
                continue;
            }

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
                    'name' => $obj['name'] ?? null,
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
     * Crop image with margin.
     * Returns ['path' => string, 'content' => string] to avoid re-reading from storage.
     *
     * @return array{path: string, content: string}
     */
    protected function cropImage(string $imageContent, array $bbox, Observation $observation): array
    {
        $manager = new ImageManager(new Driver);
        $image = $manager->read($imageContent);
        // orient() 不要: ObservationService で保存した WebP は既に向き補正・EXIF 除去済み

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

        // Encode once, save and return bytes in one shot (避免二次 Storage 読み込み)
        $encoded = (string) $image->toWebp(quality: 80);

        $croppedPath = str_replace('.webp', '_cropped.webp', $observation->original_path);
        Storage::disk()->put($croppedPath, $encoded);

        return ['path' => $croppedPath, 'content' => $encoded];
    }

    /**
     * Call Gemini API for identification
     */
    protected function callGemini(string $imageContent): array
    {
        if (empty($this->geminiApiKey)) {
            Log::error('Gemini API key is not configured.');
            throw new \Exception('Gemini API key is not configured.');
        }

        $geminiModel = $this->geminiModel ??= $this->modelRegistry->currentModel();

        $imageBase64 = base64_encode($imageContent);

        $prompt = $this->buildPrompt();

        try {
            // Retry with exponential backoff (100ms, 200ms, 400ms)
            $response = Http::retry(3, 100)->timeout(30)
                ->withHeader('x-goog-api-key', $this->geminiApiKey)
                ->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$geminiModel}:generateContent",
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
                        'safetySettings' => [
                            [
                                'category' => 'HARM_CATEGORY_HARASSMENT',
                                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                            ],
                            [
                                'category' => 'HARM_CATEGORY_HATE_SPEECH',
                                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                            ],
                            [
                                'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                            ],
                            [
                                'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                            ],
                        ],
                    ]
                );

            Log::info('Gemini API Response Status: '.$response->status());

            if (! $response->successful()) {
                Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body_length' => strlen($response->body()),
                ]);
                throw new \Exception('Gemini API error: '.$response->status());
            }

            $data = $response->json();
            $candidate = $data['candidates'][0] ?? null;

            if ($this->isGeminiSafetyBlocked($data, $candidate)) {
                throw new \Exception('安全性の理由で判定できませんでした。別の写真を撮ってください。');
            }

            if (! is_array($candidate)) {
                $candidateCount = is_array($data['candidates'] ?? null) ? count($data['candidates']) : 0;
                $promptFeedback = $data['promptFeedback'] ?? null;

                Log::warning('Gemini response missing candidate', [
                    'candidate_count' => $candidateCount,
                    'has_prompt_feedback' => is_array($promptFeedback),
                    'prompt_block_reason' => is_array($promptFeedback) && is_string($promptFeedback['blockReason'] ?? null)
                        ? $promptFeedback['blockReason']
                        : null,
                ]);

                throw new \Exception('Gemini response missing candidate');
            }

            $text = $candidate['content']['parts'][0]['text'] ?? null;

            if (! is_string($text) || $text === '') {
                Log::warning('Gemini response missing text part');
                throw new \Exception('Gemini response missing text');
            }

            // Cleanup markdown if present
            $text = preg_replace('/^```json\s*|\s*```$/', '', trim($text));

            if (! is_string($text) || $text === '') {
                Log::warning('Gemini response text is empty after cleanup');
                throw new \Exception('Gemini response missing text');
            }

            $json = json_decode($text, true);

            if (! $json) {
                Log::error('Gemini JSON parse error', ['text_length' => strlen($text)]);
                throw new \Exception('Gemini response parse error');
            }

            return $json;

        } catch (\Exception $e) {
            Log::error('Gemini API exception', ['exception' => $e::class]);
            throw $e;
        }
    }

    protected function buildPrompt(): string
    {
        $categories = config('categories');
        $categoryIds = implode('|', array_column($categories, 'id'));
        $categoryHint = collect($categories)->map(fn ($c) => "{$c['id']}({$c['description']})")->implode(' / ');

        return <<<EOT
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
    }

    /**
     * Determine whether Gemini response was blocked by safety filtering.
     *
     * @param  array<string, mixed>  $data
     */
    protected function isGeminiSafetyBlocked(array $data, mixed $candidate): bool
    {
        if (is_array($candidate) && ($candidate['finishReason'] ?? null) === 'SAFETY') {
            return true;
        }

        $promptFeedback = $data['promptFeedback'] ?? null;
        $blockReason = is_array($promptFeedback) ? ($promptFeedback['blockReason'] ?? null) : null;
        if (is_string($blockReason) && str_contains(strtoupper($blockReason), 'SAFETY')) {
            return true;
        }

        $safetyRatings = is_array($candidate) ? ($candidate['safetyRatings'] ?? []) : [];
        if (! is_array($safetyRatings)) {
            return false;
        }

        foreach ($safetyRatings as $rating) {
            if (is_array($rating) && ($rating['blocked'] ?? false) === true) {
                return true;
            }
        }

        return false;
    }
}
