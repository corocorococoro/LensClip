import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 active:scale-[0.98] ${
                    disabled && 'cursor-not-allowed opacity-45'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
