import AppLayout from '@/Layouts/AppLayout';
import { EmptyState } from '@/Components/ui';
import { ObservationCard } from '@/Components/ObservationCard';
import type { ObservationSummary, Tag } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    observations: {
        data: ObservationSummary[];
        links: unknown;
        meta: unknown;
    };
    tags: Tag[];
    filters: {
        q?: string;
        tag?: string;
    };
}

export default function Library({ observations, tags, filters }: Props) {
    const [search, setSearch] = useState(filters.q || '');
    const [activeTag, setActiveTag] = useState(filters.tag || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/library', { q: search, tag: activeTag }, { preserveState: true });
    };

    const handleTagFilter = (tagName: string) => {
        const newTag = activeTag === tagName ? '' : tagName;
        setActiveTag(newTag);
        router.get('/library', { q: search, tag: newTag }, { preserveState: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setActiveTag('');
        router.get('/library');
    };

    return (
        <AppLayout title="ライブラリ">
            <Head title="ライブラリ" />

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="なまえでさがす…"
                        className="w-full px-4 py-3 pl-10 bg-white rounded-xl border-0 shadow-sm focus:ring-2 focus:ring-blue-300"
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

            {/* Tag Filters */}
            {tags.length > 0 && (
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
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            #{tag.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            {observations.data.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {observations.data.map((obs) => (
                        <ObservationCard key={obs.id} observation={obs} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {observations.data.length === 0 && (
                <EmptyState
                    icon="📭"
                    message={
                        filters.q || filters.tag ? 'みつからなかったよ' : 'まだなにもないよ'
                    }
                    action={
                        (filters.q || filters.tag) && (
                            <button
                                onClick={handleClearFilters}
                                className="text-blue-600 text-sm hover:text-blue-700"
                            >
                                フィルタをクリア
                            </button>
                        )
                    }
                />
            )}
        </AppLayout>
    );
}
