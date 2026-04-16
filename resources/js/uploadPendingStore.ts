interface PendingUpload {
    file: File;
    previewUrl: string;
    latitude: number | null;
    longitude: number | null;
    edgeDraft: EdgeFirstDraft | null;
}

export interface EdgeFirstDraft {
    title: string;
    summary: string;
    kid_friendly: string;
    category: 'animal' | 'insect' | 'plant' | 'food' | 'vehicle' | 'place' | 'tool' | 'other';
    confidence: number;
    ai_json: Record<string, unknown>;
    client_ref: string;
    latitude: number | null;
    longitude: number | null;
}

let state: PendingUpload | null = null;

export function setPendingUpload(
    file: File,
    latitude: number | null,
    longitude: number | null,
    edgeDraft: EdgeFirstDraft | null = null
): void {
    if (state) URL.revokeObjectURL(state.previewUrl);
    state = { file, previewUrl: URL.createObjectURL(file), latitude, longitude, edgeDraft };
}

export function takePendingUpload(): PendingUpload | null {
    const s = state;
    state = null;
    return s;
}
