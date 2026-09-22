export interface ImageGps {
    latitude: number;
    longitude: number;
}

// Read only GPS from EXIF. Never copy camera identifiers or other metadata into
// the encoded upload. All offsets below are bounded by their containing block.
export function readImageGps(buffer: ArrayBuffer): ImageGps | null {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const matches = (offset: number, text: string) =>
        [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));

    try {
        if (view.getUint16(0) === 0xffd8) {
            let offset = 2;
            while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
                while (bytes[offset + 1] === 0xff) offset++;
                const marker = bytes[offset + 1];
                if (marker === 0xda || marker === 0xd9) break;
                const length = view.getUint16(offset + 2);
                const end = offset + 2 + length;
                if (length < 2 || end > bytes.length) return null;
                if (marker === 0xe1 && matches(offset + 4, 'Exif\0\0')) {
                    return readTiffGps(buffer.slice(offset + 10, end));
                }
                offset = end;
            }
        } else if (matches(0, '\x89PNG\r\n\x1a\n')) {
            for (let offset = 8; offset + 12 <= bytes.length;) {
                const length = view.getUint32(offset);
                const end = offset + 12 + length;
                if (end > bytes.length) return null;
                if (matches(offset + 4, 'eXIf')) {
                    return readTiffGps(buffer.slice(offset + 8, end - 4));
                }
                offset = end;
            }
        } else if (matches(0, 'RIFF') && matches(8, 'WEBP')) {
            const limit = Math.min(bytes.length, view.getUint32(4, true) + 8);
            for (let offset = 12; offset + 8 <= limit;) {
                const length = view.getUint32(offset + 4, true);
                const end = offset + 8 + length;
                if (end > limit) return null;
                if (matches(offset, 'EXIF')) {
                    const start = offset + 8 + (matches(offset + 8, 'Exif\0\0') ? 6 : 0);
                    return readTiffGps(buffer.slice(start, end));
                }
                offset = end + (length % 2);
            }
        }
    } catch {
        // Missing/truncated metadata is not a valid location.
    }
    return null;
}

function readTiffGps(buffer: ArrayBuffer): ImageGps | null {
    const view = new DataView(buffer);
    const byteOrder = view.getUint16(0);
    if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null;
    const littleEndian = byteOrder === 0x4949;
    const u16 = (offset: number) => view.getUint16(offset, littleEndian);
    const u32 = (offset: number) => view.getUint32(offset, littleEndian);
    if (u16(2) !== 42) return null;

    const entries = (offset: number) => {
        if (offset < 8) throw new Error('Invalid EXIF directory');
        const count = u16(offset);
        if (offset + 2 + count * 12 + 4 > view.byteLength) {
            throw new Error('Truncated EXIF directory');
        }
        return Array.from({ length: count }, (_, index) => offset + 2 + index * 12);
    };
    const gpsPointer = entries(u32(4)).find((entry) => u16(entry) === 0x8825);
    if (gpsPointer === undefined || u16(gpsPointer + 2) !== 4 || u32(gpsPointer + 4) !== 1) return null;
    const gps = new Map(entries(u32(gpsPointer + 8)).map((entry) => [u16(entry), entry]));

    const coordinate = (tag: number, refTag: number, positive: string, negative: string, limit: number) => {
        const entry = gps.get(tag);
        const ref = gps.get(refTag);
        if (entry === undefined || ref === undefined) return null;
        if (u16(entry + 2) !== 5 || u32(entry + 4) !== 3 || u16(ref + 2) !== 2 || u32(ref + 4) !== 2) return null;
        const direction = String.fromCharCode(view.getUint8(ref + 8));
        if (direction !== positive && direction !== negative) return null;
        const offset = u32(entry + 8);
        const parts = [0, 8, 16].map((delta) => {
            const denominator = u32(offset + delta + 4);
            return denominator === 0 ? NaN : u32(offset + delta) / denominator;
        });
        if (parts.some((part) => !Number.isFinite(part)) || parts[1] >= 60 || parts[2] >= 60) return null;
        const value = parts[0] + parts[1] / 60 + parts[2] / 3600;
        if (value > limit) return null;
        return Number((value * (direction === negative ? -1 : 1)).toFixed(7));
    };

    const latitude = coordinate(2, 1, 'N', 'S', 90);
    const longitude = coordinate(4, 3, 'E', 'W', 180);
    return latitude === null || longitude === null ? null : { latitude, longitude };
}
