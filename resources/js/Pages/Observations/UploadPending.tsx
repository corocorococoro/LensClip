import AppLayout from '@/Layouts/AppLayout';
import { takePendingUpload } from '@/uploadPendingStore';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function UploadPending() {
    const [pending] = useState(() => takePendingUpload());
    const [isPreparingUpload, setIsPreparingUpload] = useState(() => pending?.source === 'home');
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
            if (pending.source === 'home') {
                await new Promise((resolve) => window.setTimeout(resolve, 650));
            }

            setIsPreparingUpload(false);

            const formData = new FormData();
            formData.append('image', pending.file);
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

    const isUploading = !isPreparingUpload && uploadPercent < 100 && !error;
    if (!pending) {
        return null;
    }

    return (
        <AppLayout title="しらべてます">
            <Head title="しらべてます" />

            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <p className="lens-kicker mb-4">Saving your find</p>
                <div className="relative mb-6 h-64 w-64 overflow-hidden rounded-2xl border border-brand-line shadow-surface">
                    <img
                        src={pending.previewUrl}
                        alt="撮影した写真"
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                    />

                    {!error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/20 backdrop-blur-[1px]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-sm" aria-hidden="true">
                                <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary/20 border-r-brand-primary" />
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div
                                className="h-full bg-brand-turquoise transition-[width] duration-300 ease-out"
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
                    {error
                        ? 'しっぱいしちゃった…'
                        : isPreparingUpload
                            ? 'じゅんびちゅう…'
                            : isUploading
                                ? 'おくりちゅう…'
                                : 'もうすぐ…'}
                </p>

                {error && (
                    <div
                        className="mt-4 flex w-full max-w-md items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
                        role="alert"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white" aria-hidden="true">!</span>
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
                        className="mt-4 min-h-10 px-3 py-2 text-xs font-bold text-brand-muted hover:text-brand-primary-dark"
                    >
                        ライブラリでまつ →
                    </Link>
                )}
            </div>
        </AppLayout>
    );
}
