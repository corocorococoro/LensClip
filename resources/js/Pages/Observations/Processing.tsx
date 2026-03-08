import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui';
import type { ObservationStatus } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    observation: {
        id: string;
        status: ObservationStatus;
        thumb_url: string;
    };
}

const STEPS = [
    { emoji: '📸', label: '写真をかくにんちゅう', untilSeconds: 8 },
    { emoji: '🔍', label: 'AIが分析ちゅう', untilSeconds: 25 },
    { emoji: '✨', label: 'もうすぐ完成！', untilSeconds: Infinity },
] as const;

export default function Processing({ observation }: Props) {
    const [status, setStatus] = useState<ObservationStatus>(observation.status);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Elapsed time counter drives step transitions
    useEffect(() => {
        if (status !== 'processing') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status]);

    // SSE stream
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
            // Don't immediately show an error — the SSE connection may have dropped
            // due to a network blip or proxy timeout while analysis was still running.
            // Poll the observation status once to check if it already completed.
            fetch(`/observations/${observation.id}`, { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data: { status?: string; error_message?: string }) => {
                    if (data.status === 'ready') {
                        source.close();
                        router.visit(`/observations/${observation.id}`);
                    } else if (data.status === 'failed') {
                        source.close();
                        setStatus('failed');
                        setError(data.error_message || 'AI分析に失敗しました');
                    }
                    // Still 'processing' → EventSource will auto-reconnect; do nothing
                })
                .catch(() => {
                    // Network is down → EventSource will auto-reconnect; do nothing
                });
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
                    setElapsedSeconds(0);
                },
            }
        );
    };

    const handleBack = () => {
        router.visit('/dashboard');
    };

    const currentStepIndex = STEPS.findIndex((step) => elapsedSeconds < step.untilSeconds);
    const currentStep = STEPS[currentStepIndex];

    return (
        <AppLayout title="しらべてます">
            <Head title="しらべてます" />

            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                {/* Image Preview - clearly visible */}
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg mb-6 relative">
                    <img
                        src={observation.thumb_url}
                        alt="撮影した写真"
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                    />

                    {status === 'processing' && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div
                                className="text-5xl animate-bounce"
                                role="status"
                                aria-label="調査中"
                            >
                                {currentStep.emoji}
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

                {/* Step progress */}
                {status === 'processing' && (
                    <div className="flex flex-col items-center gap-3 mb-6" aria-live="polite">
                        <p className="text-brand-dark font-bold text-base">{currentStep.label}</p>

                        <div className="flex gap-2">
                            {STEPS.map((step, index) => (
                                <div
                                    key={step.label}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                                        index < currentStepIndex
                                            ? 'bg-brand-pink'
                                            : index === currentStepIndex
                                              ? 'bg-brand-sky animate-pulse'
                                              : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>

                        <Link
                            href="/library"
                            className="text-brand-muted text-xs hover:text-brand-pink mt-1"
                        >
                            ライブラリでまつ →
                        </Link>
                    </div>
                )}

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
            </div>
        </AppLayout>
    );
}
