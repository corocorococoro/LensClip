<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class GeminiModelRegistry
{
    public const CURRENT_MODEL_KEY = 'gemini_model';

    public const ALLOWED_MODELS_KEY = 'gemini_allowed_models';

    /**
     * @return array<string, string>
     */
    public function allowedModels(): array
    {
        $setting = Setting::where('key', self::ALLOWED_MODELS_KEY)->first();

        if (! $setting) {
            throw new InvalidArgumentException('Gemini allowed model list is not configured.');
        }

        if (is_string($setting->value) && $setting->value !== '') {
            $decoded = json_decode($setting->value, true);

            if (is_array($decoded)) {
                $models = $this->normalizeAllowedModels($decoded);

                if ($models !== []) {
                    return $models;
                }
            }
        }

        throw new InvalidArgumentException('Gemini allowed model list is invalid.');
    }

    public function currentModel(): string
    {
        $allowedModels = $this->allowedModels();
        $configuredModel = $this->configuredModel();

        if (is_string($configuredModel) && array_key_exists($configuredModel, $allowedModels)) {
            return $configuredModel;
        }

        Log::error('Configured Gemini model is not allowed.', [
            'configured_model' => is_string($configuredModel) ? $configuredModel : null,
            'allowed_models' => array_keys($allowedModels),
        ]);

        throw new InvalidArgumentException('Configured Gemini model is not allowed.');
    }

    public function configuredModel(): ?string
    {
        $setting = Setting::where('key', self::CURRENT_MODEL_KEY)->first();

        if ($setting) {
            return is_string($setting->value) && $setting->value !== '' ? $setting->value : null;
        }

        return null;
    }

    /**
     * @param  array<int|string, mixed>  $models
     * @return array<string, string>
     */
    public function normalizeAllowedModels(array $models): array
    {
        $normalized = [];

        foreach ($models as $model => $description) {
            if (is_array($description)) {
                $model = $description['model'] ?? '';
                $description = $description['description'] ?? '';
            }

            if (! is_string($model)) {
                throw new InvalidArgumentException('Gemini allowed model row is invalid.');
            }

            if (! is_string($description) && $description !== null) {
                throw new InvalidArgumentException('Gemini allowed model row is invalid.');
            }

            $model = trim($model);

            if ($model === '') {
                throw new InvalidArgumentException('Gemini allowed model row is invalid.');
            }

            $normalized[$model] = is_string($description) ? trim($description) : '';
        }

        return $normalized;
    }

    /**
     * @param  array<string, string>  $allowedModels
     */
    public function save(string $currentModel, array $allowedModels): void
    {
        $allowedModels = $this->normalizeAllowedModels($allowedModels);

        if ($allowedModels === []) {
            throw new InvalidArgumentException('At least one Gemini model must be allowed.');
        }

        if (! array_key_exists($currentModel, $allowedModels)) {
            throw new InvalidArgumentException('Current Gemini model must be in the allowed model list.');
        }

        DB::transaction(function () use ($allowedModels, $currentModel): void {
            Setting::set(self::ALLOWED_MODELS_KEY, json_encode($allowedModels, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            Setting::set(self::CURRENT_MODEL_KEY, $currentModel);
        });
    }
}
