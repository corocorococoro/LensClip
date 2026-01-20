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
        <div className={`text-center py-16 ${className}`}>
            <div className="text-6xl mb-4" role="img" aria-hidden="true">
                {icon}
            </div>
            <div className="text-gray-500 mb-4">{message}</div>
            {action && <div>{action}</div>}
        </div>
    );
}
