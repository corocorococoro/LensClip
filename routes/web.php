<?php

use App\Http\Controllers\ObservationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TagController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
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
    Route::get('/dashboard', function () {
        $today = \App\Models\Observation::forUser(auth()->id())
            ->whereDate('created_at', today())
            ->count();
        $total = \App\Models\Observation::forUser(auth()->id())->count();
        $recent = \App\Models\Observation::forUser(auth()->id())
            ->ready()
            ->latest()
            ->take(3)
            ->get();

        return Inertia::render('Home', [
            'stats' => [
                'today' => $today,
                'total' => $total,
            ],
            'recent' => $recent,
        ]);
    })->name('dashboard');

    // Observations
    Route::get('/library', [ObservationController::class, 'index'])->name('library');
    Route::post('/observations', [ObservationController::class, 'store'])->name('observations.store');
    Route::get('/observations/{observation}/processing', [ObservationController::class, 'processing'])->name('observations.processing');
    Route::get('/observations/{observation}', [ObservationController::class, 'show'])->name('observations.show');
    Route::post('/observations/{observation}/retry', [ObservationController::class, 'retry'])->name('observations.retry');
    Route::delete('/observations/{observation}', [ObservationController::class, 'destroy'])->name('observations.destroy');
    Route::delete('/observations', [ObservationController::class, 'destroyAll'])->name('observations.destroyAll');
    Route::patch('/observations/{observation}/tags', [ObservationController::class, 'updateTags'])->name('observations.updateTags');

    // Tags
    Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
    Route::delete('/tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Admin routes (auth + admin middleware)
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', fn() => redirect()->route('admin.logs'));
    Route::get('/logs', [\App\Http\Controllers\Admin\LogController::class, 'index'])->name('logs');
    Route::get('/settings/ai', [\App\Http\Controllers\Admin\AiSettingsController::class, 'index'])->name('settings.ai');
    Route::put('/settings/ai', [\App\Http\Controllers\Admin\AiSettingsController::class, 'update'])->name('settings.ai.update');
});

require __DIR__ . '/auth.php';

