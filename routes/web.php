<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ObservationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TtsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => \Illuminate\Foundation\Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Legal pages
Route::get('/terms', function () {
    return Inertia::render('Terms');
})->name('terms');

Route::get('/privacy-policy', function () {
    return Inertia::render('PrivacyPolicy');
})->name('privacy-policy');

// Authenticated routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Home / Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Observations
    Route::get('/library', [ObservationController::class, 'index'])
        ->middleware('throttle:api-general')
        ->name('library');
    Route::post('/observations', [ObservationController::class, 'store'])
        ->middleware('throttle:observation-upload')
        ->name('observations.store');
    Route::get('/observations/{observation}/thumb', [ObservationController::class, 'thumb'])
        ->middleware('throttle:api-general')
        ->name('observations.thumb');
    Route::get('/observations/{observation}/processing', [ObservationController::class, 'processing'])
        ->middleware('throttle:api-general')
        ->name('observations.processing');
    Route::get('/observations/{observation}/stream', [ObservationController::class, 'stream'])
        ->middleware('throttle:api-general')
        ->name('observations.stream');
    Route::get('/observations/{observation}', [ObservationController::class, 'show'])
        ->middleware('throttle:api-general')
        ->name('observations.show');
    Route::post('/observations/{observation}/retry', [ObservationController::class, 'retry'])
        ->middleware('throttle:observation-retry')
        ->name('observations.retry');
    Route::delete('/observations/{observation}', [ObservationController::class, 'destroy'])
        ->middleware('throttle:api-general')
        ->name('observations.destroy');
    Route::delete('/observations', [ObservationController::class, 'destroyAll'])
        ->middleware('throttle:api-general')
        ->name('observations.destroyAll');
    Route::patch('/observations/{observation}/tags', [ObservationController::class, 'updateTags'])
        ->middleware('throttle:api-general')
        ->name('observations.updateTags');
    Route::patch('/observations/{observation}/category', [ObservationController::class, 'updateCategory'])
        ->middleware('throttle:api-general')
        ->name('observations.updateCategory');

    // Tags
    Route::get('/tags', [TagController::class, 'index'])
        ->middleware('throttle:api-general')
        ->name('tags.index');
    Route::post('/tags', [TagController::class, 'store'])
        ->middleware('throttle:api-general')
        ->name('tags.store');
    Route::delete('/tags/{tag}', [TagController::class, 'destroy'])
        ->middleware('throttle:api-general')
        ->name('tags.destroy');

    // TTS
    Route::post('/tts', [TtsController::class, 'synthesize'])
        ->middleware('throttle:api-general')
        ->name('tts.synthesize');
    Route::get('/tts/audio/{key}', [TtsController::class, 'stream'])
        ->middleware('throttle:api-general')
        ->name('tts.audio');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Admin routes (auth + admin middleware)
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', fn () => redirect()->route('admin.logs'));
    Route::get('/logs', [\App\Http\Controllers\Admin\LogController::class, 'index'])->name('logs');
    Route::get('/settings/ai', [\App\Http\Controllers\Admin\AiSettingsController::class, 'index'])->name('settings.ai');
    Route::put('/settings/ai', [\App\Http\Controllers\Admin\AiSettingsController::class, 'update'])->name('settings.ai.update');
});

require __DIR__.'/auth.php';
