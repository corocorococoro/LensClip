import { Link, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import { PageProps } from '@/types';

interface AppLayoutProps {
    children: ReactNode;
    title?: string;
}

// 静的配列をコンポーネント外にホイスト (毎レンダリング再生成防止)
const navItems = [
    { href: '/dashboard', label: 'ホーム', icon: '🏠' },
    { href: '/library', label: 'ライブラリ', icon: '📚' },
] as const;

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
import { useScrollDirection } from '@/hooks/useScrollDirection';

// ... (imports)

export default function AppLayout({ children, title }: AppLayoutProps) {
    const { auth, ziggy } = usePage<PageProps>().props;
    const url = ziggy.location;
    const isAdmin = auth?.user?.role === 'admin';
    const scrollDirection = useScrollDirection();

    // 下にスクロールした時だけ隠す（最上部や上スクロール時は表示）
    const isFooterVisible = scrollDirection !== 'down';

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-brand-beige safe-area-top">
                <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-brand-coral to-brand-peach rounded-lg shadow-sm flex items-center justify-center">
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
                            className="w-8 h-8 rounded-full bg-brand-cream text-brand-orange border border-brand-beige flex items-center justify-center text-lg shadow-sm hover:scale-105 active:scale-95 transition-transform"
                        >
                            <span aria-hidden="true">👤</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6">{children}</main>

            {/* Bottom Navigation (Floating Style) */}
            <nav
                className={`fixed bottom-6 left-4 right-4 z-50 transition-transform duration-300 ease-in-out safe-area-bottom ${isFooterVisible ? 'translate-y-0' : 'translate-y-[150%]'
                    }`}
                aria-label="メインナビゲーション"
            >
                <div className="max-w-xs mx-auto bg-white/60 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-indigo-500/10 rounded-2xl flex justify-around items-center py-2 px-4">
                    {navItems.map((item) => {
                        const isActive = url.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 active:scale-95 ${isActive
                                    ? 'text-indigo-600 bg-indigo-50/50'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className={`text-xl transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`} aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span className={`text-[10px] mt-0.5 font-bold tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
