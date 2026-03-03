<?php

namespace App\Services;

use InvalidArgumentException;
use JsonException;

class GoogleCloudCredentialsResolver
{
    /**
     * @return array{credentials: array<string, mixed>|null, key_file_path: string|null}
     */
    public static function resolve(?string $credentialsJson, ?string $applicationCredentialsPath): array
    {
        $normalizedJson = self::normalize($credentialsJson);
        $normalizedPath = self::normalize($applicationCredentialsPath);

        if ($normalizedJson && $normalizedPath) {
            throw new InvalidArgumentException(
                'Set either GOOGLE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS, but not both.'
            );
        }

        if ($normalizedJson) {
            return [
                'credentials' => self::decodeCredentialsJson($normalizedJson),
                'key_file_path' => null,
            ];
        }

        if ($normalizedPath) {
            return [
                'credentials' => null,
                'key_file_path' => self::resolveCredentialsPath($normalizedPath),
            ];
        }

        return [
            'credentials' => null,
            'key_file_path' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function decodeCredentialsJson(string $credentialsJson): array
    {
        try {
            $decoded = json_decode($credentialsJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException(
                'GOOGLE_CREDENTIALS_JSON must be a valid JSON object string.',
                0,
                $exception
            );
        }

        if (! is_array($decoded) || ! isset($decoded['type']) || ! is_string($decoded['type'])) {
            throw new InvalidArgumentException(
                'GOOGLE_CREDENTIALS_JSON must decode to an object containing a string "type" field.'
            );
        }

        return $decoded;
    }

    private static function resolveCredentialsPath(string $applicationCredentialsPath): string
    {
        $resolvedPath = self::isAbsolutePath($applicationCredentialsPath)
            ? $applicationCredentialsPath
            : base_path($applicationCredentialsPath);

        if (! is_file($resolvedPath)) {
            throw new InvalidArgumentException(
                "GOOGLE_APPLICATION_CREDENTIALS file does not exist: {$resolvedPath}"
            );
        }

        if (! is_readable($resolvedPath)) {
            throw new InvalidArgumentException(
                "GOOGLE_APPLICATION_CREDENTIALS file is not readable: {$resolvedPath}"
            );
        }

        return $resolvedPath;
    }

    private static function isAbsolutePath(string $path): bool
    {
        if ($path[0] === DIRECTORY_SEPARATOR) {
            return true;
        }

        return preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1;
    }

    private static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim($value);

        return $normalized !== '' ? $normalized : null;
    }
}
