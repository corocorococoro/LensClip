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

// Reading during render must be repeatable (including React StrictMode).
export function getPendingUpload(): PendingUpload | null {
    return state;
}

export function clearPendingUpload(pending: PendingUpload): void {
    URL.revokeObjectURL(pending.previewUrl);
    // Leaving an older upload must not discard a newer photo selection.
    if (state === pending) state = null;
}
