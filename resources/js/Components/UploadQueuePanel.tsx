import { Link } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';
import { clearUploadNotice, dismissUpload, getServerUploads, getUploadNotice, getUploads, refreshSavedUploads, retryUpload, subscribeUploads, type UploadItem } from '@/uploadQueue';

function label(item: UploadItem) {
    switch (item.phase) {
        case 'queued': return '送信待ち';
        case 'preparing': return '写真を準備中';
        case 'uploading': return `送信中 ${item.percent}%`;
        case 'confirming': return '保存を確認中';
        case 'waiting': return '接続待ち';
        case 'error': return '送信を完了できませんでした';
        case 'saved': return item.message ? '保存済み・状況の確認待ち' : item.observation?.status === 'processing' ? '保存済み・解析中' : item.observation?.status === 'failed' ? '保存済み・解析を再試行できます' : '図鑑ができました';
    }
}
export default function UploadQueuePanel() {
    const items = useSyncExternalStore(subscribeUploads, getUploads, getServerUploads);
    const notice = useSyncExternalStore(subscribeUploads, getUploadNotice, () => null);
    if (!items.length && !notice) return null;
    return (
        <section aria-label="写真の送信状況" className="mx-auto max-h-64 max-w-5xl overflow-y-auto border-b border-brand-line bg-white px-4 py-3 text-sm shadow-sm print:hidden">
            {notice && <div role="alert" className="mb-2 flex items-center gap-3 text-red-700"><p>{notice}</p><button onClick={clearUploadNotice} className="underline">閉じる</button></div>}
            <ul className="space-y-3">
                {items.map(item => (
                    <li key={item.id} className="flex items-start gap-3" data-upload-id={item.id}>
                        {item.previewUrl && <img src={item.previewUrl} alt="送信待ちの写真" className="h-14 w-14 rounded-lg object-cover" />}
                        <div className="min-w-0 flex-1">
                            <p role="status" className="font-bold text-brand-primary-dark">{label(item)}</p>
                            {item.phase === 'uploading' && <progress aria-label="写真の送信" value={item.percent} max={100} className="h-1 w-full" />}
                            {item.message && <p role={item.phase === 'error' || item.phase === 'saved' ? 'alert' : undefined} className="mt-1 text-brand-muted">{item.message}</p>}
                            {item.phase === 'saved' && item.observation && <Link href={`/observations/${item.observation.id}`} className="mt-1 inline-block font-medium underline">{item.observation.title || '保存した写真'}を見る</Link>}
                            {item.phase === 'saved' && item.message && item.retryable && <button onClick={() => { void refreshSavedUploads(true); }} className="ml-3 mt-2 font-bold underline">状態を再確認</button>}
                            {(item.phase === 'error' || item.phase === 'waiting') && item.retryable && <button onClick={() => retryUpload(item.id)} className="mt-2 font-bold underline">再試行</button>}
                        </div>
                        {['queued', 'waiting', 'error', 'saved'].includes(item.phase) && <button onClick={() => dismissUpload(item.id)} aria-label={item.phase === 'saved' ? '通知を閉じる' : '送信待ちから取り除く'} className="rounded p-2 text-brand-muted">×</button>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
