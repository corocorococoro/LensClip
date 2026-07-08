import { router } from '@inertiajs/react';
import { useCallback, type ChangeEvent } from 'react';
import { setPendingUpload, type EdgeFirstDraft } from '@/uploadPendingStore';

interface LocationValue {
    latitude: number;
    longitude: number;
}

type CaptureSource = 'home' | 'live';

export function usePendingUploadNavigation(
    location: LocationValue | null,
    source: CaptureSource = 'live'
) {
    return useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        const latitude = location?.latitude ?? null;
        const longitude = location?.longitude ?? null;
        const edgeDraft = buildEdgeDraftIfEnabled(file, latitude, longitude);

        setPendingUpload(file, latitude, longitude, source, edgeDraft);
        input.value = '';
        router.visit('/observations/upload-pending');
    }, [location, source]);
}

function buildEdgeDraftIfEnabled(
    file: File,
    latitude: number | null,
    longitude: number | null
): EdgeFirstDraft | null {
    if (import.meta.env.VITE_EDGE_FIRST_ENABLED !== 'true') {
        return null;
    }

    const basename = file.name.replace(/\.[^.]+$/, '').trim();
    const fallbackTitle = basename.length > 0 ? basename : 'しゃしん';
    const clientRef = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
        title: fallbackTitle.slice(0, 100),
        summary: 'ローカル推論（β）で解析した結果です。',
        kid_friendly: 'しゃしんを みて おしえてくれたよ',
        category: 'other',
        confidence: 0.5,
        ai_json: {
            title: fallbackTitle.slice(0, 100),
            tags: [],
            fun_facts: [],
            safety_notes: [],
            questions: [],
        },
        client_ref: clientRef,
        latitude,
        longitude,
    };
}
