interface PendingUpload {
    file: File;
    previewUrl: string;
    latitude: number | null;
    longitude: number | null;
}

let state: PendingUpload | null = null;

export function setPendingUpload(
    file: File,
    latitude: number | null,
    longitude: number | null
): void {
    if (state) URL.revokeObjectURL(state.previewUrl);
    state = { file, previewUrl: URL.createObjectURL(file), latitude, longitude };
}

export function takePendingUpload(): PendingUpload | null {
    const s = state;
    state = null;
    return s;
}
