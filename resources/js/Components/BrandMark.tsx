import { SVGAttributes } from 'react';

interface BrandMarkProps extends SVGAttributes<SVGSVGElement> {
    compact?: boolean;
}

/** LensClip の「見つける・残す」を表すカメラ + 発見のきらめき。 */
export default function BrandMark({ compact = false, className = '', ...props }: BrandMarkProps) {
    return (
        <svg
            {...props}
            className={className}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <rect width="40" height="40" rx={compact ? 12 : 14} fill="#159E96" />
            <path
                d="M10.5 16.4a2.4 2.4 0 0 1 2.4-2.4h3l1.5-2h5.2l1.5 2h3a2.4 2.4 0 0 1 2.4 2.4v10.2a2.4 2.4 0 0 1-2.4 2.4H12.9a2.4 2.4 0 0 1-2.4-2.4V16.4Z"
                stroke="white"
                strokeWidth="2.2"
                strokeLinejoin="round"
            />
            <circle cx="20" cy="21.5" r="4.2" stroke="white" strokeWidth="2.2" />
            <path d="m30.2 8 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="#FFFDD0" />
        </svg>
    );
}
