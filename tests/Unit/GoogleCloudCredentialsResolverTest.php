<?php

namespace Tests\Unit;

use App\Services\GoogleCloudCredentialsResolver;
use InvalidArgumentException;
use Tests\TestCase;

class GoogleCloudCredentialsResolverTest extends TestCase
{
    public function test_it_returns_adc_fallback_when_no_credentials_are_set(): void
    {
        $resolved = GoogleCloudCredentialsResolver::resolve(null, null);

        $this->assertSame([
            'credentials' => null,
            'key_file_path' => null,
        ], $resolved);
    }

    public function test_it_uses_json_credentials_when_json_is_set(): void
    {
        $json = json_encode([
            'type' => 'service_account',
            'project_id' => 'lensclip',
        ], JSON_THROW_ON_ERROR);

        $resolved = GoogleCloudCredentialsResolver::resolve($json, null);

        $this->assertSame('service_account', $resolved['credentials']['type']);
        $this->assertNull($resolved['key_file_path']);
    }

    public function test_it_rejects_invalid_json_credentials(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('GOOGLE_CREDENTIALS_JSON must be a valid JSON object string.');

        GoogleCloudCredentialsResolver::resolve('not-json', null);
    }

    public function test_it_rejects_json_without_type_field(): void
    {
        $json = json_encode(['project_id' => 'lensclip'], JSON_THROW_ON_ERROR);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('GOOGLE_CREDENTIALS_JSON must decode to an object containing a string "type" field.');

        GoogleCloudCredentialsResolver::resolve($json, null);
    }

    public function test_it_resolves_relative_file_path(): void
    {
        $relativePath = 'storage/framework/testing/gcp-relative-'.uniqid().'.json';
        $absolutePath = base_path($relativePath);

        if (! is_dir(dirname($absolutePath))) {
            mkdir(dirname($absolutePath), 0777, true);
        }

        file_put_contents($absolutePath, '{"type":"service_account"}');

        try {
            $resolved = GoogleCloudCredentialsResolver::resolve(null, $relativePath);
        } finally {
            @unlink($absolutePath);
        }

        $this->assertNull($resolved['credentials']);
        $this->assertSame($absolutePath, $resolved['key_file_path']);
    }

    public function test_it_keeps_absolute_file_path(): void
    {
        $absolutePath = tempnam(sys_get_temp_dir(), 'gcp-');

        if ($absolutePath === false) {
            $this->fail('Failed to create a temporary file.');
        }

        file_put_contents($absolutePath, '{"type":"service_account"}');

        try {
            $resolved = GoogleCloudCredentialsResolver::resolve(null, $absolutePath);
        } finally {
            @unlink($absolutePath);
        }

        $this->assertNull($resolved['credentials']);
        $this->assertSame($absolutePath, $resolved['key_file_path']);
    }

    public function test_it_rejects_missing_credentials_file(): void
    {
        $missingPath = 'storage/framework/testing/does-not-exist-'.uniqid().'.json';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('GOOGLE_APPLICATION_CREDENTIALS file does not exist');

        GoogleCloudCredentialsResolver::resolve(null, $missingPath);
    }

    public function test_it_rejects_when_json_and_file_path_are_both_set(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage(
            'Set either GOOGLE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS, but not both.'
        );

        GoogleCloudCredentialsResolver::resolve('{"type":"service_account"}', 'service-account.json');
    }
}
