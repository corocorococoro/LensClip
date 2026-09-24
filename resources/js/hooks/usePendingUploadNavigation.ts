import { router, usePage } from '@inertiajs/react';
import { useCallback, type ChangeEvent } from 'react';
import { enqueueUpload } from '@/uploadQueue';
import { photoHref, rememberPhotoOrigin } from '@/lib/photoNavigation';

interface LocationValue { latitude: number; longitude: number }
export function usePendingUploadNavigation(location: LocationValue | null, _source: 'home' | 'live' = 'live') {
    const { url } = usePage();
    return useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        const id = enqueueUpload(file, location?.latitude ?? null, location?.longitude ?? null);
        input.value = '';
        if (id) {
            const href = photoHref(`/observations/upload-pending?upload=${id}`, url);
            rememberPhotoOrigin(href, url);
            router.visit(href, { replace: url.startsWith('/observations/') });
        }
    }, [location, url]);
}
