<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TtsService
{
    protected ?string $apiKey;
    protected string $voice;
    protected float $speakingRate;
    protected int $ttlDays;

    public function __construct()
    {
        // API Key is centralized in config/services.php (gemini.api_key)
        $this->apiKey = config('services.gemini.api_key');
        $this->voice = config('services.tts.voice', 'en-US-Neural2-J');
        $this->speakingRate = (float) config('services.tts.speaking_rate', 0.9);
        $this->ttlDays = (int) config('services.tts.ttl_days', 7);
    }

    /**
     * Synthesize text to speech and return URL
     *
     * @param string $text Text to synthesize
     * @param float|null $speakingRate Optional speaking rate override
     * @return array{url: string, cacheHit: bool}
     */
    public function synthesize(string $text, ?float $speakingRate = null): array
    {
        $rate = $speakingRate ?? $this->speakingRate;
        $cacheKey = $this->getCacheKey($text, $rate);
        $filename = "{$cacheKey}.mp3";
        $path = "tts/{$filename}";

        // Check cache
        if ($this->isCacheValid($path)) {
            Log::debug('TTS cache hit', ['text' => $text, 'file' => $filename]);
            return [
                'url' => Storage::disk('public')->url($path),
                'cacheHit' => true,
            ];
        }

        // Generate new audio
        $audioContent = $this->callGoogleTts($text, $rate);

        // Save to storage
        Storage::disk('public')->put($path, $audioContent);

        $realPath = Storage::disk('public')->path($path);
        $publicUrl = Storage::disk('public')->url($path);

        Log::info('TTS generated', [
            'text' => $text,
            'file' => $filename,
            'storage_path' => $realPath,
            'public_url' => $publicUrl,
            'exists' => file_exists($realPath) ? 'yes' : 'no'
        ]);

        return [
            'url' => $publicUrl,
            'cacheHit' => false,
        ];
    }

    /**
     * Generate cache key from text and rate
     */
    protected function getCacheKey(string $text, float $rate): string
    {
        $normalized = strtolower(trim($text));
        return md5("{$normalized}|{$this->voice}|{$rate}");
    }

    /**
     * Check if cached file is still valid (within TTL)
     */
    protected function isCacheValid(string $path): bool
    {
        if (!Storage::disk('public')->exists($path)) {
            return false;
        }

        $lastModified = Storage::disk('public')->lastModified($path);
        $ttlSeconds = $this->ttlDays * 24 * 60 * 60;

        return (time() - $lastModified) < $ttlSeconds;
    }

    /**
     * Call Google Cloud TTS API
     */
    /**
     * Call Google Cloud TTS API using API Key
     */
    protected function callGoogleTts(string $text, float $rate): string
    {
        if (!$this->apiKey) {
            throw new \Exception('Google API Key (GEMINI_API_KEY) not configured');
        }

        // Retry with exponential backoff (100ms, 200ms, 400ms)
        $response = Http::retry(3, 100)
            ->timeout(30)
            ->post('https://texttospeech.googleapis.com/v1/text:synthesize?key=' . $this->apiKey, [
                'input' => [
                    'text' => $text,
                ],
                'voice' => [
                    'languageCode' => 'en-US',
                    'name' => $this->voice,
                ],
                'audioConfig' => [
                    'audioEncoding' => 'MP3',
                    'speakingRate' => $rate,
                ],
            ]);

        if (!$response->successful()) {
            Log::error('Google TTS API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \Exception("Google TTS API error: {$response->status()}");
        }

        $data = $response->json();
        $audioContent = $data['audioContent'] ?? null;

        if (!$audioContent) {
            throw new \Exception('No audio content in TTS response');
        }

        return base64_decode($audioContent);
    }

    /**
     * Cleanup expired TTS files
     *
     * @return int Number of files deleted
     */
    public function cleanupExpired(): int
    {
        $files = Storage::files('public/tts');
        $ttlSeconds = $this->ttlDays * 24 * 60 * 60;
        $deleted = 0;

        foreach ($files as $file) {
            $lastModified = Storage::lastModified($file);
            if ((time() - $lastModified) >= $ttlSeconds) {
                Storage::delete($file);
                $deleted++;
            }
        }

        return $deleted;
    }
}
