<?php

namespace App\Support;

use App\Jobs\AnalyzeObservationJob;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

class DispatchObservationJob
{
    public function execute(AnalyzeObservationJob|CorrectObservationJob $job): void
    {
        try {
            Bus::dispatch($job);
        } catch (Throwable $exception) {
            // A newer attempt or a completed synchronous job must not be overwritten.
            Observation::query()->whereKey($job->observationId)
                ->where('status', 'processing')
                ->where('processing_token', $job->processingToken)
                ->update([
                    'status' => 'failed',
                    'error_message' => '処理を開始できませんでした。しばらく待ってから再試行してください。',
                ]);
            Log::warning('Observation job dispatch failed', [
                'observation_id' => $job->observationId,
                'exception' => $exception::class,
            ]);
        }
    }
}
