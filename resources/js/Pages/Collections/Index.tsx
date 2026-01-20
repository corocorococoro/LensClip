import AppLayout from '@/Layouts/AppLayout';
import { Button, Card, EmptyState } from '@/Components/ui';
import type { Collection } from '@/types/models';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

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
            <Button
                onClick={() => setShowCreate(!showCreate)}
                variant={showCreate ? 'secondary' : 'primary'}
                fullWidth
                className="mb-4"
            >
                {showCreate ? 'キャンセル' : '+ あたらしいコレクション'}
            </Button>

            {/* Create Form */}
            {showCreate && (
                <Card className="mb-4">
                    <form onSubmit={handleCreate}>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="コレクションのなまえ"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 mb-3"
                            autoFocus
                            aria-label="コレクション名"
                        />
                        <Button
                            type="submit"
                            disabled={processing || !data.name.trim()}
                            loading={processing}
                            fullWidth
                            size="md"
                        >
                            つくる
                        </Button>
                    </form>
                </Card>
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
                            {collection.observations.slice(0, 4).map((obs) => (
                                <img
                                    key={obs.id}
                                    src={obs.thumb_url}
                                    alt=""
                                    width={48}
                                    height={48}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ))}
                            {collection.observations.length === 0 && (
                                <div
                                    className="col-span-2 row-span-2 flex items-center justify-center text-3xl text-gray-300"
                                    aria-hidden="true"
                                >
                                    📁
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                            <h3 className="font-bold text-gray-800 mb-1 truncate">
                                {collection.name}
                            </h3>
                            <p className="text-sm text-gray-500 tabular-nums">
                                {collection.observations_count} まい
                            </p>
                        </div>
                        <div className="flex items-center pr-3 text-gray-400" aria-hidden="true">
                            →
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {collections.length === 0 && !showCreate && (
                <EmptyState
                    icon="📁"
                    message={
                        <>
                            コレクションがまだないよ
                            <br />
                            あたらしくつくってみよう！
                        </>
                    }
                />
            )}
        </AppLayout>
    );
}
