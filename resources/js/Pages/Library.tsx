import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Tag {
    id: number;
    name: string;
}

interface Observation {
    id: string;
    title: string;
    thumb_url: string;
    status: string;
    tags: Tag[];
}

interface Props {
    observations: {
        data: Observation[];
        links: any;
        meta: any;
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

    return (
        <AppLayout title="ライブラリ">
            <Head title="ライブラリ" />

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="なまえでさがす..."
                        className="w-full px-4 py-3 pl-10 bg-white rounded-xl border-0 shadow-sm focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                </div>
            </form>

            {/* Tag Filters */}
            {tags.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => handleTagFilter(tag.name)}
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
            <div className="grid grid-cols-2 gap-3">
                {observations.data.map((obs) => (
                    <Link
                        key={obs.id}
                        href={obs.status === 'processing'
                            ? `/observations/${obs.id}/processing`
                            : `/observations/${obs.id}`
                        }
                        className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
                    >
                        <img
                            src={obs.thumb_url}
                            alt={obs.title}
                            className="w-full h-full object-cover"
                        />
                        {obs.status === 'processing' && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                <span className="text-3xl animate-spin">⏳</span>
                            </div>
                        )}
                        {obs.status === 'failed' && (
                            <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                                <span className="text-3xl">❌</span>
                            </div>
                        )}
                        {obs.status === 'ready' && obs.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-white text-sm font-medium truncate">
                                    {obs.title}
                                </p>
                            </div>
                        )}
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {observations.data.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-gray-500">
                        {filters.q || filters.tag ? 'みつからなかったよ' : 'まだなにもないよ'}
                    </p>
                    {(filters.q || filters.tag) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setActiveTag('');
                                router.get('/library');
                            }}
                            className="mt-4 text-blue-600 text-sm"
                        >
                            フィルタをクリア
                        </button>
                    )}
                </div>
            )}
        </AppLayout>
    );
}
