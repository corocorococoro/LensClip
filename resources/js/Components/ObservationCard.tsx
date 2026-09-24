import type { CategoryDefinition, ObservationSummary } from '@/types/models';
import { Link, usePage } from '@inertiajs/react';
import { photoHref, rememberPhotoOrigin } from '@/lib/photoNavigation';

interface ObservationCardProps {
    observation: ObservationSummary;
    categories?: CategoryDefinition[];
    size?: 'sm' | 'md';
    showCategory?: boolean;
    statusLabel?: string;
}

export function ObservationCard({ observation, categories = [], size = 'md', showCategory = true, statusLabel }: ObservationCardProps) {
    const { url } = usePage();
    const href = photoHref(`/observations/${observation.id}`, url);
    const category = categories.find((item) => item.id === observation.category);
    const compact = size === 'sm';

    const milestone = observation.milestones?.[0];
    const milestoneBadge = milestone
        ? milestone.type === 'count' ? `✦ ${milestone.value}こめ` : '✦ はじめて'
        : null;

    return (
        <Link
            href={href}
            onClick={() => rememberPhotoOrigin(href, url)}
            className="group block min-w-0 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-sand/80 hover:shadow-surface active:scale-[0.99]"
        >
            <div className="relative aspect-square overflow-hidden bg-brand-sand-soft">
                {observation.thumb_url ? (
                    <img src={observation.thumb_url} alt={observation.title || '観察中の画像'} width={320} height={320} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-sand" role="img" aria-label={observation.title || '観察中の画像'}>
                        <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg>
                    </div>
                )}

                {observation.status === 'ready' && showCategory && category && (
                    <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 truncate rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-brand-ink shadow-sm backdrop-blur-md">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                    </span>
                )}

                {observation.status === 'ready' && milestoneBadge && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-brand-primary-dark shadow-sm backdrop-blur-md">
                        {milestoneBadge}
                    </span>
                )}
            </div>

            <div className={compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}>
                <p className={`${compact ? 'text-xs' : 'text-sm'} truncate font-bold text-brand-ink`}>
                    {observation.title || '選んだ写真'}
                </p>
                {(statusLabel || observation.status !== 'ready') && <p role="status" className="mt-1 text-xs font-semibold text-brand-primary-dark">{statusLabel || (observation.status === 'failed' ? '調査を再試行できます' : '調べています')}</p>}
            </div>
        </Link>
    );
}
