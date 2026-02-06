import AppLayout from '@/Layouts/AppLayout';
import { EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import ViewModeSwitcher from '@/Components/ViewModeSwitcher';
import CategoryCard from '@/Components/CategoryCard';
import LibraryMap from '@/Components/LibraryMap';
import type { ObservationSummary, Tag, LibraryViewMode, CategoryDefinition, DateGroup } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    observations: {
        data: ObservationSummary[];
        links?: unknown;
        meta?: unknown;
    };
    tags: Tag[];
    filters: {
        q?: string;
        tag?: string;
        view?: LibraryViewMode;
        category?: string;
    };
    viewMode?: LibraryViewMode;
    dateGroups?: DateGroup[];
    categories?: CategoryDefinition[];
    categoryCounts?: Record<string, number>;
}

export default function Library({
    observations,
    tags,
    filters,
    viewMode = 'date',
    dateGroups = [],
    categories = [],
    categoryCounts = {},
}: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [activeTag, setActiveTag] = useState(filters.tag || '');
    const [activeCategory, setActiveCategory] = useState(filters.category || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/library', { q: search, tag: activeTag, view: viewMode, category: activeCategory }, { preserveState: true });
    };

    const handleTagFilter = (tagName: string) => {
        const newTag = activeTag === tagName ? '' : tagName;
        setActiveTag(newTag);
        router.get('/library', { q: search, tag: newTag, view: viewMode, category: activeCategory }, { preserveState: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setActiveTag('');
        setActiveCategory('');
        router.get('/library', { view: viewMode });
    };

    const handleViewModeChange = (mode: LibraryViewMode) => {
        setActiveCategory('');
        router.get('/library', { q: search, tag: activeTag, view: mode }, { preserveState: true });
    };

    const handleCategorySelect = (categoryId: string) => {
        const newCategory = activeCategory === categoryId ? '' : categoryId;
        setActiveCategory(newCategory);
        router.get('/library', { q: search, tag: activeTag, view: viewMode, category: newCategory }, { preserveState: true });
    };

    // Group observations by category for category view
    const observationsByCategory: Record<string, ObservationSummary[]> = {};
    if (viewMode === 'category') {
        observations.data.forEach((obs) => {
            const cat = obs.category || 'other';
            if (!observationsByCategory[cat]) {
                observationsByCategory[cat] = [];
            }
            observationsByCategory[cat].push(obs);
        });
    }

    return (
        <AppLayout title="ライブラリ" fullScreen={viewMode === 'map'}>
            <Head title="ライブラリ" />

            {/* Header with View Mode Switcher - hide in map view (switcher is inside map) */}
            {viewMode !== 'map' && (
                <div className="flex items-center justify-between mb-4">
                    <ViewModeSwitcher currentMode={viewMode} onModeChange={handleViewModeChange} />
                </div>
            )}

            {/* Search - hide in map view */}
            {viewMode !== 'map' && (
                <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="なまえでさがす…"
                            className="w-full px-4 py-3 pl-10 bg-white rounded-xl border-0 shadow-sm focus:ring-2 focus:ring-brand-peach"
                            aria-label="観察記録を検索"
                        />
                        <span
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            aria-hidden="true"
                        >
                            🔍
                        </span>
                    </div>
                </form>
            )}

            {/* Tag Filters - hide in map and category view */}
            {viewMode === 'date' && tags.length > 0 && (
                <div
                    className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4"
                    role="group"
                    aria-label="タグでフィルタ"
                >
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => handleTagFilter(tag.name)}
                            aria-pressed={activeTag === tag.name}
                            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${activeTag === tag.name
                                    ? 'bg-brand-coral text-white'
                                    : 'bg-brand-cream text-brand-dark hover:bg-brand-beige'
                                }`}
                        >
                            #{tag.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Date View */}
            {viewMode === 'date' && (
                <>
                    {dateGroups.length > 0 ? (
                        <div className="space-y-6">
                            {dateGroups.map((group) => (
                                <div key={group.yearMonth}>
                                    <h2 className="text-xl font-bold text-brand-dark mb-3">
                                        {group.label}
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.observations.map((obs) => (
                                            <ObservationCard key={obs.id} observation={obs} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📭"
                            message={filters.q || filters.tag ? 'みつからなかったよ' : 'まだなにもないよ'}
                            action={
                                (filters.q || filters.tag) && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-brand-coral text-sm hover:text-brand-orange"
                                    >
                                        フィルタをクリア
                                    </button>
                                )
                            }
                        />
                    )}
                </>
            )}

            {/* Category View */}
            {viewMode === 'category' && (
                <>
                    {!activeCategory ? (
                        // Category grid
                        <div>
                            <h2 className="text-xl font-bold text-brand-dark mb-4">カテゴリ</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {categories.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        count={categoryCounts[category.id] || 0}
                                        observations={observationsByCategory[category.id] || []}
                                        onClick={() => handleCategorySelect(category.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Category detail - show observations in selected category
                        <div>
                            <button
                                onClick={() => handleCategorySelect('')}
                                className="flex items-center gap-2 text-brand-coral hover:text-brand-orange mb-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                カテゴリ一覧に戻る
                            </button>

                            <h2 className="text-xl font-bold text-brand-dark mb-4">
                                {categories.find((c) => c.id === activeCategory)?.name || activeCategory}
                            </h2>

                            {observations.data.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {observations.data.map((obs) => (
                                        <ObservationCard key={obs.id} observation={obs} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon="📭"
                                    message="このカテゴリにはまだなにもないよ"
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Map View */}
            {viewMode === 'map' && (
                <LibraryMap observations={observations.data} onModeChange={handleViewModeChange} />
            )}
        </AppLayout>
    );
}
