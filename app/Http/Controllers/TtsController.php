<?php

namespace App\Http\Controllers;

use App\Http\Requests\TtsSynthesizeRequest;
use App\Services\TtsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TtsController extends Controller
{
    public function __construct(
        protected TtsService $ttsService
    ) {
    }

    /**
     * Synthesize text to speech and return audio URL
     */
    public function synthesize(TtsSynthesizeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->ttsService->synthesize(
                text: $validated['text'],
                speakingRate: $validated['speakingRate'] ?? null
            );

            return response()->json([
                'url' => route('tts.audio', ['key' => $result['key']]),
                'cacheHit' => $result['cacheHit'],
            ]);
        } catch (\Exception $e) {
            Log::error('TTS synthesis failed', ['error' => $e->getMessage()]);

            return response()->json([
                'error' => 'TTS synthesis failed',
            ], 500);
        }
    }

    /**
     * Serve an audio file by cache key.
     * Works with any Storage disk (local, public, gcs) without requiring a public URL or symlink.
     */
    public function stream(string $key): Response
    {
        $path = TtsService::audioPath($key);

        if (!Storage::disk()->exists($path)) {
            Log::warning('TTS stream: file not found', ['key' => $key, 'path' => $path, 'disk' => config('filesystems.default')]);
            abort(404);
        }

        try {
            $content = Storage::disk()->get($path);
            $length = strlen($content);
            Log::debug('TTS stream: serving audio', ['key' => $key, 'bytes' => $length]);

            return response($content, 200, [
                'Content-Type' => 'audio/mpeg',
                'Content-Length' => $length,
                'Cache-Control' => 'private, max-age=86400',
            ]);
        } catch (\Exception $e) {
            Log::error('TTS stream: read failed', ['key' => $key, 'error' => $e->getMessage()]);
            abort(500);
        }
    }
}
