import { useSyncExternalStore } from 'react';
import { clearUploadNotice, getUploadNotice, subscribeUploads } from '@/uploadQueue';

export default function UploadNotice() {
    const notice = useSyncExternalStore(subscribeUploads, getUploadNotice, () => null);
    if (!notice) return null;
    return <div role="alert" className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-3 bg-brand-cream-soft px-4 py-2 text-sm text-brand-ink">
        <p className="flex-1">{notice}</p><button type="button" onClick={clearUploadNotice} className="min-h-11 shrink-0 px-2 font-bold">閉じる</button>
    </div>;
}
