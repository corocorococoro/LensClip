interface PendingUpload {
    file: File;
    previewUrl: string;
    latitude: number | null;
    longitude: number | null;
    source: 'home' | 'live';
}

let state: PendingUpload | null = null;

export function setPendingUpload(
    file: File,
    latitude: number | null,
    longitude: number | null,
    source: 'home' | 'live' = 'live'
): void {
    if (state) URL.revokeObjectURL(state.previewUrl);
    state = { file, previewUrl: URL.createObjectURL(file), latitude, longitude, source };
}

export function takePendingUpload(): PendingUpload | null {
    const s = state;
    state = null;
    return s;
}
