<?php

namespace App\Http\Controllers;

use App\Http\Requests\TtsSynthesizeRequest;
use App\Services\TtsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

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

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('TTS synthesis failed', ['error' => $e->getMessage()]);

            return response()->json([
                'error' => 'TTS synthesis failed',
            ], 500);
        }
    }
}
