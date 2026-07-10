import type { CategoryDefinition, ObservationSummary } from '@/types/models';
import { Link } from '@inertiajs/react';

interface ObservationCardProps {
    observation: ObservationSummary;
    categories?: CategoryDefinition[];
    size?: 'sm' | 'md';
    showCategory?: boolean;
}

export function ObservationCard({ observation, categories = [], size = 'md', showCategory = true }: ObservationCardProps) {
    const category = categories.find((item) => item.id === observation.category);
    const compact = size === 'sm';

    return (
        <Link
            href={`/observations/${observation.id}`}
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

                {observation.status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/35 backdrop-blur-[1px]">
                        <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm" role="status">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />解析中
                        </span>
                    </div>
                )}

                {observation.status === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/40">
                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm" role="status">確認が必要</span>
                    </div>
                )}

                {observation.status === 'ready' && showCategory && category && (
                    <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 truncate rounded-full bg-white/92 px-2 py-1 text-[10px] font-bold text-brand-ink shadow-sm backdrop-blur-md">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                    </span>
                )}
            </div>

            <div className={compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}>
                <p className={`${compact ? 'text-xs' : 'text-sm'} truncate font-bold text-brand-ink`}>
                    {observation.title || (observation.status === 'processing' ? 'しらべています' : '名前を確認中')}
                </p>
            </div>
        </Link>
    );
}
