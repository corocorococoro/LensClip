import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

interface Props extends PropsWithChildren {
    title?: string;
}

/**
 * Admin layout with sidebar navigation
 */
export default function AdminLayout({ children, title }: Props) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-xl font-bold">
                                LensClip
                            </Link>
                            <span className="px-2 py-1 bg-red-600 text-xs font-bold rounded">
                                管理者
                            </span>
                        </div>
                        <nav className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="text-gray-300 hover:text-white text-sm"
                            >
                                アプリに戻る
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
                    <nav className="p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            管理メニュー
                        </h3>
                        <Link
                            href={route('admin.logs')}
                            className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${route().current('admin.logs')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            📋 ログ閲覧
                        </Link>
                        <Link
                            href={route('admin.settings.ai')}
                            className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${route().current('admin.settings.ai')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            🤖 AI設定
                        </Link>
                    </nav>
                </aside>

                {/* Main content */}
                <main className="flex-1 p-8">
                    {title && (
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">
                            {title}
                        </h1>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
