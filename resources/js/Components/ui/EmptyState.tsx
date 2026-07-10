import { ReactNode } from 'react';

interface EmptyStateProps {
    icon: string;
    message: ReactNode;
    action?: ReactNode;
    className?: string;
}

/**
 * 空状態表示コンポーネント
 * - 大きなアイコン
 * - メッセージ
 * - オプションのアクションボタン
 */
export function EmptyState({ icon, message, action, className = '' }: EmptyStateProps) {
    return (
        <div className={`rounded-2xl border border-dashed border-brand-sand/70 bg-brand-cream-soft px-6 py-14 text-center ${className}`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm" role="img" aria-hidden="true">
                {icon}
            </div>
            <div className="mb-4 text-sm font-medium leading-relaxed text-brand-muted">{message}</div>
            {action && <div>{action}</div>}
        </div>
    );
}
