import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

interface Observation {
    id: string;
    title: string;
    thumb_url: string;
}

interface Props {
    stats: {
        today: number;
        total: number;
    };
    recent: Observation[];
}

export default function Home({ stats, recent }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        const formData = new FormData();
        formData.append('image', file);

        router.post('/observations', formData, {
            forceFormData: true,
            onFinish: () => setUploading(false),
        });
    };

    return (
        <AppLayout title="ホーム">
            <Head title="ホーム" />

            <div className="flex flex-col items-center">
                {/* Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats.today}</div>
                        <div className="text-sm text-gray-500">きょう</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                        <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
                        <div className="text-sm text-gray-500">ぜんぶ</div>
                    </div>
                </div>

                {/* Capture Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    {uploading ? (
                        <>
                            <span className="text-4xl animate-spin">⏳</span>
                            <span className="text-sm mt-2 font-bold">おくりちゅう...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-5xl">📷</span>
                            <span className="text-sm mt-2 font-bold">とる</span>
                        </>
                    )}
                </button>
                <p className="text-gray-500 text-sm mb-8">タップしてしゃしんをとろう！</p>

                {/* Hidden File Input */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* Recent Observations */}
                {recent.length > 0 && (
                    <div className="w-full">
                        <h2 className="text-lg font-bold text-gray-700 mb-3">さいきんのはっけん</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {recent.map((obs) => (
                                <Link
                                    key={obs.id}
                                    href={`/observations/${obs.id}`}
                                    className="aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <img
                                        src={obs.thumb_url}
                                        alt={obs.title}
                                        className="w-full h-full object-cover"
                                    />
                                </Link>
                            ))}
                        </div>
                        <Link
                            href="/library"
                            className="block text-center text-blue-600 mt-4 text-sm font-medium"
                        >
                            もっとみる →
                        </Link>
                    </div>
                )}

                {/* Empty State */}
                {recent.length === 0 && stats.total === 0 && (
                    <div className="text-center py-10">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-500">
                            まだはっけんがないよ<br />
                            カメラボタンをおしてみてね！
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
