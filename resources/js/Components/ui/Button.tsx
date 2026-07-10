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
    primary: 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-dark active:scale-[0.98]',
    secondary: 'border border-brand-line bg-white text-brand-ink shadow-sm hover:border-brand-sand hover:bg-brand-sand-soft/50 active:scale-[0.98]',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]',
    ghost: 'bg-transparent text-brand-muted hover:bg-brand-sand-soft hover:text-brand-ink active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3 py-1.5 text-sm rounded-lg',
    md: 'min-h-11 px-4 py-2.5 text-sm rounded-xl',
    lg: 'min-h-12 px-6 py-3 text-base rounded-xl',
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
        'inline-flex items-center justify-center gap-2 font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-45';
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
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
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
