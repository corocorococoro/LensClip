import { EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import { usePendingUploadNavigation } from '@/hooks/usePendingUploadNavigation';
import AppLayout from '@/Layouts/AppLayout';
import type { HomeStats, LookbackHighlight, ObservationSummary } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    stats: HomeStats;
    recent: ObservationSummary[];
    lookback: LookbackHighlight | null;
}

function CameraIcon() {
    return (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

export default function Home({ stats, recent, lookback }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const handleFileSelect = usePendingUploadNavigation(location, 'home');

    useEffect(() => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            () => undefined,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }, []);

    useEffect(() => {
        if (stats.processing === 0) return;
        const intervalId = window.setInterval(() => router.reload({ only: ['stats', 'recent'] }), 5000);
        return () => window.clearInterval(intervalId);
    }, [stats.processing]);

    return (
        <AppLayout title="ホーム">
            <Head title="ホーム" />

            <div className="mx-auto max-w-3xl">
                <section className="mb-8 sm:mb-10">
                    <p className="lens-kicker mb-2">My field guide</p>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink sm:text-4xl">わたしの図鑑</h1>
                            <p className="mt-2 text-sm leading-relaxed text-brand-muted">見つけたものが、ここに少しずつ育っていきます。</p>
                        </div>
                        <Link href="/library" className="hidden text-sm font-bold text-brand-primary-dark hover:text-brand-primary sm:block">すべて見る</Link>
                    </div>
                </section>

                <section className="lens-surface mb-5 overflow-hidden" aria-label="発見の記録数">
                    <div className="grid grid-cols-[1.45fr_1fr_1fr] divide-x divide-brand-line">
                        <div className="p-4 sm:p-6">
                            <p className="text-xs font-semibold text-brand-muted">これまでの発見</p>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="tabular-nums text-4xl font-bold tracking-tight text-brand-ink sm:text-5xl">{stats.total}</span>
                                <span className="text-sm font-bold text-brand-muted">件</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center p-4 text-center sm:p-6">
                            <span className="tabular-nums text-2xl font-bold text-brand-primary-dark sm:text-3xl">{stats.today}</span>
                            <span className="mt-1 text-xs font-semibold text-brand-muted">きょう</span>
                        </div>
                        <div className={`flex flex-col justify-center p-4 text-center sm:p-6 ${stats.processing > 0 ? 'bg-brand-cream-soft' : ''}`}>
                            <span className={`tabular-nums text-2xl font-bold sm:text-3xl ${stats.processing > 0 ? 'text-amber-700' : 'text-brand-muted'}`}>{stats.processing}</span>
                            <span className="mt-1 text-xs font-semibold text-brand-muted">しらべ中</span>
                        </div>
                    </div>
                </section>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="カメラでしらべる"
                    className="group mb-10 flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-brand-primary p-4 text-left text-white shadow-lg shadow-brand-primary/15 transition hover:bg-brand-primary-dark active:scale-[0.99] sm:p-5"
                >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition group-hover:bg-white/20 sm:h-16 sm:w-16"><CameraIcon /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold">新しいものをしらべる</span>
                        <span className="mt-0.5 block text-sm text-white/80">写真を撮るか、ライブラリから選べます</span>
                    </span>
                    <svg className="h-5 w-5 shrink-0 opacity-75 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileSelect} aria-hidden="true" />

                {recent.length > 0 ? (
                    <section>
                        <div className="mb-4 flex items-end justify-between gap-4">
                            <div>
                                <p className="lens-kicker mb-1">Recent finds</p>
                                <h2 className="lens-section-title">さいきんのはっけん</h2>
                            </div>
                            <Link href="/library" className="text-sm font-bold text-brand-primary-dark hover:text-brand-primary">もっとみる</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                            {recent.map((obs) => <ObservationCard key={obs.id} observation={obs} size="sm" />)}
                        </div>
                    </section>
                ) : stats.total === 0 ? (
                    <EmptyState icon="⌕" message={<>まだはっけんがありません。<br />気になったものを、最初の1枚に残してみましょう。</>} />
                ) : null}

                {lookback && (
                    <section className="mt-10">
                        <div className="mb-4">
                            <p className="lens-kicker mb-1">Remember this?</p>
                            <h2 className="lens-section-title">あのときの はっけん</h2>
                        </div>
                        <Link
                            href={`/observations/${lookback.observation.id}`}
                            className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-brand-line bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-sand/80 hover:shadow-surface active:scale-[0.99] sm:p-4"
                        >
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-sand-soft sm:h-24 sm:w-24">
                                {lookback.observation.thumb_url ? (
                                    <img
                                        src={lookback.observation.thumb_url}
                                        alt={lookback.observation.title || 'あのときの発見'}
                                        width={192}
                                        height={192}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                    />
                                ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="inline-flex rounded-full bg-brand-primary-soft px-2.5 py-1 text-[11px] font-bold text-brand-primary-dark">
                                    {lookback.label}
                                </span>
                                <p className="mt-1.5 truncate text-lg font-bold text-brand-ink">
                                    {lookback.observation.title}
                                </p>
                                {lookback.observation.created_at && (
                                    <p className="mt-0.5 text-xs text-brand-muted">
                                        {new Date(lookback.observation.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                )}
                            </div>
                            <svg className="h-5 w-5 shrink-0 text-brand-muted opacity-75 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
