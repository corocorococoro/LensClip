<?php

namespace Tests\Unit;

use App\Services\IdentifierFingerprintService;
use Tests\TestCase;

class IdentifierFingerprintServiceTest extends TestCase
{
    public function test_fingerprint_uses_hmac_and_normalizes_input(): void
    {
        config(['app.key' => 'test-app-key']);

        $service = app(IdentifierFingerprintService::class);

        $fingerprint = $service->fingerprint('  User@Example.COM ');
        $expected = hash_hmac('sha256', 'user@example.com', 'test-app-key');

        $this->assertSame($expected, $fingerprint);
    }

    public function test_fingerprint_returns_null_for_empty_values(): void
    {
        config(['app.key' => 'test-app-key']);

        $service = app(IdentifierFingerprintService::class);

        $this->assertNull($service->fingerprint(null));
        $this->assertNull($service->fingerprint('   '));
    }

    public function test_fingerprint_is_deterministic_for_equivalent_values(): void
    {
        config(['app.key' => 'test-app-key']);

        $service = app(IdentifierFingerprintService::class);

        $first = $service->fingerprint('USER@example.com');
        $second = $service->fingerprint(' user@example.com ');

        $this->assertSame($first, $second);
    }
}
