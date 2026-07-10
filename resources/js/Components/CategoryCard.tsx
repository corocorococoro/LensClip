import type { CategoryDefinition, ObservationSummary } from '@/types/models';

interface CategoryCardProps {
    category: CategoryDefinition;
    count: number;
    observations: ObservationSummary[];
    isActive?: boolean;
    onClick?: () => void;
}

export default function CategoryCard({ category, count, observations, isActive, onClick }: CategoryCardProps) {
    const previews = observations.slice(0, 3);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            className={`group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-surface active:scale-[0.99] ${isActive ? 'border-brand-primary ring-4 ring-brand-primary/10' : 'border-brand-line hover:border-brand-sand/80'}`}
        >
            <div className="grid aspect-[16/10] grid-cols-2 gap-px overflow-hidden bg-brand-line">
                {previews.length > 0 ? previews.map((obs, index) => (
                    <div key={obs.id} className={index === 0 && previews.length > 1 ? 'row-span-2' : ''}>
                        {obs.thumb_url ? <img src={obs.thumb_url} alt="" width={240} height={240} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="h-full w-full bg-brand-sand-soft" />}
                    </div>
                )) : (
                    <div className="col-span-2 flex h-full items-center justify-center bg-brand-cream-soft text-brand-sand">
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" /><path d="m4 16 5-5 4 4 2-2 5 5" /><circle cx="15.5" cy="8.5" r="1.5" /></svg>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        <h3 className="truncate text-sm font-bold text-brand-ink">{category.name}</h3>
                    </div>
                    <p className="mt-1 pl-4 text-xs font-medium text-brand-muted">{count}はっけん</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-brand-muted transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </div>
        </button>
    );
}
