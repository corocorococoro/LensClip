import { Link, usePage } from '@inertiajs/react';
import { canReturnThroughHistory, photoReturnUrl } from '@/lib/photoNavigation';

export default function PhotoBackLink() {
    const { url } = usePage();
    const href = photoReturnUrl(url);
    return <Link href={href} onClick={event => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && canReturnThroughHistory(url)) {
            event.preventDefault(); window.history.back();
        }
    }} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-primary-dark">
        <span aria-hidden="true">←</span>{href.startsWith('/dashboard') ? 'ホームへ戻る' : '図鑑へ戻る'}
    </Link>;
}
