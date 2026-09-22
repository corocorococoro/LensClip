import { readImageGps, type ImageGps } from './imageGps';

const MAX_EDGE = 2048;
const IMAGE_QUALITY = 0.8;

export interface PreparedImageUpload {
    file: File;
    gps: ImageGps | null;
}

export async function prepareImageUpload(file: File): Promise<PreparedImageUpload> {
    // File.type can be empty or inaccurate for files supplied by a device.
    // Identify the supported raster formats from the bytes, like the server.
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const matches = (offset: number, signature: number[]) =>
        signature.every((byte, index) => bytes[offset + index] === byte);
    const isJpeg = matches(0, [0xff, 0xd8, 0xff]);
    const isPng = matches(0, [137, 80, 78, 71, 13, 10, 26, 10]);
    const isWebp = matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]);
    // Keep GIF animation and unsupported formats on the existing server path.
    if (!isJpeg && !isPng && !isWebp) return { file, gps: null };

    const gps = readImageGps(buffer);
    const url = URL.createObjectURL(file);
    const image = new Image();
    const canvas = document.createElement('canvas');

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Image decoding failed'));
            image.src = url;
        });

        // The browser decodes the EXIF orientation before drawing to the canvas.
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image dimensions');
        const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');

        // Preserve transparency for PNG/WebP. JPEG is widely supported on iOS.
        const type = isJpeg ? 'image/jpeg' : 'image/webp';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result?.size && ['image/jpeg', 'image/png', 'image/webp'].includes(result.type)) resolve(result);
                else reject(new Error('Image encoding failed'));
            }, type, IMAGE_QUALITY);
        });

        // Avoid making an already efficient upload larger through re-encoding.
        if (blob.size >= file.size) return { file, gps };
        const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
        const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
        return {
            file: new File([blob], `${name}.${extension}`, { type: blob.type, lastModified: file.lastModified }),
            gps,
        };
    } finally {
        image.onload = null;
        image.onerror = null;
        image.src = '';
        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
    }
}
