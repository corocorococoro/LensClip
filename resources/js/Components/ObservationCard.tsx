import { Link } from '@inertiajs/react';
import type { ObservationSummary, CategoryDefinition } from '@/types/models';

interface ObservationCardProps {
    observation: ObservationSummary;
    categories?: CategoryDefinition[];
    /** カードサイズ (グリッド用) */
    size?: 'sm' | 'md';
    /** カテゴリバッジを表示するか (デフォルト: true) */
    showCategory?: boolean;
}

/**
 * 観察記録カードコンポーネント
 * - サムネイル表示 (CLS対策のためwidth/height指定)
 * - ステータス表示 (processing, failed, ready)
 * - カテゴリ表示 (バッジ)
 * - アクセシビリティ対応 (適切なalt属性)
 */
export function ObservationCard({ observation, categories = [], size = 'md', showCategory = true }: ObservationCardProps) {
    const href =
        observation.status === 'processing'
            ? `/observations/${observation.id}/processing`
            : `/observations/${observation.id}`;

    // サイズに応じたクラス
    const sizeClasses = size === 'sm' ? 'rounded-xl' : 'rounded-2xl';

    // カテゴリ取得
    const category = categories.find(c => c.id === observation.category);

    return (
        <Link
            href={href}
            className={`relative aspect-square ${sizeClasses} overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white block`}
        >
            <img
                src={observation.thumb_url}
                alt={observation.title || '観察中の画像'}
                width={200}
                height={200}
                loading="lazy"
                className="w-full h-full object-cover"
            />

            {/* Processing State */}
            {observation.status === 'processing' && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-3xl animate-spin" role="status" aria-label="調査中">
                        ⏳
                    </span>
                </div>
            )}

            {/* Failed State */}
            {observation.status === 'failed' && (
                <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <span className="text-3xl" role="img" aria-label="エラー">
                        ❌
                    </span>
                </div>
            )}

            {/* Ready State */}
            {observation.status === 'ready' && (
                <>
                    {/* Category Badge (Top Left) */}
                    {showCategory && category && (
                        <div className="absolute top-2 left-2 z-10">
                            <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md bg-white/90"
                                style={{ color: category.color }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                            </span>
                        </div>
                    )}

                    {/* Title (Bottom) */}
                    {observation.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-white text-sm font-medium truncate">
                                {observation.title}
                            </p>
                        </div>
                    )}
                </>
            )}
        </Link>
    );
}
