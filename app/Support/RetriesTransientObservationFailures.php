<?php

namespace App\Support;

use Google\ApiCore\ApiException;
use Google\Cloud\Core\Exception\ServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Queue\Middleware\WithoutOverlapping;

trait RetriesTransientObservationFailures
{
    public int $timeout = 120;

    public function middleware(): array
    {
        // A duplicate delivery of this exact attempt must not process or remove the same images.
        // Keep the lock longer than the job timeout and shorter than queue retry_after.
        return [(new WithoutOverlapping('observation:'.$this->observationId.':'.($this->processingToken ?? 'legacy')))
            ->shared()->dontRelease()->expireAfter(150)];
    }

    private function isTransientFailure(\Throwable $exception): bool
    {
        if ($exception instanceof ConnectionException) {
            return true;
        }

        if ($exception instanceof RequestException) {
            $status = $exception->response->status();

            return $status === 408 || $status === 429 || $status >= 500;
        }

        if ($exception instanceof ApiException) {
            return in_array($exception->getStatus(), ['DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'ABORTED', 'INTERNAL', 'UNAVAILABLE'], true);
        }

        if ($exception instanceof ServiceException) {
            return in_array($exception->getCode(), [408, 429, 500, 502, 503, 504], true);
        }

        return false;
    }
}
