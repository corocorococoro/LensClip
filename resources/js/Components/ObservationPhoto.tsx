import type { ReactNode } from 'react';

export default function ObservationPhoto({ src, alt = '選んだ写真', children }: { src?: string | null; alt?: string; children?: ReactNode }) {
    return <div className="group relative mb-7 w-full max-w-xl overflow-hidden rounded-2xl border border-brand-line bg-brand-sand-soft shadow-surface">
        {src ? <img src={src} alt={alt} width={600} height={600} loading="eager" className="aspect-square w-full object-contain" />
            : <div className="flex aspect-square w-full items-center justify-center text-sm text-brand-muted" role="img" aria-label={alt}>写真を読み込んでいます</div>}
        {children}
    </div>;
}
