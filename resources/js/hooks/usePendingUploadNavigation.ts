import { router } from '@inertiajs/react';
import { useCallback, type ChangeEvent } from 'react';
import { setPendingUpload } from '@/uploadPendingStore';

interface LocationValue {
    latitude: number;
    longitude: number;
}

export function usePendingUploadNavigation(location: LocationValue | null) {
    return useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        setPendingUpload(file, location?.latitude ?? null, location?.longitude ?? null);
        input.value = '';
        router.visit('/observations/upload-pending');
    }, [location]);
}
