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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { data, setData, post, processing, progress, errors, reset } = useForm<{
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

    const clearPreview = useCallback(() => {
        setPreviewUrl((url) => {
            if (url) URL.revokeObjectURL(url);
            return null;
        });
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately before resize/upload
        setPreviewUrl(URL.createObjectURL(file));

        // クライアント側で 1024px WebP にリサイズしてから送ることで
        // ・ネットワーク転送量を大幅削減（例: 5MB JPEG → ~200KB WebP）
        // ・サーバーの orient/scaleDown/encode 処理が軽くなる
        // 失敗時は元ファイルをそのまま使用（サーバー側でフォールバック処理）
        let imageToUpload: File = file;
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            const scale = Math.min(1, 1024 / bitmap.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('canvas unavailable');
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/webp', 0.85);
            });
            if (blob) {
                imageToUpload = new File([blob], 'image.webp', { type: 'image/webp' });
            }
        } catch {
            // リサイズ失敗時は元ファイルをそのまま使用
        }

        setData((prev) => ({
            ...prev,
            image: imageToUpload,
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
        }));
    };

    // useCallback でメモ化し、依存配列を正しく設定
    const submitImage = useCallback(() => {
        post('/observations', {
            forceFormData: true,
            onSuccess: () => {
                reset();
                clearPreview();
                // ファイル input をクリアしないと同じ画像を再選択しても onChange が発火しない
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: (errors) => {
                clearPreview();
                // リトライ時に同じ画像を再選択できるよう input をクリア
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (!errors.image) {
                    alert('おくりものに しっぱいしちゃった。もういちど やってみてね！');
                }
            },
        });
    }, [post, reset, clearPreview]);

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

                {/* Capture Button / Upload Preview */}
                {previewUrl ? (
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-2xl shadow-brand-pink/25 mb-4">
                        <img src={previewUrl} alt="選択した写真" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                            <span className="text-3xl" aria-hidden="true">
                                {processing ? '📤' : '⏳'}
                            </span>
                            <span className="text-white text-xs font-bold drop-shadow">
                                {processing ? 'おくりちゅう…' : 'じゅんびちゅう…'}
                            </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div
                                className="h-full bg-gradient-to-r from-brand-pink to-brand-sky transition-all duration-300 ease-out"
                                style={{ width: `${progress?.percentage ?? 0}%` }}
                                role="progressbar"
                                aria-valuenow={progress?.percentage ?? 0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processing}
                        aria-label="カメラでしらべる"
                        className="w-32 h-32 bg-gradient-to-br from-brand-pink to-brand-sky hover:brightness-110 text-white rounded-full shadow-2xl shadow-brand-pink/25 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                    >
                        <span className="text-5xl" aria-hidden="true">
                            📷
                        </span>
                        <span className="text-sm mt-2 font-bold">しらべる</span>
                    </button>
                )}
                {!previewUrl && (
                    <p className="text-brand-muted text-sm mb-4">タップしてなにかしらべてみよう！</p>
                )}

                {/* Error Display */}
                {errors.image && (
                    <div
                        className="w-full mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-bounce-short"
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
