<?php

namespace App\Actions;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;

class RetryObservationAction
{
    public function execute(Observation $observation): void
    {
        $observation->update([
            'status' => 'processing',
            'error_message' => null,
        ]);

        AnalyzeObservationJob::dispatch($observation->id);
    }
}
