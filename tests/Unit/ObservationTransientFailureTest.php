<?php

namespace Tests\Unit;

use App\Support\RetriesTransientObservationFailures;
use Google\ApiCore\ApiException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use PHPUnit\Framework\TestCase;

class ObservationTransientFailureTest extends TestCase
{
    public function test_only_transient_provider_failures_are_retried(): void
    {
        $policy = new class
        {
            use RetriesTransientObservationFailures;

            public function retry(\Throwable $exception): bool
            {
                return $this->isTransientFailure($exception);
            }
        };
        $this->assertTrue($policy->retry(new ConnectionException));
        foreach ([408, 429, 500, 503] as $code) {
            $this->assertTrue($policy->retry(new RequestException(new Response(new \GuzzleHttp\Psr7\Response($code)))));
        }
        foreach ([400, 401, 403, 404, 422] as $code) {
            $this->assertFalse($policy->retry(new RequestException(new Response(new \GuzzleHttp\Psr7\Response($code)))));
        }
        $this->assertTrue($policy->retry(new ApiException('unavailable', 14, 'UNAVAILABLE')));
        $this->assertFalse($policy->retry(new ApiException('denied', 7, 'PERMISSION_DENIED')));
        $this->assertFalse($policy->retry(new \RuntimeException('安全性')));
        $this->assertFalse($policy->retry(new \UnexpectedValueException('invalid AI category')));
    }
}
