<?php

namespace App\Services;

use App\Models\Observation;
use Google\Cloud\Vision\V1\Client\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\BatchAnnotateImagesRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageAnalysisService
{
    protected ?ImageAnnotatorClient $visionClient = null;
    protected ?string $geminiApiKey;
    protected string $geminiModel;

    public function __construct()
    {
        // Initialize Vision client with service account
        $credentialsPath = env('GOOGLE_APPLICATION_CREDENTIALS');

        if (!empty($credentialsPath) && file_exists(base_path($credentialsPath))) {
            try {
                $jsonKey = json_decode(file_get_contents(base_path($credentialsPath)), true);
                if (!$jsonKey) {
                    throw new \Exception("Invalid JSON in credentials file");
                }
                $credentials = new \Google\Auth\Credentials\ServiceAccountCredentials(
                    'https://www.googleapis.com/auth/cloud-vision',
                    $jsonKey
                );
                $this->visionClient = new ImageAnnotatorClient(['credentials' => $credentials]);
            } catch (\Exception $e) {
                Log::warning('Failed to initialize Vision Client: ' . $e->getMessage());
            }
        }

        $this->geminiApiKey = config('services.gemini.api_key') ?? env('GEMINI_API_KEY');

        // Read from database settings first, then fall back to config/env
        $this->geminiModel = \App\Models\Setting::get(
            'gemini_model',
            config('services.gemini.model') ?? env('GEMINI_MODEL', 'gemini-2.0-flash')
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

        return $result;
    }

    /**
     * Call Vision API for Object Localization using service account
     */
    protected function callVisionObjectLocalization(string $imageContent): ?array
    {
        if (!$this->visionClient) {
            Log::info('Vision client not initialized, skipping object localization');
            return null;
        }

        try {
            // Build Image
            $image = new Image();
            $image->setContent($imageContent);

            // Build features
            $objectLocalizationFeature = new Feature();
            $objectLocalizationFeature->setType(Type::OBJECT_LOCALIZATION);
            $objectLocalizationFeature->setMaxResults(10);

            $safeSearchFeature = new Feature();
            $safeSearchFeature->setType(Type::SAFE_SEARCH_DETECTION);

            // Build request
            $request = new AnnotateImageRequest();
            $request->setImage($image);
            $request->setFeatures([$objectLocalizationFeature, $safeSearchFeature]);

            $batchRequest = new BatchAnnotateImagesRequest();
            $batchRequest->setRequests([$request]);

            // Call API
            $response = $this->visionClient->batchAnnotateImages($batchRequest);
            $responses = $response->getResponses();

            if (count($responses) === 0) {
                Log::warning('Vision API returned no responses');
                return null;
            }

            $annotatedImage = $responses[0];

            if ($annotatedImage->getError()) {
                throw new \Exception("Vision API Error: " . $annotatedImage->getError()->getMessage());
            }

            // Check SafeSearch
            $safeSearch = $annotatedImage->getSafeSearchAnnotation();
            if ($safeSearch) {
                $this->checkSafeSearch($safeSearch);
            }

            // Extract localized objects
            $localizedObjects = $annotatedImage->getLocalizedObjectAnnotations();
            if (!$localizedObjects || count($localizedObjects) === 0) {
                return null;
            }

            // Convert to array format
            $objects = [];
            foreach ($localizedObjects as $obj) {
                $vertices = [];
                $boundingPoly = $obj->getBoundingPoly();
                if ($boundingPoly) {
                    foreach ($boundingPoly->getNormalizedVertices() as $vertex) {
                        $vertices[] = [
                            'x' => $vertex->getX(),
                            'y' => $vertex->getY(),
                        ];
                    }
                }

                $objects[] = [
                    'name' => $obj->getName(),
                    'score' => $obj->getScore(),
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
    protected function checkSafeSearch($safeSearch): void
    {
        $forbidden = [
            \Google\Cloud\Vision\V1\Likelihood::LIKELY,
            \Google\Cloud\Vision\V1\Likelihood::VERY_LIKELY,
        ];

        if (
            in_array($safeSearch->getAdult(), $forbidden) ||
            in_array($safeSearch->getViolence(), $forbidden)
        ) {
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

        $prompt = <<<EOT
あなたは子供向け図鑑アプリのAIです。この画像に写っている主な対象を同定し、3-6歳の子供に説明してください。

以下のJSONフォーマットで返答してください。JSON以外は絶対に含めないでください。

{
  "title": "名前（ひらがな/カタカナ推奨）",
  "alt_names": ["別名があれば"],
  "summary": "簡潔な説明（大人向け、100文字以内）",
  "kid_friendly": "子供向けのやさしい説明（50文字以内、ひらがな多め）",
  "category": "plant|animal|insect|food|tool|vehicle|place|other",
  "tags": ["関連タグ"],
  "confidence": 0.0-1.0,
  "candidates": [{"name": "候補名", "confidence": 0.0-1.0}],
  "safety_notes": ["危険や注意事項があれば"],
  "fun_facts": ["豆知識"],
  "questions": ["子供に聞いてみたい質問"]
}
EOT;

        try {
            $response = Http::timeout(30)->post(
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
            'confidence' => 0.5,
            'candidates' => [],
            'safety_notes' => [],
            'fun_facts' => ['これはモックデータです。'],
            'questions' => ['なにがうつってる？'],
        ];
    }
}
