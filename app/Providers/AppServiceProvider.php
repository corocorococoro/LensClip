<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\RateLimiter;
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
        RateLimiter::for('observation-upload', function (Request $request) {
            $identifier = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(10)->by($identifier);
        });

        RateLimiter::for('observation-retry', function (Request $request) {
            $identifier = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(5)->by($identifier);
        });

        RateLimiter::for('api-general', function (Request $request) {
            $identifier = $request->user()?->id ?? $request->ip();
            $routeName = $request->route()?->getName() ?? 'unknown-route';

            return Limit::perMinute(60)->by($identifier.'|'.$routeName);
        });

        if (config('app.env') !== 'local') {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);
    }
}
