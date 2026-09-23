import { router } from '@inertiajs/react';
import { refreshSavedUploads, resumeUploads, setUploadOwner, warnPendingUploads } from '@/uploadQueue';

/** One session per document: navigating/unmounting a page never owns the request. */
export function initializeUploadSession(initialOwnerId: number | null) {
    setUploadOwner(initialOwnerId);
    router.on('before', event => {
        if (event.detail.visit.url.pathname === '/logout') setUploadOwner(null);
    });
    router.on('navigate', event => {
        const auth = event.detail.page.props.auth as { user?: { id: number } } | undefined;
        setUploadOwner(auth?.user?.id ?? null);
    });
    window.addEventListener('online', resumeUploads);
    window.addEventListener('beforeunload', warnPendingUploads);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeUploads(); });
    window.setInterval(() => { void refreshSavedUploads(); }, 6000);
}
