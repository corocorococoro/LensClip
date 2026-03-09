import AppLayout from '@/Layouts/AppLayout';
import { takePendingUpload } from '@/uploadPendingStore';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function UploadPending() {
    const [pending] = useState(() => takePendingUpload());
    const [uploadPercent, setUploadPercent] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const didStart = useRef(false);

    useEffect(() => {
        if (!pending) {
            router.visit('/dashboard');
            return;
        }

        if (didStart.current) return;
        didStart.current = true;

        const run = async () => {
            let imageToUpload: File = pending.file;
            try {
                const bitmap = await createImageBitmap(pending.file, { imageOrientation: 'from-image' });
                const scale = Math.min(1, 1024 / bitmap.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(bitmap.width * scale);
                canvas.height = Math.round(bitmap.height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('canvas unavailable');
                ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                bitmap.close();
                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob(resolve, 'image/webp', 0.85);
                });
                if (blob) {
                    imageToUpload = new File([blob], 'image.webp', { type: 'image/webp' });
                }
            } catch {
                // Use original file on resize failure
            }

            const formData = new FormData();
            formData.append('image', imageToUpload);
            if (pending.latitude !== null) formData.append('latitude', String(pending.latitude));
            if (pending.longitude !== null) formData.append('longitude', String(pending.longitude));

            router.post('/observations', formData, {
                forceFormData: true,
                onProgress: (p) => {
                    setUploadPercent(p?.percentage ?? 0);
                },
                onError: (errors) => {
                    setError(errors.image ?? 'おくりものに しっぱいしちゃった。もういちど やってみてね！');
                },
            });
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isUploading = uploadPercent < 100 && !error;
    const emoji = error ? '⚠️' : isUploading ? '📤' : '✨';

    if (!pending) {
        return null;
    }

    return (
        <AppLayout title="しらべてます">
            <Head title="しらべてます" />

            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg mb-6 relative">
                    <img
                        src={pending.previewUrl}
                        alt="撮影した写真"
                        className="w-full h-full object-cover"
                    />

                    {!error && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="text-5xl animate-bounce" aria-hidden="true">
                                {emoji}
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div
                                className="h-full bg-gradient-to-r from-brand-pink to-brand-sky transition-all duration-300 ease-out"
                                style={{ width: `${uploadPercent}%` }}
                                role="progressbar"
                                aria-valuenow={uploadPercent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        </div>
                    )}
                </div>

                <p className="text-brand-dark font-bold text-base mb-2" aria-live="polite">
                    {error ? 'しっぱいしちゃった…' : isUploading ? 'おくりちゅう…' : 'もうすぐ…'}
                </p>

                {error && (
                    <div
                        className="mt-4 w-full p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
                        role="alert"
                    >
                        <span className="text-2xl" aria-hidden="true">
                            ⚠️
                        </span>
                        <p className="text-sm font-bold flex-1">{error}</p>
                        <button
                            onClick={() => router.visit('/dashboard')}
                            className="text-sm text-red-500 underline"
                        >
                            もどる
                        </button>
                    </div>
                )}

                {!error && (
                    <Link
                        href="/library"
                        className="mt-4 text-brand-muted text-xs hover:text-brand-pink"
                    >
                        ライブラリでまつ →
                    </Link>
                )}
            </div>
        </AppLayout>
    );
}
