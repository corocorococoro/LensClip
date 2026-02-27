<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 必須環境変数のチェック — 設定漏れを即座に検出するため
        // コンソールコマンド（package:discover 等）ではスキップ（Dockerビルド時に .env がないため）
        if (!$this->app->runningInConsole()) {
            $required = [
                'FILESYSTEM_DISK',
                'GEMINI_API_KEY',
            ];
            foreach ($required as $key) {
                if (empty(env($key))) {
                    throw new \RuntimeException(
                        ".env に {$key} が設定されていません。.env.example を参照してください。"
                    );
                }
            }
        }

        if (config('app.env') !== 'local') {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);
    }
}
