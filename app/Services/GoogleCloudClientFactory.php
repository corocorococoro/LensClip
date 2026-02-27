<?php

namespace App\Services;

/**
 * GCP クライアント共通オプションを一元管理するファクトリ。
 *
 * - GOOGLE_CREDENTIALS_JSON（Railway等）: デコード済み配列を credentials に渡す
 * - GOOGLE_APPLICATION_CREDENTIALS（ローカル）: ファイルパスを credentials に渡す
 * - どちらも未設定: ADC (Application Default Credentials) にフォールバック
 */
class GoogleCloudClientFactory
{
    /**
     * GCP SDK クライアントに渡す共通オプション配列を返す。
     *
     * @return array<string, mixed>
     */
    public static function clientOptions(): array
    {
        $credentials = config('services.google_cloud.credentials');
        if ($credentials) {
            return ['credentials' => $credentials];
        }

        $keyFilePath = config('services.google_cloud.key_file_path');
        if ($keyFilePath) {
            return ['credentials' => $keyFilePath];
        }

        return [];
    }
}
