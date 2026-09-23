import { router } from '@inertiajs/react';
import { useCallback, type ChangeEvent } from 'react';
import { enqueueUpload } from '@/uploadQueue';

interface LocationValue { latitude: number; longitude: number }
export function usePendingUploadNavigation(location: LocationValue | null, _source: 'home' | 'live' = 'live') {
    return useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        const id = enqueueUpload(file, location?.latitude ?? null, location?.longitude ?? null);
        input.value = '';
        if (id) router.visit('/observations/upload-pending');
    }, [location]);
}
