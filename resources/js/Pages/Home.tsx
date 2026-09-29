import { useRestorePhotoScroll } from '@/hooks/useRestorePhotoScroll';
import { useUploads } from '@/hooks/useUploads';
import { mergeDiscoveries } from '@/lib/discoveries';
import DiscoveryCard from '@/Components/DiscoveryCard';
import { useUploadRefresh } from '@/hooks/useUploadRefresh';
import { EmptyState } from '@/Components/ui';
import { usePendingUploadNavigation } from '@/hooks/usePendingUploadNavigation';
import { photoHref, rememberPhotoOrigin } from '@/lib/photoNavigation';
import AppLayout from '@/Layouts/AppLayout';
import type { HomeStats, LookbackHighlight, MagazineTeaser, ObservationSummary } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    stats: HomeStats;
    recent: ObservationSummary[];
    lookback: LookbackHighlight | null;
    quizAvailable: boolean;
    magazine: MagazineTeaser | null;
}

function CameraIcon() {
    return (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

export default function Home({ stats, recent, lookback, quizAvailable, magazine }: Props) {
    const { url } = usePage();
    const lookbackHref = lookback ? photoHref(`/observations/${lookback.observation.id}`, url) : '';
    useRestorePhotoScroll();
    useUploadRefresh();
    const uploads = useUploads();
    const discoveries = mergeDiscoveries(recent, uploads).slice(0, 6);
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

                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink sm:text-4xl">図鑑</h1>
                            <p className="mt-2 text-sm leading-relaxed text-brand-muted">見つけた写真が、自分たちの図鑑になっていきます。</p>
                        </div>
                        <Link href="/library" className="hidden text-sm font-bold text-brand-primary-dark hover:text-brand-primary sm:block">図鑑を見る</Link>
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
                            <span className="mt-1 text-xs font-semibold text-brand-muted">今日</span>
                        </div>
                        <div className={`flex flex-col justify-center p-4 text-center sm:p-6 ${stats.processing > 0 ? 'bg-brand-cream-soft' : ''}`}>
                            <span className={`tabular-nums text-2xl font-bold sm:text-3xl ${stats.processing > 0 ? 'text-amber-700' : 'text-brand-muted'}`}>{stats.processing}</span>
                            <span className="mt-1 text-xs font-semibold text-brand-muted">調べている写真</span>
                        </div>
                    </div>
                </section>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="写真を撮る・選ぶ"
                    className="group mb-10 flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-brand-primary p-4 text-left text-white shadow-lg shadow-brand-primary/15 transition hover:bg-brand-primary-dark active:scale-[0.99] sm:p-5"
                >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition group-hover:bg-white/20 sm:h-16 sm:w-16"><CameraIcon /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold">写真を撮る・選ぶ</span>
                        <span className="mt-0.5 block text-sm text-white/80">撮影するか、端末の写真から選べます</span>
                    </span>
                    <svg className="h-5 w-5 shrink-0 opacity-75 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} aria-hidden="true" />

                {discoveries.length > 0 ? (
                    <section>
                        <div className="mb-4 flex items-end justify-between gap-4">
                            <div>

                                <h2 className="lens-section-title">最近の発見</h2>
                            </div>
                            <Link href="/library" className="text-sm font-bold text-brand-primary-dark hover:text-brand-primary">図鑑を見る</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                            {discoveries.map(entry => <DiscoveryCard key={entry.key} entry={entry} size="sm" />)}
                        </div>
                    </section>
                ) : stats.total === 0 ? (
                    <EmptyState icon="⌕" message={<>気になるものを、最初の1枚に。<br />写真を撮るか選ぶと、名前や特徴を調べられます。</>} />
                ) : null}

                {lookback && (
                    <section className="mt-10">
                        <div className="mb-4">

                            <h2 className="lens-section-title">あのときの発見</h2>
                        </div>
                        <Link
                            href={lookbackHref}
                            onClick={() => rememberPhotoOrigin(lookbackHref, url)}
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

                {quizAvailable && (
                    <section className="mt-10">
                        <div className="mb-4">

                            <h2 className="lens-section-title">発見クイズ</h2>
                        </div>
                        <Link
                            href="/quiz"
                            className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-brand-line bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-sand/80 hover:shadow-surface active:scale-[0.99] sm:p-4"
                        >
                            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-4xl sm:h-24 sm:w-24" aria-hidden="true">
                                🧠
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-bold text-brand-ink">これ、なんだっけ？</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">見つけた写真で「これ、なんだっけ？」。親子で答えを見てみよう。</p>
                            </div>
                            <svg className="h-5 w-5 shrink-0 text-brand-muted opacity-75 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                    </section>
                )}

                {magazine && (
                    <section className="mt-10">
                        <div className="mb-4">

                            <h2 className="lens-section-title">月刊図鑑</h2>
                        </div>
                        <Link
                            href={`/magazine/${magazine.yearMonth}`}
                            className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-brand-line bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-sand/80 hover:shadow-surface active:scale-[0.99] sm:p-4"
                        >
                            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-cream-soft text-4xl sm:h-24 sm:w-24" aria-hidden="true">
                                📖
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-bold text-brand-ink">{magazine.label}号</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">{magazine.count}件の発見を、一冊に。印刷して楽しむこともできます。</p>
                            </div>
                            <svg className="h-5 w-5 shrink-0 text-brand-muted opacity-75 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
