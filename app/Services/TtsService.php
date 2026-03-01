<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Google\Cloud\TextToSpeech\V1\AudioConfig;
use Google\Cloud\TextToSpeech\V1\AudioEncoding;
use Google\Cloud\TextToSpeech\V1\Client\TextToSpeechClient;
use Google\Cloud\TextToSpeech\V1\SynthesisInput;
use Google\Cloud\TextToSpeech\V1\SynthesizeSpeechRequest;
use Google\Cloud\TextToSpeech\V1\VoiceSelectionParams;

class TtsService
{
    protected string $voice;
    protected float $speakingRate;
    protected int $ttlDays;

    public function __construct()
    {
        $this->voice = config('services.tts.voice', 'en-US-Neural2-J');
        $this->speakingRate = (float) config('services.tts.speaking_rate', 0.9);
        $this->ttlDays = (int) config('services.tts.ttl_days', 7);
    }

    /**
     * Synthesize text to speech and return cache key
     *
     * @param string $text Text to synthesize
     * @param float|null $speakingRate Optional speaking rate override
     * @return array{key: string, cacheHit: bool}
     */
    public function synthesize(string $text, ?float $speakingRate = null): array
    {
        $rate = $speakingRate ?? $this->speakingRate;
        $cacheKey = $this->getCacheKey($text, $rate);
        $path = self::audioPath($cacheKey);

        // Check cache
        if ($this->isCacheValid($path)) {
            Log::debug('TTS cache hit', ['text' => $text, 'key' => $cacheKey]);
            return [
                'key' => $cacheKey,
                'cacheHit' => true,
            ];
        }

        // Generate new audio
        $audioContent = $this->callGoogleTts($text, $rate);

        // Save to storage
        Storage::disk()->put($path, $audioContent);

        Log::info('TTS generated', [
            'text' => $text,
            'key' => $cacheKey,
        ]);

        return [
            'key' => $cacheKey,
            'cacheHit' => false,
        ];
    }

    /**
     * Build the storage path for a TTS audio file by cache key.
     */
    public static function audioPath(string $key): string
    {
        return "tts/{$key}.mp3";
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
     * Check if cached file is still valid (within TTL).
     * Uses a single lastModified() call; returns false if file does not exist.
     */
    protected function isCacheValid(string $path): bool
    {
        try {
            $lastModified = Storage::disk()->lastModified($path);
        } catch (\Exception $e) {
            return false;
        }

        $ttlSeconds = $this->ttlDays * 24 * 60 * 60;

        return (time() - $lastModified) < $ttlSeconds;
    }

    /**
     * Call Google Cloud TTS API using SDK (Service Account)
     */
    protected function callGoogleTts(string $text, float $rate): string
    {
        try {
            $client = new TextToSpeechClient(GoogleCloudClientFactory::clientOptions());

            $input = (new SynthesisInput())
                ->setText($text);

            $voice = (new VoiceSelectionParams())
                ->setLanguageCode('en-US')
                ->setName($this->voice);

            $audioConfig = (new AudioConfig())
                ->setAudioEncoding(AudioEncoding::MP3)
                ->setSpeakingRate($rate);

            $synthesizeRequest = (new SynthesizeSpeechRequest())
                ->setInput($input)
                ->setVoice($voice)
                ->setAudioConfig($audioConfig);

            $response = $client->synthesizeSpeech($synthesizeRequest);
            $client->close();

            $audioContent = $response->getAudioContent();

            if (!$audioContent) {
                throw new \Exception('No audio content in TTS response');
            }

            // SDK returns binary data
            return $audioContent;

        } catch (\Exception $e) {
            Log::error('Google TTS API error', [
                'error' => $e->getMessage(),
            ]);
            throw new \Exception("Google TTS API error: " . $e->getMessage());
        }
    }

    /**
     * Cleanup expired TTS files
     *
     * @return int Number of files deleted
     */
    public function cleanupExpired(): int
    {
        $files = Storage::disk()->files('tts');
        $ttlSeconds = $this->ttlDays * 24 * 60 * 60;
        $deleted = 0;

        foreach ($files as $file) {
            $lastModified = Storage::disk()->lastModified($file);
            if ((time() - $lastModified) >= $ttlSeconds) {
                Storage::disk()->delete($file);
                $deleted++;
            }
        }

        return $deleted;
    }
}
