import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';

interface Observation {
    id: string;
    title: string;
    thumb_url: string;
}

interface Collection {
    id: string;
    name: string;
    observations: Observation[];
}

interface Props {
    collection: Collection;
}

export default function CollectionShow({ collection }: Props) {
    const handleDelete = () => {
        if (confirm('このコレクションを削除しますか？（写真は残ります）')) {
            router.delete(`/collections/${collection.id}`);
        }
    };

    const handleRemoveObservation = (obsId: string) => {
        router.delete(`/collections/${collection.id}/observations/${obsId}`);
    };

    return (
        <AppLayout title={collection.name}>
            <Head title={collection.name} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <Link
                    href="/collections"
                    className="text-blue-600 text-sm"
                >
                    ← もどる
                </Link>
                <button
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-600 text-sm"
                >
                    削除
                </button>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-4">{collection.name}</h1>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
                {collection.observations.map((obs) => (
                    <div key={obs.id} className="relative group">
                        <Link
                            href={`/observations/${obs.id}`}
                            className="block aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <img
                                src={obs.thumb_url}
                                alt={obs.title}
                                className="w-full h-full object-cover"
                            />
                            {obs.title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                    <p className="text-white text-sm font-medium truncate">
                                        {obs.title}
                                    </p>
                                </div>
                            )}
                        </Link>
                        {/* Remove button */}
                        <button
                            onClick={() => handleRemoveObservation(obs.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {collection.observations.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-gray-500">
                        まだ写真がないよ<br />
                        ライブラリから追加してね
                    </p>
                    <Link
                        href="/library"
                        className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                    >
                        ライブラリへ
                    </Link>
                </div>
            )}
        </AppLayout>
    );
}
