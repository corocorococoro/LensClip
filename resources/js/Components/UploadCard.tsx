import { Link, usePage } from '@inertiajs/react';
import type { UploadItem } from '@/uploadQueue';
import { uploadLabel } from '@/lib/uploadPresentation';
import { photoHref, rememberPhotoOrigin } from '@/lib/photoNavigation';

export default function UploadCard({ item }: { item: UploadItem }) {
    const { url } = usePage();
    const href = photoHref(`/observations/upload-pending?upload=${item.id}`, url);
    return <Link href={href} onClick={() => rememberPhotoOrigin(href, url)} data-upload-id={item.id}
        className="block min-w-0 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm hover:border-brand-primary">
        <div className="aspect-square overflow-hidden bg-brand-sand-soft">
            {item.previewUrl && <img src={item.previewUrl} alt="追加中の写真" width={320} height={320} className="h-full w-full object-cover" />}
        </div>
        <div className="px-3 py-2.5">
            <p className="text-sm font-bold text-brand-ink">{uploadLabel(item)}</p>
            <p className="mt-1 text-xs text-brand-muted">{item.attempted ? '保存の確認が終わるまで写真を保持します' : 'この端末で写真を保持しています'}</p>
        </div>
    </Link>;
}
