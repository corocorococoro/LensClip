<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TtsService
{
    protected string $credentialsPath;
    protected string $voice;
    protected float $speakingRate;
    protected int $ttlDays;

    public function __construct()
    {
        $path = config('services.google.credentials_path');
        if ($path && !str_starts_with($path, '/') && !preg_match('/^[A-Za-z]:\\\\/', $path)) {
            $path = base_path($path);
        }

        $this->credentialsPath = $path;
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
    protected function callGoogleTts(string $text, float $rate): string
    {
        $accessToken = $this->getAccessToken();

        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->post('https://texttospeech.googleapis.com/v1/text:synthesize', [
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
     * Get access token from service account credentials
     */
    protected function getAccessToken(): string
    {
        if (!$this->credentialsPath || !file_exists($this->credentialsPath)) {
            throw new \Exception('Google credentials not configured');
        }

        $credentials = json_decode(file_get_contents($this->credentialsPath), true);

        // Create JWT
        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/cloud-platform',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signatureInput = "{$header}.{$payload}";
        $privateKey = openssl_pkey_get_private($credentials['private_key']);
        openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = "{$signatureInput}." . base64_encode($signature);

        // Exchange JWT for access token
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to get access token');
        }

        return $response->json()['access_token'];
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
