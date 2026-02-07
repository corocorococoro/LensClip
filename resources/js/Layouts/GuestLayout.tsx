import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/**
 * ゲスト用レイアウト（ログイン・登録ページ用）
 * LensClipブランドテーマを適用
 */
export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-purple-50 px-4 py-8">
            {/* Logo */}
            <div className="mb-8">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-rose rounded-xl shadow-lg flex items-center justify-center">
                        <svg
                            className="w-7 h-7 text-white"
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
                    <span className="text-2xl font-bold tracking-tight text-brand-dark">
                        LensClip
                    </span>
                </Link>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brand-blush p-6 sm:p-8">
                {children}
            </div>

            {/* Footer */}
            <p className="mt-8 text-sm text-gray-400">
                © {new Date().getFullYear()} LensClip
            </p>
        </div>
    );
}
