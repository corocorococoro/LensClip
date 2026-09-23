import { router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { clearUploadNotice, getUploadNotice, getUploadRevision, showUploadNotice, subscribeUploads } from '@/uploadQueue';

const REFRESH_ERROR = '写真は保存済みですが、一覧を更新できませんでした。ライブラリを開き直してください。';

/** Reconcile even when an upload completed before this page mounted. */
export function useUploadRefresh() {
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let active = true;
        let running = false;
        let refreshed = 0;
        let attempted = 0;
        let cancel: (() => void) | undefined;
        let removeRequestListeners = () => {};
        const schedule = () => {
            if (!active) return;
            if (getUploadRevision() === 0) {
                refreshed = 0; attempted = 0;
                clearTimeout(timer); timer = undefined;
                cancel?.();
                return;
            }
            if (running || timer || !navigator.onLine || document.hidden || getUploadRevision() === refreshed || getUploadRevision() === attempted) return;
            timer = setTimeout(() => {
                timer = undefined;
                if (!active || !navigator.onLine || document.hidden) return;
                const target = getUploadRevision();
                if (target === 0 || target === refreshed) return;
                running = true; attempted = target;
                const requestId = crypto.randomUUID();
                const reportFailure = () => { if (active) showUploadNotice(REFRESH_ERROR); };
                // Handle only this background request; ordinary navigations keep Inertia's handlers.
                const removeInvalid = router.on('invalid', event => {
                    if (event.detail.response.config.headers?.['X-Upload-Refresh'] === requestId) { event.preventDefault(); reportFailure(); }
                });
                const removeException = router.on('exception', event => {
                    const error = event.detail.exception;
                    if (axios.isAxiosError(error) && error.config?.headers?.['X-Upload-Refresh'] === requestId) { event.preventDefault(); reportFailure(); }
                });
                removeRequestListeners = () => { removeInvalid(); removeException(); };
                router.reload({
                    headers: { 'X-Upload-Refresh': requestId },
                    onCancelToken: token => { cancel = () => token.cancel(); },
                    onSuccess: () => {
                        if (!active) return;
                        refreshed = target;
                        if (getUploadNotice() === REFRESH_ERROR) clearUploadNotice();
                        setRevision(value => value + 1);
                    },
                    onError: reportFailure,
                    onFinish: () => {
                        running = false; cancel = undefined; removeRequestListeners();
                        // Coalesce uploads arriving during this request; never spin on a failed refresh.
                        if (active && getUploadRevision() > target) schedule();
                    },
                });
            }, 200);
        };
        const unsubscribe = subscribeUploads(schedule);
        const retry = () => { if (navigator.onLine && !document.hidden) { attempted = refreshed; schedule(); } };
        window.addEventListener('online', retry);
        document.addEventListener('visibilitychange', retry);
        schedule();
        return () => {
            active = false; unsubscribe(); clearTimeout(timer); cancel?.(); removeRequestListeners();
            window.removeEventListener('online', retry);
            document.removeEventListener('visibilitychange', retry);
        };
    }, []);
    return revision;
}
