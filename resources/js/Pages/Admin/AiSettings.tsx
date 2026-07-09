import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

type ModelRow = {
    clientId: string;
    model: string;
    description: string;
};

type ProbeResult = {
    ok: boolean;
    message: string;
    status: number | null;
};

interface Props {
    currentModel: string;
    allowedModels: Record<string, string>;
    settingsError?: string | null;
}

const createClientId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createModelRow = (model = '', description = ''): ModelRow => ({
    clientId: createClientId(),
    model,
    description,
});

export default function AiSettings({ currentModel, allowedModels, settingsError }: Props) {
    const { flash } = usePage<PageProps<{ flash: { success?: string } }>>().props;
    const [probeResults, setProbeResults] = useState<Record<string, ProbeResult>>({});
    const [probingRows, setProbingRows] = useState<Record<string, boolean>>({});
    const allowedModelEntries = Object.entries(allowedModels);
    const initialAllowedModels =
        allowedModelEntries.length > 0
            ? allowedModelEntries.map(([model, description]) => createModelRow(model, description))
            : [createModelRow()];

    const { data, setData, put, processing, errors } = useForm({
        model: currentModel,
        allowed_models: initialAllowedModels,
    });
    const rowsRef = useRef(data.allowed_models);

    useEffect(() => {
        rowsRef.current = data.allowed_models;
    }, [data.allowed_models]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.settings.ai.update'));
    };

    const updateAllowedModel = (index: number, field: keyof ModelRow, value: string) => {
        const currentRow = data.allowed_models[index];
        const nextRows = data.allowed_models.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [field]: value } : row,
        );

        setProbeResults((current) => {
            const nextResults = { ...current };
            if (currentRow) {
                delete nextResults[currentRow.clientId];
            }

            return nextResults;
        });

        if (field === 'model' && currentRow?.model === data.model) {
            setData({
                ...data,
                model: value,
                allowed_models: nextRows,
            });

            return;
        }

        setData('allowed_models', nextRows);
    };

    const addAllowedModel = () => {
        setData('allowed_models', [...data.allowed_models, createModelRow()]);
    };

    const removeAllowedModel = (index: number) => {
        const removedRow = data.allowed_models[index];
        const nextRows = data.allowed_models.filter((_, rowIndex) => rowIndex !== index);
        const nextModel = nextRows.some((row) => row.model === data.model)
            ? data.model
            : '';

        setData({
            ...data,
            model: nextModel,
            allowed_models: nextRows,
        });
        if (removedRow) {
            setProbeResults((current) => {
                const nextResults = { ...current };
                delete nextResults[removedRow.clientId];

                return nextResults;
            });
            setProbingRows((current) => {
                const nextRows = { ...current };
                delete nextRows[removedRow.clientId];

                return nextRows;
            });
        }
    };

    const selectAllowedModel = (model: string) => {
        setData('model', model);
    };

    const probeAllowedModel = async (index: number) => {
        const row = data.allowed_models[index];
        const model = row?.model ?? '';
        const clientId = row?.clientId;

        if (!clientId) {
            return;
        }

        setProbingRows((current) => ({ ...current, [clientId]: true }));
        setProbeResults((current) => {
            const nextResults = { ...current };
            delete nextResults[clientId];

            return nextResults;
        });

        try {
            const response = await window.axios.post<ProbeResult>(
                route('admin.settings.ai.probe'),
                { model },
            );

            const currentRow = rowsRef.current.find((candidate) => candidate.clientId === clientId);
            if (!currentRow || currentRow.model !== model) {
                return;
            }

            setProbeResults((current) => ({
                ...current,
                [clientId]: response.data,
            }));
        } catch (error) {
            let message = '疎通確認に失敗しました。';

            if (axios.isAxiosError(error)) {
                const errors = error.response?.data?.errors as
                    | Record<string, string[]>
                    | undefined;
                message = errors?.model?.[0] ?? message;
            }

            const currentRow = rowsRef.current.find((candidate) => candidate.clientId === clientId);
            if (!currentRow || currentRow.model !== model) {
                return;
            }

            setProbeResults((current) => ({
                ...current,
                [clientId]: {
                    ok: false,
                    message,
                    status: null,
                },
            }));
        } finally {
            setProbingRows((current) => {
                const currentRow = rowsRef.current.find((candidate) => candidate.clientId === clientId);
                const nextRows = { ...current };

                if (!currentRow || currentRow.model !== model) {
                    delete nextRows[clientId];

                    return nextRows;
                }

                nextRows[clientId] = false;

                return nextRows;
            });
        }
    };

    const formErrors = errors as Record<string, string | undefined>;

    return (
        <AdminLayout title="AI設定">
            <Head title="AI設定 - 管理画面" />

            <div className="max-w-4xl">
                {flash?.success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {flash.success}
                    </div>
                )}
                {settingsError && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                        {settingsError}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Gemini モデル設定
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            許可モデル一覧とAI分析に使うモデルを管理します。保存後の解析から反映されます。
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-6">
                            <div className="mb-3 flex items-center justify-between gap-4">
                                <h3 className="text-sm font-medium text-gray-700">
                                    許可モデル一覧
                                </h3>
                                <button
                                    type="button"
                                    onClick={addAllowedModel}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    追加
                                </button>
                            </div>
                            {formErrors.allowed_models && (
                                <p className="mb-3 text-sm text-red-600">
                                    {formErrors.allowed_models}
                                </p>
                            )}
                            <div className="space-y-3">
                                {data.allowed_models.map((row, index) => (
                                    <div
                                        key={row.clientId}
                                        className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_auto_auto]"
                                    >
                                        <div>
                                            <label
                                                htmlFor={`allowed-model-${index}`}
                                                className="mb-1 block text-xs font-medium text-gray-500"
                                            >
                                                モデル名
                                            </label>
                                            <input
                                                id={`allowed-model-${index}`}
                                                value={row.model}
                                                onChange={(e) =>
                                                    updateAllowedModel(index, 'model', e.target.value)
                                                }
                                                placeholder="gemini-..."
                                                className="w-full rounded-lg border-gray-300 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            {formErrors[`allowed_models.${index}.model`] && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {formErrors[`allowed_models.${index}.model`]}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label
                                                htmlFor={`allowed-description-${index}`}
                                                className="mb-1 block text-xs font-medium text-gray-500"
                                            >
                                                説明
                                            </label>
                                            <input
                                                id={`allowed-description-${index}`}
                                                value={row.description}
                                                onChange={(e) =>
                                                    updateAllowedModel(
                                                        index,
                                                        'description',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="高速版。日常の解析向け。"
                                                className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            {formErrors[`allowed_models.${index}.description`] && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {formErrors[`allowed_models.${index}.description`]}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => probeAllowedModel(index)}
                                                disabled={
                                                    row.model.trim() === '' ||
                                                    probingRows[row.clientId]
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                            >
                                                {probingRows[row.clientId]
                                                    ? '確認中...'
                                                    : '疎通確認'}
                                            </button>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => selectAllowedModel(row.model)}
                                                disabled={row.model.trim() === ''}
                                                className={
                                                    row.model === data.model
                                                        ? 'w-full rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 disabled:cursor-not-allowed md:w-auto'
                                                        : 'w-full rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto'
                                                }
                                            >
                                                {row.model === data.model ? '使用中' : '使用する'}
                                            </button>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => removeAllowedModel(index)}
                                                disabled={data.allowed_models.length <= 1}
                                                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                            >
                                                削除
                                            </button>
                                        </div>
                                        {probeResults[row.clientId] && (
                                            <p
                                                className={
                                                    probeResults[row.clientId].ok
                                                        ? 'md:col-span-5 text-sm text-green-700'
                                                        : 'md:col-span-5 text-sm text-red-600'
                                                }
                                            >
                                                {probeResults[row.clientId].message}
                                                {probeResults[row.clientId].status
                                                    ? `（HTTP ${probeResults[row.clientId].status}）`
                                                    : ''}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.model && (
                                <p className="mt-3 text-sm text-red-600">{errors.model}</p>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                                使用モデル
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span>現在:</span>
                                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                    {currentModel || '未設定'}
                                </span>
                                <span>保存後:</span>
                                <span className="font-mono bg-blue-50 px-2 py-1 text-blue-700 rounded">
                                    {data.model || '未選択'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processing ? '保存中...' : '保存する'}
                            </button>
                            {data.model !== currentModel && (
                                <span className="text-sm text-amber-600">
                                    変更が未保存です
                                </span>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
