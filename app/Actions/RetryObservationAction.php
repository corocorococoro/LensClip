<?php

namespace App\Actions;

use App\Jobs\AnalyzeObservationJob;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use App\Support\DispatchObservationJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RetryObservationAction
{
    public function execute(Observation $observation): void
    {
        $job = DB::transaction(function () use ($observation) {
            $current = Observation::query()->lockForUpdate()->find($observation->id);
            if (! $current || $current->status !== 'failed') {
                return null;
            }

            $correction = $current->processing_type === 'correction' && $current->correction_name;
            $token = (string) Str::uuid();
            $current->update([
                'status' => 'processing',
                'processing_type' => $correction ? 'correction' : 'identify',
                'processing_token' => $token,
                'error_message' => null,
            ]);

            return $correction
                ? new CorrectObservationJob($current->id, $token)
                : new AnalyzeObservationJob($current->id, $token);
        });

        if ($job) {
            app(DispatchObservationJob::class)->execute($job);
        }
        $observation->refresh();
    }
}
