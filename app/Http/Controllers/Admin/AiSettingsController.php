<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AiSettingsController extends Controller
{
    /**
     * Display the AI settings page.
     */
    public function index()
    {
        $currentModel = Setting::get(
            'gemini_model',
            config('services.gemini.model', 'gemini-2.5-flash-lite')
        );

        // 連想配列: モデル名 => 説明
        $allowedModels = config('services.gemini.allowed_models', [
            'gemini-2.5-flash-lite' => '軽量・高速版。コスト効率重視。',
        ]);

        return Inertia::render('Admin/AiSettings', [
            'currentModel' => $currentModel,
            'allowedModels' => $allowedModels,
        ]);
    }

    /**
     * Update the AI settings.
     */
    public function update(Request $request)
    {
        $allowedModels = array_keys(config('services.gemini.allowed_models', []));

        $validated = $request->validate([
            'model' => ['required', 'string', 'in:' . implode(',', $allowedModels)],
        ], [
            'model.required' => 'モデルを選択してください。',
            'model.in' => '無効なモデルが選択されました。',
        ]);

        $previousModel = Setting::get('gemini_model', config('services.gemini.model'));
        $newModel = $validated['model'];

        Setting::set('gemini_model', $newModel);

        // Log the change
        Log::info('AI model changed', [
            'user_id' => auth()->id(),
            'user_email' => auth()->user()->email,
            'previous_model' => $previousModel,
            'new_model' => $newModel,
        ]);

        return back()->with('success', 'AIモデルを更新しました。');
    }
}
