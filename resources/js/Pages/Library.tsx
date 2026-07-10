import AppLayout from '@/Layouts/AppLayout';
import { EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import ViewModeSwitcher from '@/Components/ViewModeSwitcher';
import CategoryCard from '@/Components/CategoryCard';
import LibraryMap from '@/Components/LibraryMap';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type {
    ObservationSummary,
    Tag,
    LibraryViewMode,
    CategoryDefinition,
    DateGroup,
    CursorPagination,
    CategoryPreviews,
} from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface Props {
    observations: {
        data: ObservationSummary[];
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
    categoryPreviews?: CategoryPreviews;
    pagination?: CursorPagination;
}

/** dateGroups をマージ（同月は observation を結合） */
function mergeDateGroups(existing: DateGroup[], incoming: DateGroup[]): DateGroup[] {
    const merged = existing.map((group) => ({
        ...group,
        observations: [...group.observations],
    }));
    for (const group of incoming) {
        const found = merged.find((g) => g.yearMonth === group.yearMonth);
        if (found) {
            found.observations.push(...group.observations);
        } else {
            merged.push(group);
        }
    }
    return merged;
}

function uniqueProcessingIds(observations: ObservationSummary[]): string[] {
    return Array.from(
        new Set(
            observations
                .filter((observation) => observation.status === 'processing')
                .map((observation) => observation.id),
        ),
    );
}

function replaceObservation(
    observation: ObservationSummary,
    updatesById: Map<string, ObservationSummary>,
): ObservationSummary {
    const update = updatesById.get(observation.id);
    if (!update) return observation;

    if (
        observation.status === update.status &&
        observation.title === update.title &&
        observation.thumb_url === update.thumb_url &&
        observation.category === update.category
    ) {
        return observation;
    }

    return { ...observation, ...update };
}

function updateDateGroups(
    groups: DateGroup[],
    updatesById: Map<string, ObservationSummary>,
): DateGroup[] {
    let changed = false;

    const nextGroups = groups.map((group) => {
        const nextObservations = group.observations.map((observation) => {
            const nextObservation = replaceObservation(observation, updatesById);
            if (nextObservation !== observation) changed = true;
            return nextObservation;
        });

        return nextObservations === group.observations
            ? group
            : { ...group, observations: nextObservations };
    });

    return changed ? nextGroups : groups;
}

function updateObservationList(
    observations: ObservationSummary[],
    updatesById: Map<string, ObservationSummary>,
): ObservationSummary[] {
    let changed = false;

    const nextObservations = observations.map((observation) => {
        const nextObservation = replaceObservation(observation, updatesById);
        if (nextObservation !== observation) changed = true;
        return nextObservation;
    });

    return changed ? nextObservations : observations;
}

function libraryContentKey(filters: Props['filters'], viewMode: LibraryViewMode): string {
    return JSON.stringify([
        filters.q ?? '',
        filters.tag ?? '',
        filters.category ?? '',
        viewMode,
    ]);
}

export default function Library(props: Props) {
    const viewMode = props.viewMode ?? 'date';

    return (
        <AppLayout title="ライブラリ" fullScreen={viewMode === 'map'}>
            <Head title="ライブラリ" />
            <LibraryContent
                key={libraryContentKey(props.filters, viewMode)}
                {...props}
                viewMode={viewMode}
            />
        </AppLayout>
    );
}

function LibraryContent({
    observations,
    tags,
    filters,
    viewMode = 'date',
    dateGroups: initialDateGroups = [],
    categories = [],
    categoryCounts = {},
    categoryPreviews = {},
    pagination: initialPagination,
}: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [activeTag, setActiveTag] = useState(filters.tag || '');

    // --- 無限スクロール用ステート ---
    const [allDateGroups, setAllDateGroups] = useState(initialDateGroups);
    const [categoryObservations, setCategoryObservations] = useState<ObservationSummary[]>(
        observations.data,
    );
    const [pagination, setPagination] = useState<CursorPagination>(
        initialPagination ?? { hasMore: false, nextCursor: null },
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadMoreAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => loadMoreAbortRef.current?.abort();
    }, []);

    // --- Load more ---
    const loadMore = useCallback(async () => {
        if (!pagination.nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        const controller = new AbortController();
        loadMoreAbortRef.current = controller;

        const params = new URLSearchParams();
        params.set('view', viewMode);
        params.set('cursor', pagination.nextCursor);
        if (filters.q) params.set('q', filters.q);
        if (filters.tag) params.set('tag', filters.tag);
        if (filters.category) params.set('category', filters.category);

        try {
            const res = await fetch(`/library?${params.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            });
            if (!res.ok) return;
            const data = await res.json();

            if (viewMode === 'date' && data.dateGroups) {
                setAllDateGroups((prev) => mergeDateGroups(prev, data.dateGroups));
            } else if (data.observations) {
                setCategoryObservations((prev) => [...prev, ...data.observations]);
            }

            setPagination(data.pagination ?? { hasMore: false, nextCursor: null });
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                throw error;
            }
        } finally {
            if (loadMoreAbortRef.current === controller) {
                loadMoreAbortRef.current = null;
            }
            if (!controller.signal.aborted) setIsLoadingMore(false);
        }
    }, [pagination.nextCursor, isLoadingMore, viewMode, filters]);

    const sentinelRef = useInfiniteScroll(loadMore, pagination.hasMore && !isLoadingMore);

    const visibleObservations = useMemo(() => {
        if (viewMode === 'date') {
            return allDateGroups.flatMap((group) => group.observations);
        }

        return categoryObservations;
    }, [allDateGroups, categoryObservations, viewMode]);

    const processingIds = useMemo(
        () => uniqueProcessingIds(visibleObservations),
        [visibleObservations],
    );

    useEffect(() => {
        if (processingIds.length === 0) return;

        let cancelled = false;
        let inFlight = false;

        const refreshProcessingCards = async () => {
            if (inFlight) return;
            inFlight = true;

            const params = new URLSearchParams();
            processingIds.forEach((id) => params.append('ids[]', id));

            try {
                const res = await fetch(`/observations/statuses?${params.toString()}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (!res.ok || cancelled) return;

                const data = (await res.json()) as { observations?: ObservationSummary[] };
                const updates = data.observations ?? [];
                if (updates.length === 0) return;

                const updatesById = new Map(updates.map((observation) => [observation.id, observation]));

                setAllDateGroups((groups) => updateDateGroups(groups, updatesById));
                setCategoryObservations((current) =>
                    updateObservationList(current, updatesById),
                );
            } finally {
                inFlight = false;
            }
        };

        refreshProcessingCards();
        const intervalId = window.setInterval(refreshProcessingCards, 4000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [processingIds]);

    // --- Navigation handlers ---
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/library',
            { q: search, tag: activeTag, view: viewMode, category: filters.category },
            { preserveState: true },
        );
    };

    const handleTagFilter = (tagName: string) => {
        const newTag = activeTag === tagName ? '' : tagName;
        setActiveTag(newTag);
        router.get(
            '/library',
            { q: search, tag: newTag, view: viewMode, category: filters.category },
            { preserveState: true },
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setActiveTag('');
        router.get('/library', { view: viewMode });
    };

    const handleViewModeChange = (mode: LibraryViewMode) => {
        router.get('/library', { q: search, tag: activeTag, view: mode }, { preserveState: true });
    };

    const handleCategorySelect = (categoryId: string) => {
        router.get(
            '/library',
            { q: filters.q, tag: filters.tag, view: 'category', category: categoryId || undefined },
            { preserveState: true },
        );
    };

    // --- Loading indicator ---
    const loadingIndicator = isLoadingMore && (
        <div className="flex justify-center py-8" role="status" aria-label="読み込み中">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/25 border-r-brand-primary" />
        </div>
    );

    const sentinel = <div ref={sentinelRef} className="h-1" aria-hidden="true" />;

    return (
        <>
            {/* Header with View Mode Switcher - hide in map view (switcher is inside map) */}
            {viewMode !== 'map' && (
                <div className="mb-6">
                    <p className="lens-kicker mb-1">Your collection</p>
                    <h1 className="mb-5 text-3xl font-bold tracking-[-0.04em] text-brand-ink sm:text-4xl">ライブラリ</h1>
                    <div className="max-w-sm">
                        <ViewModeSwitcher currentMode={viewMode} onModeChange={handleViewModeChange} />
                    </div>
                </div>
            )}

            {/* Search - hide in map view */}
            {viewMode !== 'map' && (
                <form onSubmit={handleSearch} className="mb-5 max-w-xl">
                    <div className="relative">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="なまえでさがす…"
                            className="lens-field min-h-12 py-3 pl-11 pr-4"
                            aria-label="観察記録を検索"
                        />
                        <svg className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                    </div>
                </form>
            )}

            {/* Tag Filters - hide in map and category view */}
            {viewMode === 'date' && tags.length > 0 && (
                <div
                    className="scrollbar-hide -mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
                    role="group"
                    aria-label="タグでフィルタ"
                >
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => handleTagFilter(tag.name)}
                            aria-pressed={activeTag === tag.name}
                            className={`min-h-10 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                                activeTag === tag.name
                                    ? 'border-brand-primary bg-brand-primary text-white'
                                    : 'border-brand-line bg-white text-brand-muted hover:border-brand-sand hover:text-brand-ink'
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
                    {allDateGroups.length > 0 ? (
                        <div className="space-y-9">
                            {allDateGroups.map((group) => (
                                <div key={group.yearMonth}>
                                    <h2 className="mb-4 text-lg font-bold tracking-tight text-brand-ink">
                                        {group.label}
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                                        {group.observations.map((obs) => (
                                            <ObservationCard
                                                key={obs.id}
                                                observation={obs}
                                                categories={categories}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {loadingIndicator}
                            {sentinel}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📭"
                            message={
                                filters.q || filters.tag
                                    ? 'みつからなかったよ'
                                    : 'まだなにもないよ'
                            }
                            action={
                                (filters.q || filters.tag) && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-sm font-bold text-brand-primary-dark hover:text-brand-primary"
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
                    {!filters.category ? (
                        // カテゴリ一覧グリッド
                        <div>
                            <div className="mb-4 flex items-baseline justify-between gap-4">
                                <h2 className="lens-section-title">カテゴリ</h2>
                                <span className="text-xs font-semibold text-brand-muted">見つけたものを種類ごとに</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                                {categories.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        count={categoryCounts[category.id] || 0}
                                        observations={categoryPreviews[category.id] || []}
                                        onClick={() => handleCategorySelect(category.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        // カテゴリ詳細（無限スクロール）
                        <div>
                            <button
                                onClick={() => handleCategorySelect('')}
                                className="mb-5 flex min-h-11 items-center gap-2 text-sm font-bold text-brand-primary-dark hover:text-brand-primary"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                                カテゴリ一覧に戻る
                            </button>

                            <h2 className="lens-section-title mb-4">
                                {categories.find((c) => c.id === filters.category)?.name ||
                                    filters.category}
                            </h2>

                            {categoryObservations.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                                    {categoryObservations.map((obs) => (
                                        <ObservationCard
                                            key={obs.id}
                                            observation={obs}
                                            categories={categories}
                                            showCategory={false}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon="📭"
                                    message="このカテゴリにはまだなにもないよ"
                                />
                            )}
                            {loadingIndicator}
                            {sentinel}
                        </div>
                    )}
                </>
            )}

            {/* Map View */}
            {viewMode === 'map' && (
                <LibraryMap observations={categoryObservations} onModeChange={handleViewModeChange} />
            )}
        </>
    );
}
