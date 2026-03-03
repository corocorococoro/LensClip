<?php

namespace App\Services;

class IdentifierFingerprintService
{
    /**
     * Build a deterministic anonymized fingerprint for sensitive identifiers.
     */
    public function fingerprint(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $normalizedValue = mb_strtolower(trim($value));
        $applicationKey = (string) config('app.key');

        return hash_hmac('sha256', $normalizedValue, $applicationKey);
    }
}
