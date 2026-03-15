import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useRef, useState, useEffect } from 'react';
import { PageProps } from '@/types';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { usePendingUploadNavigation } from '@/hooks/usePendingUploadNavigation';

interface AppLayoutProps {
    children: ReactNode;
    title?: string;
    /** 全画面モード（地図表示用） */
    fullScreen?: boolean;
}

// 静的配列をコンポーネント外にホイスト (毎レンダリング再生成防止)
const navItems = [
    { href: '/dashboard', label: 'ホーム', icon: '🏠' },
    { href: '/library', label: 'ライブラリ', icon: '📚' },
] as const;

/** カメラアイコンSVG */
function CameraIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

/**
 * アプリ共通レイアウト
 * - ヘッダー (ロゴ + プロフィール)
 * - メインコンテンツ
 * - ボトムナビゲーション
 *
 * Web Interface Guidelines準拠:
 * - aria-label 追加
 * - safe-area-inset 対応
 * - touch-action は CSS で設定済み
 */

export default function AppLayout({ children, title, fullScreen = false }: AppLayoutProps) {
    const { auth, ziggy } = usePage<PageProps>().props;
    const url = ziggy.location;
    const isAdmin = auth?.user?.role === 'admin';
    const scrollDirection = useScrollDirection();

    // 下にスクロールした時だけ隠す（最上部や上スクロール時は表示）
    const isFooterVisible = scrollDirection !== 'down';

    // 「しらべる」ボタン用の状態
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // Request location permission on mount
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                () => {
                    // Location permission denied or error - continue without location
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

    const handleFileSelect = usePendingUploadNavigation(location);

    return (
        <div className={`min-h-screen ${fullScreen ? 'h-screen overflow-hidden' : 'pb-24'} bg-gradient-to-br from-sky-50 via-white to-purple-50`}>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-brand-blush/50 safe-area-top">
                <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-brand-pink to-brand-rose rounded-lg shadow-sm flex items-center justify-center">
                            <svg
                                className="w-4 h-4 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-brand-dark">
                            LensClip
                        </span>
                    </Link>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="px-2.5 py-1 text-[10px] font-bold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                管理
                            </Link>
                        )}
                        <Link
                            href="/profile"
                            aria-label="プロフィール設定"
                            className="w-8 h-8 rounded-full bg-brand-cream text-brand-sky border border-brand-blush flex items-center justify-center text-lg shadow-sm hover:scale-105 active:scale-95 transition-transform"
                        >
                            <span aria-hidden="true">👤</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={fullScreen ? 'h-[calc(100dvh-3.5rem-4rem)] overflow-hidden' : 'max-w-lg mx-auto px-4 py-6'}>{children}</main>

            {/* Bottom Navigation */}
            <nav
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out safe-area-bottom ${isFooterVisible || fullScreen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                aria-label="メインナビゲーション"
            >
                <div className="bg-white/80 backdrop-blur-2xl border-t border-brand-blush/50">
                    <div className="max-w-lg mx-auto grid grid-cols-3 items-end py-1 px-4">
                        {/* ホーム */}
                        {(() => {
                            const item = navItems[0];
                            const isActive = url.startsWith(item.href);
                            return (
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex flex-col items-center py-1 rounded-lg transition-all duration-200 active:scale-95 ${isActive
                                        ? 'text-brand-pink'
                                        : 'text-brand-muted hover:text-brand-dark'
                                        }`}
                                >
                                    <span className="text-lg" aria-hidden="true">{item.icon}</span>
                                    <span className={`text-[9px] font-medium ${isActive ? 'text-brand-pink' : 'text-brand-muted'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })()}

                        {/* しらべる (中央) */}
                        <div className="flex flex-col items-center -mt-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="カメラでしらべる"
                                className="w-14 h-14 bg-gradient-to-br from-brand-pink to-brand-sky text-white rounded-full shadow-lg shadow-brand-pink/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <CameraIcon className="w-6 h-6" />
                            </button>
                            <span className="text-[9px] font-medium text-brand-pink mt-0.5">しらべる</span>
                        </div>

                        {/* ライブラリ */}
                        {(() => {
                            const item = navItems[1];
                            const isActive = url.startsWith(item.href);
                            return (
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex flex-col items-center py-1 rounded-lg transition-all duration-200 active:scale-95 ${isActive
                                        ? 'text-brand-pink'
                                        : 'text-brand-muted hover:text-brand-dark'
                                        }`}
                                >
                                    <span className="text-lg" aria-hidden="true">{item.icon}</span>
                                    <span className={`text-[9px] font-medium ${isActive ? 'text-brand-pink' : 'text-brand-muted'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })()}
                    </div>
                </div>
            </nav>

            {/* Hidden File Input (しらべるボタン用) */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                aria-hidden="true"
            />
        </div>
    );
}
