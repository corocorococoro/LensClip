import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/** Refresh mounted collections when an upload is saved or its analysis completes. */
export function useUploadRefresh() {
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let active = true;
        const refresh = () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.reload({ onSuccess: () => { if (active) setRevision(value => value + 1); } }), 200);
        };
        window.addEventListener('observation-upload-saved', refresh);
        return () => { active = false; clearTimeout(timer); window.removeEventListener('observation-upload-saved', refresh); };
    }, []);
    return revision;
}
