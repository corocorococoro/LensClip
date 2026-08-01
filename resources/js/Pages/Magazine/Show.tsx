import { EmptyState } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import type { CategoryDefinition, MagazineCategoryBreakdown, MagazineEntry, Milestone } from '@/types/models';
import { Head, Link } from '@inertiajs/react';

const PrinterIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="7" />
    </svg>
);

interface CoverInfo {
    id: string;
    image_url: string | null;
    title: string | null;
}

interface Props {
    yearMonth: string;
    label: string;
    isCurrentMonth: boolean;
    isEmpty: boolean;
    cover: CoverInfo | null;
    entries: MagazineEntry[];
    categoryBreakdown: MagazineCategoryBreakdown[];
    processingCount: number;
    totalReadyCount: number;
    categories: CategoryDefinition[];
}

export default function Show({
    label,
    isCurrentMonth,
    isEmpty,
    cover,
    entries,
    categoryBreakdown,
    processingCount,
    totalReadyCount,
    categories,
}: Props) {
    const issueTitle = `${label}号`;

    const milestoneLabel = (milestone: Milestone): string => {
        switch (milestone.type) {
            case 'first_discovery':
                return 'ずかんの はじまり！';
            case 'first_category': {
                const name = categories.find((c) => c.id === milestone.category)?.name;
                return name ? `はじめての ${name}！` : 'はじめての なかま！';
            }
            case 'count':
                return `${milestone.value}こめの はっけん！`;
        }
    };

    const categoryOf = (entry: MagazineEntry) => categories.find((c) => c.id === entry.category);
    const maxBreakdown = Math.max(...categoryBreakdown.map((row) => row.count), 1);
    const milestoneEntries = entries.filter((entry) => entry.milestones.length > 0);

    return (
        <AppLayout title={issueTitle}>
            <Head title={`月刊マイずかん ${issueTitle}`} />

            <div className="mx-auto max-w-3xl">
                {/* 画面用の操作列(印刷には含めない) */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <Link href="/magazine" className="text-sm font-bold text-brand-primary-dark hover:text-brand-primary">
                        ← 号の いちらん
                    </Link>
                    {!isEmpty && (
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            いんさつして ほんに する
                        </button>
                    )}
                </div>

                {isEmpty ? (
                    <>
                        <EmptyState icon="⌕" message={<>この つきは はっけんが なかったよ。</>} />
                        <div className="mt-6 text-center print:hidden">
                            <Link
                                href="/magazine"
                                className="rounded-full border border-brand-line bg-white px-6 py-2.5 text-sm font-bold text-brand-ink transition hover:border-brand-sand active:scale-95"
                            >
                                ほかの つきを みる
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        {/* 表紙 */}
                        <section
                            aria-label="表紙"
                            className="print-exact mb-8 overflow-hidden rounded-3xl border border-brand-line bg-white shadow-surface break-after-page break-inside-avoid"
                        >
                            <div className="bg-brand-primary-soft px-6 pb-5 pt-7 text-center sm:px-10">
                                <p className="lens-kicker mb-1.5">My monthly field guide</p>
                                <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink sm:text-4xl">
                                    月刊マイずかん {issueTitle}
                                </h1>
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                    <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-primary-dark shadow-sm">
                                        はっけん {entries.length} けん
                                    </span>
                                    {isCurrentMonth && (
                                        <span className="rounded-full bg-brand-cream px-4 py-1.5 text-sm font-bold text-amber-700 shadow-sm">
                                            こんげつ号(まだ そだってるよ)
                                        </span>
                                    )}
                                </div>
                            </div>
                            {cover?.image_url && (
                                <div className="px-6 pb-7 pt-5 sm:px-10">
                                    <img
                                        src={cover.image_url}
                                        alt={cover.title || '今月の表紙'}
                                        className="mx-auto aspect-square w-full max-w-md rounded-2xl object-cover shadow-surface"
                                    />
                                    {cover.title && (
                                        <p className="mt-3 text-center text-sm font-bold text-brand-muted">こんげつの 1まい: {cover.title}</p>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* しらべ中の注記(未確定のものは隠さず、載らない理由を書く) */}
                        {processingCount > 0 && (
                            <p className="mb-6 rounded-2xl bg-brand-cream-soft px-4 py-3 text-sm font-semibold text-amber-700 print:hidden">
                                しらべ中の はっけん {processingCount} けんは、まだ のっていません。
                            </p>
                        )}

                        {/* 誌面(発見エントリ) */}
                        <section aria-label="今月の発見" className="grid grid-cols-2 gap-3 sm:gap-4">
                            {entries.map((entry) => {
                                const category = categoryOf(entry);

                                return (
                                    <article
                                        key={entry.id}
                                        className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm break-inside-avoid"
                                    >
                                        <Link href={`/observations/${entry.id}`} className="block print:pointer-events-none">
                                            <div className="aspect-square w-full overflow-hidden bg-brand-sand-soft">
                                                {entry.image_url ? (
                                                    <img
                                                        src={entry.image_url}
                                                        alt={entry.title || 'はっけん'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden="true">📷</div>
                                                )}
                                            </div>
                                        </Link>
                                        <div className="px-3.5 py-3">
                                            <p className="text-[11px] font-semibold text-brand-muted">{entry.date}</p>
                                            <p className="mt-0.5 text-base font-bold text-brand-ink">{entry.title || '???'}</p>
                                            {category && (
                                                <span
                                                    className="print-exact mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold ring-1 ring-brand-line"
                                                    style={{ color: category.color }}
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                                                    {category.name}
                                                </span>
                                            )}
                                            {entry.milestones.map((milestone, i) => (
                                                <span
                                                    key={i}
                                                    className="print-exact mt-1.5 ml-1.5 inline-flex items-center gap-1 rounded-full bg-brand-primary-soft px-2 py-0.5 text-[11px] font-bold text-brand-primary-dark"
                                                >
                                                    <span aria-hidden="true">✦</span>
                                                    {milestoneLabel(milestone)}
                                                </span>
                                            ))}
                                            {entry.description && (
                                                <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{entry.description}</p>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        {/* 裏表紙 */}
                        <section
                            aria-label="今月のまとめ"
                            className="print-exact mt-8 rounded-3xl border border-brand-line bg-white px-6 py-7 shadow-surface break-before-page break-inside-avoid sm:px-10"
                        >
                            <p className="lens-kicker mb-1.5">Summary</p>
                            <h2 className="lens-section-title mb-5">こんげつの まとめ</h2>

                            {categoryBreakdown.length > 0 && (
                                <div className="mb-6 space-y-2.5">
                                    {categoryBreakdown.map((row) => (
                                        <div key={row.id} className="flex items-center gap-3">
                                            <span className="w-20 shrink-0 text-sm font-bold" style={{ color: row.color }}>
                                                {row.name}
                                            </span>
                                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-brand-sand-soft">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${(row.count / maxBreakdown) * 100}%`, backgroundColor: row.color }}
                                                />
                                            </div>
                                            <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-brand-ink">
                                                {row.count} けん
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestoneEntries.length > 0 && (
                                <div className="mb-6">
                                    <p className="mb-2 text-sm font-bold text-brand-ink">こんげつの ふしめ</p>
                                    <ul className="space-y-1.5">
                                        {milestoneEntries.map((entry) =>
                                            entry.milestones.map((milestone, i) => (
                                                <li key={`${entry.id}-${i}`} className="flex items-center gap-2 text-sm text-brand-muted">
                                                    <span className="text-brand-primary-dark" aria-hidden="true">✦</span>
                                                    <span className="font-semibold text-brand-ink">{entry.title || '???'}</span>
                                                    {milestoneLabel(milestone)}
                                                </li>
                                            )),
                                        )}
                                    </ul>
                                </div>
                            )}

                            <div className="flex items-end justify-between gap-4 border-t border-brand-line pt-5">
                                <div>
                                    <p className="text-xs font-semibold text-brand-muted">ずかん ぜんぶで</p>
                                    <p className="mt-0.5 text-2xl font-bold tabular-nums text-brand-ink">{totalReadyCount} けんの はっけん</p>
                                </div>
                                <p className="text-sm font-bold text-brand-primary-dark">らいごうへ つづく →</p>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
