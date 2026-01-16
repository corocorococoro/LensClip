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
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {title || 'LensClip'}
                    </h1>
                    <Link
                        href="/profile"
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm"
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
