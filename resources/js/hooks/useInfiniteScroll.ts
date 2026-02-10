import { useRef, useEffect, useCallback } from 'react';

/**
 * 無限スクロール用フック
 * sentinel 要素が画面に入ったら onLoadMore を呼ぶ
 */
export function useInfiniteScroll(
    onLoadMore: () => void,
    enabled: boolean,
) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const loadingRef = useRef(false);

    const stableOnLoadMore = useCallback(() => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore();
    }, [onLoadMore]);

    // ロード完了後にフラグをリセット
    useEffect(() => {
        loadingRef.current = false;
    }, [enabled]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !enabled) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && enabled) {
                    stableOnLoadMore();
                }
            },
            { rootMargin: '200px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled, stableOnLoadMore]);

    return sentinelRef;
}
