// @ts-nocheck
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';

export default function Dashboard({ auth, scraps }) {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        image: null,
    });

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = () => {
        post(route('scraps.store'), {
            forceFormData: true,
            onSuccess: () => {
                setPreview(null);
                reset();
            },
            onError: () => {
                alert('アップロードに失敗しました。');
            }
        });
    };

    const handleCancel = () => {
        setPreview(null);
        reset();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">コレクション</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Grid List */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                        {scraps.data.map((scrap) => (
                            <Link
                                href={route('scraps.show', scrap.id)}
                                key={scrap.id}
                                className="block relative aspect-square bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                            >
                                <img
                                    src={'/storage/' + (scrap.thumbnail_path || scrap.image_path)}
                                    alt={scrap.primary_name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 w-full bg-black/50 text-white p-2 text-center text-sm font-bold truncate">
                                    {scrap.primary_name || '???'}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {scraps.data.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            <div className="text-4xl mb-4">📸</div>
                            <p>まだしゃしんがないよ。<br />カメラボタンをおしてみてね。</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            {!preview && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl transition transform hover:scale-105 active:scale-95"
                    aria-label="カメラを起動"
                >
                    📷
                </button>
            )}

            {/* Hidden Input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Preview / Processing Modal Overlay */}
            {preview && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-md aspect-square bg-gray-800 rounded-2xl overflow-hidden mb-8 border-4 border-white">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />

                        {processing && (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                                <div className="animate-spin text-5xl mb-4">🔍</div>
                                <p className="text-xl font-bold text-blue-600 animate-pulse">しらべています...</p>
                            </div>
                        )}
                    </div>

                    {!processing && (
                        <div className="flex gap-8">
                            <button
                                onClick={handleCancel}
                                className="w-20 h-20 bg-gray-500 rounded-full flex items-center justify-center text-3xl text-white shadow-lg active:scale-95 transition"
                            >
                                ✖
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-4xl text-white shadow-lg animate-bounce-slow active:scale-95 transition border-4 border-white"
                            >
                                ⭕️
                            </button>
                        </div>
                    )}

                    {!processing && (
                        <p className="text-white mt-8 text-lg font-bold">これでOK？</p>
                    )}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
