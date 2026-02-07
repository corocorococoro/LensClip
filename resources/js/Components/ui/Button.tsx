import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Link } from '@inertiajs/react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
    className?: string;
    children?: React.ReactNode;
}

interface ButtonAsButtonProps
    extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
    href?: never;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
    href: string;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        'bg-gradient-to-r from-brand-pink to-brand-sky text-white shadow-lg hover:translate-y-[-2px] active:scale-95',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-base rounded-xl',
    lg: 'px-6 py-3 text-lg rounded-2xl',
};

/**
 * 再利用可能なボタンコンポーネント
 * - バリアント: primary, secondary, danger, ghost
 * - サイズ: sm, md, lg
 * - ローディング状態サポート
 * - Link としても使用可能 (href prop)
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const {
        variant = 'primary',
        size = 'md',
        loading = false,
        fullWidth = false,
        className = '',
        children,
    } = props;

    const baseClasses =
        'inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

    // Link として使用
    if ('href' in props && props.href) {
        return (
            <Link href={props.href} className={classes}>
                {children}
            </Link>
        );
    }

    // Button として使用
    const {
        variant: _v,
        size: _s,
        loading: _l,
        fullWidth: _f,
        className: _c,
        children: _ch,
        ...buttonProps
    } = props as ButtonAsButtonProps;

    return (
        <button
            ref={ref}
            className={classes}
            disabled={buttonProps.disabled || loading}
            {...buttonProps}
        >
            {loading ? (
                <>
                    <span className="animate-spin mr-2">⏳</span>
                    {children}
                </>
            ) : (
                children
            )}
        </button>
    );
});

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };

