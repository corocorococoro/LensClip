<?php

namespace App\Http\Controllers;

use App\Http\Requests\TtsSynthesizeRequest;
use App\Services\TtsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
     * Stream an audio file by cache key.
     * Works with any Storage disk (local, public, gcs) without requiring a public URL or symlink.
     */
    public function stream(string $key): StreamedResponse
    {
        $path = "tts/{$key}.mp3";
        abort_unless(Storage::disk()->exists($path), Response::HTTP_NOT_FOUND);

        return Storage::disk()->response($path, null, ['Content-Type' => 'audio/mpeg']);
    }
}
