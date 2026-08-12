<?php

namespace App\Actions;

use App\Jobs\AnalyzeObservationJob;
use App\Jobs\CorrectObservationJob;
use App\Models\Observation;
use Illuminate\Support\Str;

class RetryObservationAction
{
    public function execute(Observation $observation): void
    {
        if ($observation->processing_type === 'correction' && $observation->correction_name) {
            $token = (string) Str::uuid();
            $observation->update([
                'status' => 'processing',
                'processing_token' => $token,
                'error_message' => null,
            ]);

            CorrectObservationJob::dispatch($observation->id, $token);

            return;
        }

        $observation->update([
            'status' => 'processing',
            'processing_type' => 'identify',
            'processing_token' => null,
            'error_message' => null,
        ]);

        AnalyzeObservationJob::dispatch($observation->id);
    }
}
