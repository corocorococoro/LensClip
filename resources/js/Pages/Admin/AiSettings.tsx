import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

interface Props {
    currentModel: string;
    allowedModels: Record<string, string>; // { モデル名: 説明 }
}

export default function AiSettings({ currentModel, allowedModels }: Props) {
    const { flash } = usePage<{ flash: { success?: string } }>().props;

    const { data, setData, put, processing, errors } = useForm({
        model: currentModel,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.settings.ai.update'));
    };

    const modelNames = Object.keys(allowedModels);

    return (
        <AdminLayout title="AI設定">
            <Head title="AI設定 - 管理画面" />

            <div className="max-w-2xl">
                {/* Success message */}
                {flash?.success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {flash.success}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Gemini モデル設定
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            AI分析に使用するGeminiモデルを選択します。変更は即座に反映されます。
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-6">
                            <label
                                htmlFor="model"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                モデル
                            </label>
                            <select
                                id="model"
                                value={data.model}
                                onChange={(e) => setData('model', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {modelNames.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                            {errors.model && (
                                <p className="mt-2 text-sm text-red-600">{errors.model}</p>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                                現在の設定
                            </h3>
                            <div className="text-sm text-gray-600">
                                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                    {currentModel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={processing || data.model === currentModel}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processing ? '保存中...' : '保存する'}
                            </button>
                            {data.model !== currentModel && (
                                <span className="text-sm text-amber-600">
                                    ⚠️ 変更が未保存です
                                </span>
                            )}
                        </div>
                    </form>
                </div>

                {/* Model descriptions - サーバーから受け取った説明を表示 */}
                <div className="mt-6 bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">
                        モデルについて
                    </h3>
                    <dl className="space-y-3 text-sm">
                        {Object.entries(allowedModels).map(([model, description]) => (
                            <div key={model}>
                                <dt className="font-mono text-gray-900">{model}</dt>
                                <dd className="text-gray-500">{description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </AdminLayout>
    );
}
