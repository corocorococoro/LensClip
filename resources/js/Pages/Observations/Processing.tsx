import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui';
import type { ObservationStatus } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Props {
    observation: {
        id: string;
        status: ObservationStatus;
        thumb_url: string;
    };
}

export default function Processing({ observation }: Props) {
    const [status, setStatus] = useState<ObservationStatus>(observation.status);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (status !== 'processing') return;

        const source = new EventSource(`/observations/${observation.id}/stream`);

        source.addEventListener('ready', () => {
            source.close();
            router.visit(`/observations/${observation.id}`);
        });

        source.addEventListener('failed', (e: MessageEvent) => {
            source.close();
            const data = JSON.parse(e.data) as { error_message?: string };
            setStatus('failed');
            setError(data.error_message || 'AI分析に失敗しました');
        });

        source.addEventListener('timeout', () => {
            source.close();
            setStatus('failed');
            setError('タイムアウトしました。もう一度お試しください。');
        });

        source.onerror = () => {
            source.close();
            setStatus('failed');
            setError('接続エラーが発生しました。もう一度お試しください。');
        };

        return () => source.close();
    }, [observation.id, status]);

    const handleRetry = () => {
        setRetrying(true);
        router.post(
            `/observations/${observation.id}/retry`,
            {},
            {
                onFinish: () => {
                    setRetrying(false);
                    setStatus('processing');
                    setError(null);
                },
            }
        );
    };

    const handleBack = () => {
        router.visit('/dashboard');
    };

    return (
        <AppLayout title="しらべてます">
            <Head title="しらべてます" />

            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                {/* Image Preview */}
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg mb-8 relative">
                    <img
                        src={observation.thumb_url}
                        alt="撮影した写真"
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                    />

                    {status === 'processing' && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                            <div
                                className="text-6xl animate-bounce mb-4"
                                role="status"
                                aria-label="調査中"
                            >
                                🔍
                            </div>
                            <div className="text-lg font-bold text-brand-pink animate-pulse">
                                しらべています…
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div
                            className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center p-4"
                            role="alert"
                        >
                            <div className="text-5xl mb-4" aria-hidden="true">
                                😢
                            </div>
                            <div className="text-sm text-red-600 text-center font-medium">
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {status === 'failed' && (
                    <div className="flex gap-4">
                        <Button onClick={handleBack} variant="secondary">
                            もどる
                        </Button>
                        <Button onClick={handleRetry} loading={retrying} variant="primary">
                            {retrying ? 'リトライ中…' : 'もういちどしらべる'}
                        </Button>
                    </div>
                )}

                {status === 'processing' && (
                    <p className="text-gray-500 text-sm animate-pulse" aria-live="polite">
                        AIがなにかしらべてるよ…
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
