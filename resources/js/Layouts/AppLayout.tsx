import BrandMark from '@/Components/BrandMark';
import { usePendingUploadNavigation } from '@/hooks/usePendingUploadNavigation';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    title?: string;
    /** 全画面モード（地図表示用） */
    fullScreen?: boolean;
}

function HomeIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
        </svg>
    );
}

function CollectionIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 7h8M8 11h5M8 15h7" />
        </svg>
    );
}

function CameraIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

export default function AppLayout({ children, title, fullScreen = false }: AppLayoutProps) {
    const { auth, ziggy } = usePage<PageProps>().props;
    const url = ziggy.location;
    const isAdmin = auth?.user?.role === 'admin';
    const isFooterVisible = useScrollDirection() !== 'down';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        if (!('geolocation' in navigator)) return;

        navigator.geolocation.getCurrentPosition(
            (position) => setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }),
            () => undefined,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }, []);

    const handleFileSelect = usePendingUploadNavigation(location);
    const userInitial = auth?.user?.name?.trim().charAt(0).toUpperCase() || 'U';
    const isHome = url.startsWith('/dashboard');
    const isLibrary = url.startsWith('/library');

    return (
        <div className={`min-h-screen bg-brand-canvas text-brand-ink ${fullScreen ? 'h-screen overflow-hidden' : 'pb-28'}`}>
            <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-bold text-brand-primary-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4">本文へ移動</a>
            <header className="safe-area-top sticky top-0 z-40 border-b border-brand-line/80 bg-white/92 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg" aria-label="LensClip ホーム">
                        <BrandMark className="h-9 w-9 shadow-sm" compact />
                        <span className="text-lg font-bold tracking-[-0.025em] text-brand-ink">LensClip</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {title && <span className="hidden text-sm font-medium text-brand-muted sm:block">{title}</span>}
                        {isAdmin && (
                            <Link href="/admin" className="rounded-full bg-brand-coral-soft px-3 py-1.5 text-xs font-bold text-brand-coral transition hover:bg-brand-coral/15">
                                管理
                            </Link>
                        )}
                        <Link href="/profile" aria-label="プロフィール設定" className="lens-icon-button h-10 w-10 text-sm font-bold">
                            {userInitial}
                        </Link>
                    </div>
                </div>
            </header>

            <main id="main-content" className={fullScreen ? 'h-[calc(100dvh-4rem-4.75rem)] overflow-hidden' : 'mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9'}>
                {children}
            </main>

            <nav
                className={`safe-area-bottom fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${isFooterVisible || fullScreen ? 'translate-y-0' : 'translate-y-full'}`}
                aria-label="メインナビゲーション"
            >
                <div className="mx-auto max-w-md border-x border-t border-brand-line bg-white/95 px-5 pb-1 pt-2 shadow-[0_-10px_35px_rgba(61,52,44,0.08)] backdrop-blur-xl sm:mb-3 sm:rounded-2xl sm:border sm:pb-2">
                    <div className="grid grid-cols-3 items-end">
                        <Link href="/dashboard" aria-current={isHome ? 'page' : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition active:scale-95 ${isHome ? 'text-brand-primary-dark' : 'text-brand-muted hover:text-brand-ink'}`}>
                            <HomeIcon className="h-5 w-5" />
                            ホーム
                        </Link>

                        <div className="flex flex-col items-center -mt-7">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="カメラでしらべる"
                                className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-brand-canvas bg-brand-primary text-white shadow-lg shadow-brand-primary/20 transition hover:bg-brand-primary-dark active:scale-95 sm:border-white"
                            >
                                <CameraIcon className="h-7 w-7" />
                            </button>
                            <span className="mt-0.5 text-[11px] font-bold text-brand-primary-dark">しらべる</span>
                        </div>

                        <Link href="/library" aria-current={isLibrary ? 'page' : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition active:scale-95 ${isLibrary ? 'text-brand-primary-dark' : 'text-brand-muted hover:text-brand-ink'}`}>
                            <CollectionIcon className="h-5 w-5" />
                            ライブラリ
                        </Link>
                    </div>
                </div>
            </nav>

            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileSelect} aria-hidden="true" />
        </div>
    );
}
