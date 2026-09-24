import AppLayout from '@/Layouts/AppLayout';
import ObservationPhoto from '@/Components/ObservationPhoto';
import PhotoBackLink from '@/Components/PhotoBackLink';
import { Button } from '@/Components/ui';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useUploads } from '@/hooks/useUploads';
import { dismissUpload, refreshSavedUploads, retryUpload } from '@/uploadQueue';
import { canCancelUpload, uploadLabel } from '@/lib/uploadPresentation';
import { photoHref, rememberPhotoOrigin } from '@/lib/photoNavigation';
import axios from 'axios';

export default function UploadPending() {
    const items = useUploads();
    const { url } = usePage();
    const id = new URL(url, 'https://lensclip.invalid').searchParams.get('upload');
    const item = id ? items.find(value => value.id === id) : items[items.length - 1];
    const [openError, setOpenError] = useState(false);
    const savedId = item?.observation?.id;
    const href = savedId ? photoHref(`/observations/${savedId}`, url) : null;

    useEffect(() => {
        if (!href) return;
        let active = true;
        let cancel: (() => void) | undefined;
        const requestId = crypto.randomUUID();
        const reportFailure = () => { if (active) setOpenError(true); };
        const removeInvalid = router.on('invalid', event => {
            if (event.detail.response.config.headers?.['X-Photo-Transition'] === requestId) { event.preventDefault(); reportFailure(); }
        });
        const removeException = router.on('exception', event => {
            const error = event.detail.exception;
            if (axios.isAxiosError(error) && error.config?.headers?.['X-Photo-Transition'] === requestId) { event.preventDefault(); reportFailure(); }
        });
        const timer = window.setTimeout(() => {
            rememberPhotoOrigin(href, url);
            router.visit(href, {
                replace: true, preserveScroll: true,
                headers: { 'X-Photo-Transition': requestId },
                onCancelToken: token => { cancel = () => token.cancel(); },
                onError: () => { if (active) setOpenError(true); },
                onFinish: () => { cancel = undefined; if (active) setOpenError(true); },
            });
        }, 0);
        return () => { active = false; clearTimeout(timer); cancel?.(); removeInvalid(); removeException(); };
    }, [href, url]);

    return <AppLayout title="写真を調べる">
        <Head title="写真を調べる" />
        <div className="mx-auto max-w-2xl">
            <PhotoBackLink />
            {item ? <div className="flex flex-col items-center" data-upload-id={item.id}>
                <ObservationPhoto src={item.previewUrl || item.observation?.thumb_url} />
                <div className="w-full max-w-xl" aria-live="polite">
                    <h1 className="text-2xl font-bold text-brand-ink">{uploadLabel(item)}</h1>
                    {item.phase === 'uploading' && <progress aria-label="写真の送信" value={item.percent} max={100} className="mt-4 h-1.5 w-full accent-brand-primary" />}
                    <p className="mt-3 text-sm leading-relaxed text-brand-muted">{item.phase === 'saved'
                        ? '写真は図鑑に保存されています。'
                        : '図鑑に戻っても保存を続けます。保存が終わるまで、このタブを開いておいてください。'}</p>
                    {item.message && <p role={item.phase === 'waiting' ? 'status' : 'alert'} className="mt-3 text-sm text-amber-800">{item.message}</p>}
                    <div className="mt-5 flex flex-wrap gap-3">
                        {['error', 'waiting'].includes(item.phase) && item.retryable && <Button onClick={() => retryUpload(item.id)}>再試行</Button>}
                        {item.phase === 'saved' && item.message && item.retryable && <Button onClick={() => void refreshSavedUploads(true)}>状態を再確認</Button>}
                        {canCancelUpload(item) && <Button variant="secondary" onClick={() => dismissUpload(item.id)}>追加を取り消す</Button>}
                    </div>
                    {openError && href && <p className="mt-4 text-sm text-brand-muted">写真は保存済みです。<Link href={href} replace className="inline-flex min-h-11 items-center font-bold text-brand-primary-dark underline">写真の画面を開く</Link></p>}
                </div>
            </div> : <div className="py-10 text-center">
                <h1 className="text-xl font-bold">この端末で保持している写真はありません</h1>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">保存済みの写真は図鑑で確認できます。<br />未保存の場合は、下のボタンから写真を選び直してください。</p>
                <Link href="/library" className="mt-5 inline-flex min-h-11 items-center font-bold text-brand-primary-dark">図鑑を開く</Link>
            </div>}
        </div>
    </AppLayout>;
}
