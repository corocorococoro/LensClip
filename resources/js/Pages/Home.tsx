import AppLayout from '@/Layouts/AppLayout';
import { Card, EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import type { ObservationSummary, HomeStats } from '@/types/models';
import { setPendingUpload } from '@/uploadPendingStore';
import { Head, Link, router } from '@inertiajs/react';
import { useRef, useEffect, useState } from 'react';

interface Props {
    stats: HomeStats;
    recent: ObservationSummary[];
}

export default function Home({ stats, recent }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
        setPendingUpload(file, location?.latitude ?? null, location?.longitude ?? null);
        router.visit('/observations/upload-pending');
    };

    return (
        <AppLayout title="ホーム">
            <Head title="ホーム" />

            <div className="flex flex-col items-center">
                {/* Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mb-8">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-brand-pink tabular-nums">
                            {stats.today}
                        </div>
                        <div className="text-sm text-brand-muted">きょう</div>
                    </Card>
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-brand-sky tabular-nums">
                            {stats.total}
                        </div>
                        <div className="text-sm text-brand-muted">ぜんぶ</div>
                    </Card>
                </div>

                {/* Capture Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="カメラでしらべる"
                    className="w-32 h-32 bg-gradient-to-br from-brand-pink to-brand-sky hover:brightness-110 text-white rounded-full shadow-2xl shadow-brand-pink/25 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 mb-4"
                >
                    <span className="text-5xl" aria-hidden="true">
                        📷
                    </span>
                    <span className="text-sm mt-2 font-bold">しらべる</span>
                </button>
                <p className="text-brand-muted text-sm mb-4">タップしてなにかしらべてみよう！</p>

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
                        <h2 className="text-lg font-bold text-brand-dark mb-3">
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
                            className="block text-center text-brand-pink mt-4 text-sm font-medium hover:text-brand-sky"
                        >
                            もっとみる →
                        </Link>
                    </div>
                )}

                {/* Empty State */}
                {recent.length === 0 && stats.total === 0 && (
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
