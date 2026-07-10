import BrandMark from '@/Components/BrandMark';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-brand-canvas px-4 py-8 text-brand-ink sm:py-12">
            <a href="#main-content" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-bold text-brand-primary-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4">本文へ移動</a>
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-primary-soft/80 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-brand-cream/60 blur-3xl" />

            <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
                <Link href="/" className="mx-auto mb-7 flex items-center gap-3 rounded-xl" aria-label="LensClip トップ">
                    <BrandMark className="h-11 w-11 shadow-sm" />
                    <span className="text-2xl font-bold tracking-[-0.03em]">LensClip</span>
                </Link>

                <main id="main-content" className="lens-surface w-full p-6 sm:p-8">{children}</main>

                <p className="mt-7 text-center text-xs text-brand-muted">© {new Date().getFullYear()} LensClip</p>
            </div>
        </div>
    );
}
