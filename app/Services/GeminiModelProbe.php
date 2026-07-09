<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Throwable;

class GeminiModelProbe
{
    /**
     * @return array{ok: bool, message: string, status: int|null}
     */
    public function probe(string $model): array
    {
        $apiKey = config('services.gemini.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            return [
                'ok' => false,
                'message' => 'Gemini APIキーが未設定です。',
                'status' => null,
            ];
        }

        try {
            $response = Http::timeout(10)
                ->withHeader('x-goog-api-key', $apiKey)
                ->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                    [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => 'Reply with OK.'],
                                ],
                            ],
                        ],
                        'generationConfig' => [
                            'maxOutputTokens' => 8,
                            'temperature' => 0,
                        ],
                    ]
                );
        } catch (Throwable) {
            return [
                'ok' => false,
                'message' => 'Gemini APIへの接続に失敗しました。',
                'status' => null,
            ];
        }

        if ($response->successful()) {
            return [
                'ok' => true,
                'message' => '疎通確認に成功しました。',
                'status' => $response->status(),
            ];
        }

        return [
            'ok' => false,
            'message' => $this->messageForStatus($response->status()),
            'status' => $response->status(),
        ];
    }

    private function messageForStatus(int $status): string
    {
        return match ($status) {
            400 => 'モデル名またはリクエスト形式が受け付けられませんでした。',
            401, 403 => 'Gemini APIキーまたは権限で拒否されました。',
            404 => '指定したモデルが見つからないか、このAPIで利用できません。',
            429 => 'Gemini APIのレート制限に達しました。',
            default => 'Gemini APIがエラーを返しました。',
        };
    }
}
