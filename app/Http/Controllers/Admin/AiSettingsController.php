<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProbeAiModelRequest;
use App\Http\Requests\Admin\UpdateAiSettingsRequest;
use App\Services\GeminiModelProbe;
use App\Services\GeminiModelRegistry;
use App\Services\IdentifierFingerprintService;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use InvalidArgumentException;

class AiSettingsController extends Controller
{
    public function __construct(
        private readonly IdentifierFingerprintService $fingerprintService,
        private readonly GeminiModelRegistry $modelRegistry
    ) {}

    /**
     * Display the AI settings page.
     */
    public function index()
    {
        $settingsError = null;

        try {
            $allowedModels = $this->modelRegistry->allowedModels();
        } catch (InvalidArgumentException $e) {
            Log::warning('AI model settings are not ready for admin page.', [
                'error' => $e->getMessage(),
            ]);

            $allowedModels = [];
            $settingsError = 'Geminiモデル設定が未設定または不正です。許可モデルを登録して保存してください。';
        }

        return Inertia::render('Admin/AiSettings', [
            'currentModel' => $this->modelRegistry->configuredModel() ?? '',
            'allowedModels' => $allowedModels,
            'settingsError' => $settingsError,
        ]);
    }

    /**
     * Update the AI settings.
     */
    public function update(UpdateAiSettingsRequest $request)
    {
        $validated = $request->validated();

        $allowedModels = $this->modelRegistry->normalizeAllowedModels($validated['allowed_models']);

        if (count($allowedModels) !== count($validated['allowed_models'])) {
            throw ValidationException::withMessages([
                'allowed_models' => '同じモデル名が複数登録されています。',
            ]);
        }

        if (! array_key_exists($validated['model'], $allowedModels)) {
            throw ValidationException::withMessages([
                'model' => '使用するモデルは許可モデル一覧に含めてください。',
            ]);
        }

        $previousModel = $this->modelRegistry->configuredModel();
        $newModel = $validated['model'];

        $this->modelRegistry->save($newModel, $allowedModels);

        Log::info('AI model changed', [
            'user_id' => auth()->id(),
            'user_email_hash' => $this->fingerprintService->fingerprint(auth()->user()?->email),
            'previous_model' => $previousModel,
            'new_model' => $newModel,
            'allowed_models' => array_keys($allowedModels),
        ]);

        return back()->with('success', 'AIモデル設定を更新しました。');
    }

    public function probe(ProbeAiModelRequest $request, GeminiModelProbe $probe)
    {
        $validated = $request->validated();

        return response()->json($probe->probe($validated['model']));
    }
}
