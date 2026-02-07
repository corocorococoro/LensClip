import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

/**
 * 汎用カードコンテナ
 * - 白背景、角丸、シャドウ
 * - パディングサイズ調整可能
 */
export function Card({ children, className = '', padding = 'md' }: CardProps) {
    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border border-brand-blush ${paddingClasses[padding]} ${className}`}
        >
            {children}
        </div>
    );
}
