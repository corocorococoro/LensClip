import AppLayout from '@/Layouts/AppLayout';
import { Card, EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import type { ObservationSummary, HomeStats } from '@/types/models';
import { Head, Link, useForm } from '@inertiajs/react';
import { useRef, useEffect, useCallback, useState } from 'react';

interface Props {
    stats: HomeStats;
    recent: ObservationSummary[];
}

export default function Home({ stats, recent }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const { data, setData, post, processing, errors, reset } = useForm<{
        image: File | null;
        latitude: number | null;
        longitude: number | null;
    }>({
        image: null,
        latitude: null,
        longitude: null,
    });

    // Request location permission on mount
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                () => {
                    // Location permission denied or error - continue without location
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Set image and location data together
        setData((prev) => ({
            ...prev,
            image: file,
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
        }));
    };

    // useCallback でメモ化し、依存配列を正しく設定
    const submitImage = useCallback(() => {
        post('/observations', {
            forceFormData: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (!errors.image) {
                    alert('おくりものに しっぱいしちゃった。もういちど やってみてね！');
                }
            },
        });
    }, [post, reset]);

    // ファイル選択時に自動送信
    useEffect(() => {
        if (data.image) {
            submitImage();
        }
    }, [data.image, submitImage]);

    return (
        <AppLayout title="ホーム">
            <Head title="ホーム" />

            <div className="flex flex-col items-center">
                {/* Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mb-8">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-blue-600 tabular-nums">
                            {stats.today}
                        </div>
                        <div className="text-sm text-gray-500">きょう</div>
                    </Card>
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-purple-600 tabular-nums">
                            {stats.total}
                        </div>
                        <div className="text-sm text-gray-500">ぜんぶ</div>
                    </Card>
                </div>

                {/* Capture Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    aria-label="カメラでしらべる"
                    className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    {processing ? (
                        <>
                            <span className="text-4xl animate-spin" aria-hidden="true">
                                ⏳
                            </span>
                            <span className="text-sm mt-2 font-bold">おくりちゅう…</span>
                        </>
                    ) : (
                        <>
                            <span className="text-5xl" aria-hidden="true">
                                📷
                            </span>
                            <span className="text-sm mt-2 font-bold">しらべる</span>
                        </>
                    )}
                </button>
                <p className="text-gray-500 text-sm mb-4">タップしてなにかしらべてみよう！</p>

                {/* Error Display */}
                {errors.image && (
                    <div
                        className="w-full mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-bounce-short"
                        role="alert"
                    >
                        <span className="text-2xl" aria-hidden="true">
                            ⚠️
                        </span>
                        <p className="text-sm font-bold">{errors.image}</p>
                    </div>
                )}

                {/* Hidden File Input */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    aria-hidden="true"
                />

                {/* Recent Observations */}
                {recent.length > 0 && (
                    <div className="w-full">
                        <h2 className="text-lg font-bold text-gray-700 mb-3">
                            さいきんのはっけん
                        </h2>
                        <div className="grid grid-cols-3 gap-2">
                            {recent.map((obs) => (
                                <ObservationCard
                                    key={obs.id}
                                    observation={obs}
                                    size="sm"
                                />
                            ))}
                        </div>
                        <Link
                            href="/library"
                            className="block text-center text-blue-600 mt-4 text-sm font-medium hover:text-blue-700"
                        >
                            もっとみる →
                        </Link>
                    </div>
                )}

                {/* Empty State */}
                {recent.length === 0 && stats.total === 0 && !errors.image && (
                    <EmptyState
                        icon="🔍"
                        message={
                            <>
                                まだはっけんがないよ
                                <br />
                                カメラボタンをおしてみてね！
                            </>
                        }
                    />
                )}
            </div>
        </AppLayout>
    );
}
