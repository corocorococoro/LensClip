import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Props {
    observation: {
        id: string;
        status: string;
        thumb_url: string;
    };
}

export default function Processing({ observation }: Props) {
    const [status, setStatus] = useState(observation.status);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (status !== 'processing') return;

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/observations/${observation.id}`, {
                    headers: { Accept: 'application/json' },
                });
                const data = await response.json();

                if (data.status === 'ready') {
                    clearInterval(pollInterval);
                    router.visit(`/observations/${observation.id}`);
                } else if (data.status === 'failed') {
                    clearInterval(pollInterval);
                    setStatus('failed');
                    setError(data.error_message || 'AI分析に失敗しました');
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 1000);

        // Timeout after 60 seconds
        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            setStatus('failed');
            setError('タイムアウトしました。もう一度お試しください。');
        }, 60000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [observation.id, status]);

    const handleRetry = () => {
        setRetrying(true);
        router.post(`/observations/${observation.id}/retry`, {}, {
            onFinish: () => {
                setRetrying(false);
                setStatus('processing');
                setError(null);
            },
        });
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
                        className="w-full h-full object-cover"
                    />

                    {status === 'processing' && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                            <div className="text-6xl animate-bounce mb-4">🔍</div>
                            <div className="text-lg font-bold text-blue-600 animate-pulse">
                                しらべています...
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center p-4">
                            <div className="text-5xl mb-4">😢</div>
                            <div className="text-sm text-red-600 text-center font-medium">
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {status === 'failed' && (
                    <div className="flex gap-4">
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-bold transition-colors"
                        >
                            もどる
                        </button>
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold transition-colors disabled:opacity-50"
                        >
                            {retrying ? 'リトライ中...' : 'もういちどしらべる'}
                        </button>
                    </div>
                )}

                {status === 'processing' && (
                    <p className="text-gray-500 text-sm animate-pulse">
                        AIがなにかしらべてるよ...
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
