import { Link, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
    const { url } = usePage();

    const navItems = [
        { href: '/dashboard', label: 'ホーム', icon: '🏠' },
        { href: '/library', label: 'ライブラリ', icon: '📚' },
        { href: '/collections', label: 'コレクション', icon: '📁' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-[#F5EDD6]">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF9E7D] rounded-lg shadow-sm flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#2D2D2D]">LensClip</span>
                    </Link>
                    <Link
                        href="/profile"
                        className="w-10 h-10 rounded-full bg-[#FFF0E5] text-[#FF823C] border border-[#F5EDD6] flex items-center justify-center text-xl shadow-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                        👤
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-bottom">
                <div className="max-w-lg mx-auto flex justify-around items-center py-2">
                    {navItems.map((item) => {
                        const isActive = url.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${isActive
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <span className="text-2xl">{item.icon}</span>
                                <span className="text-xs mt-1 font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
