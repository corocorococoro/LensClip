import { useRestorePhotoScroll } from '@/hooks/useRestorePhotoScroll';
import { useUploads } from '@/hooks/useUploads';
import { mergeDiscoveries, type Discovery } from '@/lib/discoveries';
import DiscoveryCard from '@/Components/DiscoveryCard';
import { useUploadRefresh } from '@/hooks/useUploadRefresh';
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
import { Head, Link, router, usePage, useRemember } from '@inertiajs/react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface Props {
    activityCount?: number;
    observations: {
        data: ObservationSummary[];
    };
    tags: Tag[];
    filters: {
        activity?: string;
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
    milestoneThresholds?: number[];
    pagination?: CursorPagination;
}

function compareObservations(a: ObservationSummary, b: ObservationSummary): number {
    if (!a.created_at || !b.created_at) return 0;
    return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

/** dateGroups をマージ（同月は observation を結合） */
function mergeDateGroups(existing: DateGroup[], incoming: DateGroup[]): DateGroup[] {
    const byMonth = new Map<string, DateGroup>();
    for (const group of [...existing, ...incoming]) {
        const previous = byMonth.get(group.yearMonth);
        const observations = new Map((previous?.observations ?? []).map(item => [item.id, item]));
        group.observations.forEach(item => observations.set(item.id, item));
        byMonth.set(group.yearMonth, { ...group, observations: [...observations.values()].sort((a, b) =>
            compareObservations(a, b)) });
    }
    return [...byMonth.values()].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
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
        filters.activity ?? '',
        filters.q ?? '',
        filters.tag ?? '',
        filters.category ?? '',
        viewMode,
    ]);
}

export default function Library(props: Props) {
    useRestorePhotoScroll();
    const uploadRevision = useUploadRefresh();
    const viewMode = props.viewMode ?? 'date';

    return (
        <AppLayout title="図鑑" fullScreen={viewMode === 'map'}>
            <Head title="図鑑" />
            <LibraryContent
                key={libraryContentKey(props.filters, viewMode)}
                uploadRevision={uploadRevision}
                {...props}
                viewMode={viewMode}
            />
        </AppLayout>
    );
}

function LibraryContent({
    observations,
    activityCount = 0,
    tags,
    filters,
    viewMode = 'date',
    dateGroups: initialDateGroups = [],
    categories = [],
    categoryCounts = {},
    categoryPreviews = {},
    milestoneThresholds = [],
    pagination: initialPagination,
    uploadRevision,
}: Props & { uploadRevision: number }) {
    const uploads = useUploads();
    const { url } = usePage();
    const isActivity = filters.activity === '1';
    const [activityIds, setActivityIds] = useState<string[]>([]);
    useEffect(() => {
        if (!isActivity) return;
        setActivityIds(previous => {
            const additions = uploads.filter(item => (item.phase !== 'saved' || item.message || item.observation?.status !== 'ready') && !previous.includes(item.id)).map(item => item.id);
            return additions.length ? [...previous, ...additions] : previous;
        });
    }, [isActivity, uploads]);
    const returnTo = new URL(url, 'https://lensclip.invalid').searchParams.get('return_to');
    const libraryReturn = returnTo && /^\/library(\?[^#]*)?$/.test(returnTo) ? returnTo : '/library';
    const activityHref = `/library?activity=1&return_to=${encodeURIComponent(url)}`;
    const rememberKey = libraryContentKey(filters, viewMode);
    const [search, setSearch] = useState(filters.q || '');
    const [activeTag, setActiveTag] = useState(filters.tag || '');

    // --- 無限スクロール用ステート ---
    const [allDateGroups, setAllDateGroups] = useRemember(initialDateGroups, `dates:${rememberKey}`);
    const [categoryObservations, setCategoryObservations] = useRemember<ObservationSummary[]>(
        observations.data, `categories:${rememberKey}`,
    );
    const [pagination, setPagination] = useRemember<CursorPagination>(
        initialPagination ?? { hasMore: false, nextCursor: null }, `pagination:${rememberKey}`,
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);
    const [statusError, setStatusError] = useState(false);
    const [statusRetryKey, setStatusRetryKey] = useState(0);
    const loadMoreAbortRef = useRef<AbortController | null>(null);

    const mergedUploadRevision = useRef(uploadRevision);
    useEffect(() => {
        if (mergedUploadRevision.current === uploadRevision) return;
        mergedUploadRevision.current = uploadRevision;
        // Retain already loaded pages and their cursor when new uploads arrive.
        setAllDateGroups(previous => mergeDateGroups(previous, initialDateGroups));
        setCategoryObservations(previous => {
            const byId = new Map(previous.map(item => [item.id, item]));
            observations.data.forEach(item => byId.set(item.id, item));
            return [...byId.values()].sort((a, b) => compareObservations(a, b));
        });
    }, [uploadRevision, initialDateGroups, observations.data]);

    useEffect(() => {
        return () => loadMoreAbortRef.current?.abort();
    }, []);

    // --- Load more ---
    const loadMore = useCallback(async () => {
        if (!pagination.nextCursor || loadMoreAbortRef.current) return;
        setLoadMoreError(false);
        setIsLoadingMore(true);
        const controller = new AbortController();
        loadMoreAbortRef.current = controller;

        const params = new URLSearchParams();
        params.set('view', viewMode);
        if (isActivity) params.set('activity', '1');
        params.set('cursor', pagination.nextCursor);
        if (filters.q) params.set('q', filters.q);
        if (filters.tag) params.set('tag', filters.tag);
        if (filters.category) params.set('category', filters.category);

        try {
            const res = await fetch(`/library?${params.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error('Library request failed');
            const data = await res.json();

            if (viewMode === 'date' && data.dateGroups) {
                setAllDateGroups((prev) => mergeDateGroups(prev, data.dateGroups));
            } else if (data.observations) {
                setCategoryObservations((prev) => [...prev, ...data.observations]);
            }

            setPagination(data.pagination ?? { hasMore: false, nextCursor: null });
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                setLoadMoreError(true);
            }
        } finally {
            if (loadMoreAbortRef.current === controller) {
                loadMoreAbortRef.current = null;
            }
            if (!controller.signal.aborted) setIsLoadingMore(false);
        }
    }, [pagination.nextCursor, isLoadingMore, viewMode, filters, isActivity]);

    const sentinelRef = useInfiniteScroll(loadMore, pagination.hasMore && !isLoadingMore && !loadMoreError);

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
        if (processingIds.length === 0) {
            setStatusError(false);
            return;
        }

        let cancelled = false;
        let inFlight = false;
        let failures = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const controller = new AbortController();

        const refreshProcessingCards = async () => {
            if (cancelled || inFlight) return;
            clearTimeout(timer);
            if (document.hidden || !navigator.onLine) return;
            inFlight = true;

            const params = new URLSearchParams();
            processingIds.forEach((id) => params.append('ids[]', id));

            try {
                const res = await fetch(`/observations/statuses?${params.toString()}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error('Status request failed');
                const data = (await res.json()) as { observations?: ObservationSummary[] };
                if (cancelled) return;
                failures = 0;
                setStatusError(false);
                const updatesById = new Map((data.observations ?? []).map((observation) => [observation.id, observation]));
                setAllDateGroups((groups) => updateDateGroups(groups, updatesById));
                setCategoryObservations((current) => updateObservationList(current, updatesById));
            } catch {
                if (!cancelled) {
                    failures += 1;
                    setStatusError(true);
                }
            } finally {
                inFlight = false;
                if (!cancelled) timer = setTimeout(refreshProcessingCards, Math.min(4000 * 2 ** failures, 30000));
            }
        };

        void refreshProcessingCards();
        const resume = () => { void refreshProcessingCards(); };
        window.addEventListener('online', resume);
        document.addEventListener('visibilitychange', resume);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
            window.removeEventListener('online', resume);
            document.removeEventListener('visibilitychange', resume);
        };
    }, [processingIds, statusRetryKey]);

    const displayGroups = useMemo(() => {
        const includeUploads = viewMode === 'date' && (isActivity || (!filters.q && !filters.tag));
        const currentUploads = isActivity ? uploads.filter(item => activityIds.includes(item.id) || item.phase !== 'saved' || item.message || item.observation?.status !== 'ready') : uploads;
        const entries = mergeDiscoveries(allDateGroups.flatMap(group => group.observations), includeUploads ? currentUploads : []);
        const months = new Map<string, { yearMonth: string; label: string; entries: Discovery[] }>();
        const originalMonths = new Map(allDateGroups.flatMap(group => group.observations.map(item => [item.id, group.yearMonth] as const)));
        entries.forEach(entry => {
            const month = entry.upload ? entry.createdAt.slice(0, 7) : originalMonths.get(entry.observation!.id) || entry.createdAt.slice(0, 7);
            const existing = months.get(month) ?? { yearMonth: month, label: allDateGroups.find(group => group.yearMonth === month)?.label || `${month.slice(0, 4)}年${Number(month.slice(5))}月`, entries: [] };
            existing.entries.push(entry); months.set(month, existing);
        });
        return [...months.values()].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    }, [allDateGroups, uploads, viewMode, filters.q, filters.tag, isActivity, activityIds]);

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

    const loadMoreFeedback = loadMoreError && (
        <div role="alert" className="py-4 text-center text-sm text-brand-muted">
            <p>続きの記録を読み込めませんでした。</p>
            <button type="button" onClick={() => void loadMore()} className="mt-2 min-h-11 px-4 font-bold text-brand-primary-dark">
                再試行
            </button>
        </div>
    );

    const sentinel = <div ref={sentinelRef} className="h-1" aria-hidden="true" />;

    return (
        <>
            {/* Header with View Mode Switcher - hide in map view (switcher is inside map) */}
            {viewMode !== 'map' && (
                <div className="mb-6">
                    <p className="lens-kicker mb-1">Your collection</p>
                    <h1 className="mb-5 text-3xl font-bold tracking-[-0.04em] text-brand-ink sm:text-4xl">{isActivity ? '追加中・要確認' : '図鑑'}</h1>
                    {!isActivity && <div className="max-w-sm">
                        <ViewModeSwitcher currentMode={viewMode} onModeChange={handleViewModeChange} />
                    </div>}
                </div>
            )}

            <div className={`shrink-0 ${viewMode === 'map' ? 'border-b border-brand-line bg-white px-4 py-2' : 'mb-5'}`}>
                <Link href={isActivity ? libraryReturn : activityHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-primary-dark">
                    {isActivity ? '← 図鑑の表示に戻る' : `追加中・要確認${activityCount + uploads.filter(item => item.phase !== 'saved').length > 0 ? ` ${activityCount + uploads.filter(item => item.phase !== 'saved').length}件` : ''} →`}
                </Link>
                {isActivity && <p className="text-xs text-brand-muted">保存前の写真と、調査中・確認が必要な写真を表示しています。</p>}
            </div>

            {/* Search - hide in map view */}
            {viewMode !== 'map' && !isActivity && (
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
            {viewMode === 'date' && !isActivity && tags.length > 0 && (
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

            {statusError && (
                <div role="alert" className="mb-4 rounded-xl bg-brand-sand-soft p-4 text-sm text-brand-muted">
                    <p>分析状況を確認できませんでした。接続を確認して再試行してください。</p>
                    <button type="button" onClick={() => setStatusRetryKey((key) => key + 1)} className="mt-2 min-h-11 font-bold text-brand-primary-dark">
                        状態を再確認
                    </button>
                </div>
            )}

            {/* Date View */}
            {viewMode === 'date' && (
                <>
                    {displayGroups.length > 0 ? (
                        <div className="space-y-9">
                            {displayGroups.map((group) => (
                                <div key={group.yearMonth}>
                                    <div className="mb-4 flex items-baseline justify-between gap-4">
                                        <h2 className="text-lg font-bold tracking-tight text-brand-ink">
                                            {group.label}
                                        </h2>
                                        {group.entries.some(entry => entry.observation) && <Link
                                            href={`/magazine/${group.yearMonth}`}
                                            className="shrink-0 text-sm font-bold text-brand-primary-dark hover:text-brand-primary"
                                        >
                                            この月の号 →
                                        </Link>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                                        {group.entries.map(entry => <DiscoveryCard key={entry.key} entry={entry} categories={categories} />)}
                                    </div>
                                </div>
                            ))}
                            {loadMoreFeedback}
                            {loadingIndicator}
                            {sentinel}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📭"
                            message={
                                isActivity ? '追加中・確認が必要な写真はありません' : filters.q || filters.tag
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
                                        milestoneThresholds={milestoneThresholds}
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
                            {loadMoreFeedback}
                            {loadingIndicator}
                            {sentinel}
                        </div>
                    )}
                </>
            )}

            {/* Map View */}
            {viewMode === 'map' && (
                <div className="min-h-0 flex-1"><LibraryMap observations={categoryObservations} onModeChange={handleViewModeChange} /></div>
            )}
        </>
    );
}
