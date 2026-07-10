import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-brand-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 active:scale-[0.98] ${
                    disabled && 'cursor-not-allowed opacity-45'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
