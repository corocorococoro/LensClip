import { Button } from '@/Components/ui';
import type { ObservationStatus } from '@/types/models';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    observation: {
        id: string;
        status: ObservationStatus;
        thumb_url: string | null;
    };
}

const STEPS = [
    { emoji: '📸', label: '写真をかくにんちゅう', untilSeconds: 8 },
    { emoji: '🔍', label: 'AIが分析ちゅう', untilSeconds: 25 },
    { emoji: '✨', label: 'もうすぐ完成！', untilSeconds: Infinity },
] as const;

export default function ProcessingView({ observation }: Props) {
    const [timedOut, setTimedOut] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sourceRef = useRef<EventSource | null>(null);

    const closeStream = () => {
        sourceRef.current?.close();
        sourceRef.current = null;
    };

    useEffect(() => {
        if (observation.status !== 'processing' || timedOut) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [observation.status, timedOut]);

    useEffect(() => {
        if (observation.status !== 'processing' || timedOut) return;

        const source = new EventSource(`/observations/${observation.id}/stream`);
        sourceRef.current = source;

        const reloadObservation = () => {
            router.reload({ only: ['observation', 'categories'] });
        };

        source.addEventListener('ready', () => {
            closeStream();
            reloadObservation();
        });

        source.addEventListener('failed', () => {
            closeStream();
            reloadObservation();
        });

        source.addEventListener('timeout', () => {
            closeStream();
            setTimedOut(true);
        });

        source.onerror = () => {
            fetch(`/observations/${observation.id}`, { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data: { status?: string }) => {
                    if (data.status === 'ready' || data.status === 'failed') {
                        closeStream();
                        reloadObservation();
                    }
                })
                .catch(() => {
                    // EventSource will reconnect while the observation is still processing.
                });
        };

        return closeStream;
    }, [observation.id, observation.status, timedOut]);

    const handleRefresh = () => {
        closeStream();
        setElapsedSeconds(0);
        setTimedOut(false);
        router.reload({ only: ['observation', 'categories'] });
    };

    const handleBack = () => {
        closeStream();
        router.visit('/library');
    };

    const currentStepIndex = STEPS.findIndex((step) => elapsedSeconds < step.untilSeconds);
    const currentStep = STEPS[currentStepIndex];

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg mb-6 relative bg-gray-100">
                {observation.thumb_url ? (
                    <img
                        src={observation.thumb_url}
                        alt="撮影した写真"
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl" aria-hidden="true">
                        📷
                    </div>
                )}

                {!timedOut && (
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

                {timedOut && (
                    <div
                        className="absolute inset-0 bg-amber-50/95 flex flex-col items-center justify-center p-4"
                        role="alert"
                    >
                        <div className="text-5xl mb-4" aria-hidden="true">
                            ⏳
                        </div>
                        <div className="text-sm text-amber-700 text-center font-medium">
                            まだ時間がかかっています。状態を確認してください。
                        </div>
                    </div>
                )}
            </div>

            {!timedOut && (
                <div className="flex flex-col items-center gap-3 mb-6" aria-live="polite">
                    <p className="text-brand-dark font-bold text-base">{currentStep.label}</p>

                    <div className="flex gap-2">
                        {STEPS.map((step, index) => (
                            <div
                                key={step.label}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${index < currentStepIndex
                                    ? 'bg-brand-pink'
                                    : index === currentStepIndex
                                        ? 'bg-brand-sky animate-pulse'
                                        : 'bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-brand-muted text-xs hover:text-brand-pink mt-1"
                    >
                        ライブラリでまつ →
                    </button>
                </div>
            )}

            {timedOut && (
                <div className="flex gap-4">
                    <Button onClick={handleBack} variant="secondary">
                        ライブラリへ戻る
                    </Button>
                    <Button onClick={handleRefresh} variant="primary">
                        状態を確認
                    </Button>
                </div>
            )}
        </div>
    );
}
