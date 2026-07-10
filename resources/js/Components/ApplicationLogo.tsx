import BrandMark from './BrandMark';
import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGSVGElement>) {
    return <BrandMark {...props} />;
}
