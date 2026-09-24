import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export function useRestorePhotoScroll() {
    const { url } = usePage();
    useEffect(() => {
        const position = router.restore('photo-origin-scroll') as { url: string; top: number } | undefined;
        if (!position || position.url !== url || !Number.isFinite(position.top)) return;
        let second: number | undefined;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => window.scrollTo(0, position.top));
        });
        return () => { cancelAnimationFrame(first); if (second !== undefined) cancelAnimationFrame(second); };
    }, [url]);
}
