import { EmptyState } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import type { MagazineIssueSummary } from '@/types/models';
import { Head, Link } from '@inertiajs/react';

interface Props {
    issues: MagazineIssueSummary[];
}

export default function Index({ issues }: Props) {
    return (
        <AppLayout title="月刊マイずかん">
            <Head title="月刊マイずかん" />

            <div className="mx-auto max-w-3xl">
                <section className="mb-8">
                    <p className="lens-kicker mb-2">Monthly issues</p>
                    <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink">月刊マイずかん</h1>
                    <p className="mt-2 text-sm leading-relaxed text-brand-muted">まいつきの はっけんが、1さつの ずかんに なっていくよ。</p>
                </section>

                {issues.length === 0 ? (
                    <EmptyState
                        icon="⌕"
                        message={<>はっけんが たまると、まいつきの ずかんが できるよ。<br />まずは 気になったものを しらべてみよう。</>}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {issues.map((issue) => (
                            <Link
                                key={issue.yearMonth}
                                href={`/magazine/${issue.yearMonth}`}
                                className="group overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-sand/80 hover:shadow-surface active:scale-[0.99]"
                            >
                                <div className="aspect-[4/3] w-full overflow-hidden bg-brand-sand-soft">
                                    {issue.coverThumbUrl ? (
                                        <img
                                            src={issue.coverThumbUrl}
                                            alt={`${issue.label}号の表紙`}
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden="true">📖</div>
                                    )}
                                </div>
                                <div className="px-3.5 py-3">
                                    <p className="text-sm font-bold text-brand-ink">{issue.label}号</p>
                                    <p className="mt-0.5 text-xs font-semibold text-brand-muted">はっけん {issue.count} けん</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
