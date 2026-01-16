import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Collection {
    id: string;
    name: string;
    cover_url: string | null;
    observations_count: number;
    observations: {
        id: string;
        thumb_url: string;
    }[];
}

interface Props {
    collections: Collection[];
}

export default function CollectionsIndex({ collections }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        name: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/collections', {
            onSuccess: () => {
                reset();
                setShowCreate(false);
            },
        });
    };

    return (
        <AppLayout title="コレクション">
            <Head title="コレクション" />

            {/* Create Button */}
            <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-full mb-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-sm transition-all"
            >
                {showCreate ? 'キャンセル' : '+ あたらしいコレクション'}
            </button>

            {/* Create Form */}
            {showCreate && (
                <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="コレクションのなまえ"
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 mb-3"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={processing || !data.name.trim()}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 transition-colors"
                    >
                        つくる
                    </button>
                </form>
            )}

            {/* Collections List */}
            <div className="space-y-3">
                {collections.map((collection) => (
                    <Link
                        key={collection.id}
                        href={`/collections/${collection.id}`}
                        className="flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                        {/* Preview Images */}
                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
                            {collection.observations.slice(0, 4).map((obs, i) => (
                                <img
                                    key={obs.id}
                                    src={obs.thumb_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ))}
                            {collection.observations.length === 0 && (
                                <div className="col-span-2 row-span-2 flex items-center justify-center text-3xl text-gray-300">
                                    📁
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-3 flex flex-col justify-center">
                            <h3 className="font-bold text-gray-800 mb-1">{collection.name}</h3>
                            <p className="text-sm text-gray-500">
                                {collection.observations_count} まい
                            </p>
                        </div>
                        <div className="flex items-center pr-3 text-gray-400">
                            →
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {collections.length === 0 && !showCreate && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📁</div>
                    <p className="text-gray-500">
                        コレクションがまだないよ<br />
                        あたらしくつくってみよう！
                    </p>
                </div>
            )}
        </AppLayout>
    );
}
