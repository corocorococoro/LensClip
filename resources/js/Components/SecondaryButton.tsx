import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-line bg-white px-4 py-2.5 text-sm font-bold text-brand-ink shadow-sm transition duration-200 hover:border-brand-sand hover:bg-brand-sand-soft/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 ${
                    disabled && 'cursor-not-allowed opacity-45'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
