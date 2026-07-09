<?php

$googleCloudCredentials = \App\Services\GoogleCloudCredentialsResolver::resolve(
    env('GOOGLE_CREDENTIALS_JSON'),
    env('GOOGLE_APPLICATION_CREDENTIALS')
);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    'google_cloud' => [
        ...$googleCloudCredentials,
        'project_id' => env('GOOGLE_CLOUD_PROJECT_ID'),
        'storage_bucket' => env('GOOGLE_CLOUD_STORAGE_BUCKET'),
    ],

    'tts' => [
        'voice' => env('TTS_VOICE', 'en-US-Neural2-J'),
        'speaking_rate' => env('TTS_SPEAKING_RATE', 0.9),
        'ttl_days' => env('TTS_TTL_DAYS', 7),
    ],
];
