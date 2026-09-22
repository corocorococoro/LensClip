// Minimal TIFF with orientation, GPS references, and rational D/M/S coordinates.
export function tiff({ little = true, southWest = false, zero = false, invalid = false, orientation = 6 } = {}) {
    const bytes = new Uint8Array(152);
    const view = new DataView(bytes.buffer);
    const u16 = (at, value) => view.setUint16(at, value, little);
    const u32 = (at, value) => view.setUint32(at, value, little);
    u16(0, little ? 0x4949 : 0x4d4d); u16(2, 42); u32(4, 8);
    u16(8, 2);
    u16(10, 0x112); u16(12, 3); u32(14, 1); u16(18, orientation);
    u16(22, 0x8825); u16(24, 4); u32(26, 1); u32(30, 38);
    u16(38, 4);
    for (let index = 0; index < 4; index++) {
        const at = 40 + index * 12;
        u16(at, index + 1); u16(at + 2, index % 2 ? 5 : 2); u32(at + 4, index % 2 ? 3 : 2);
        if (index % 2) u32(at + 8, index === 1 ? 92 : 116);
        else bytes[at + 8] = (index === 0 ? (southWest ? 'S' : 'N') : (southWest ? 'W' : 'E')).charCodeAt(0);
    }
    const parts = zero ? [0, 0, 0, 0, 0, 0] : [35, 30, 0, 139, 45, 0];
    for (let index = 0; index < 6; index++) {
        u32(92 + index * 8, parts[index]); u32(96 + index * 8, invalid && index === 0 ? 0 : 1);
    }
    return bytes;
}

export function wrap(tiffBytes, format = 'jpeg') {
    const data = Buffer.from(tiffBytes);
    if (format === 'jpeg') {
        const header = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0]);
        header.writeUInt16BE(data.length + 8, 4);
        return Buffer.concat([header, Buffer.from('Exif\0\0'), data, Buffer.from([0xff, 0xd9])]);
    }
    if (format === 'png') {
        const chunk = Buffer.alloc(8); chunk.writeUInt32BE(data.length); chunk.write('eXIf', 4);
        return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk, data, Buffer.alloc(4)]);
    }
    const header = Buffer.alloc(20); header.write('RIFF'); header.writeUInt32LE(12 + data.length, 4);
    header.write('WEBP', 8); header.write('EXIF', 12); header.writeUInt32LE(data.length, 16);
    return Buffer.concat([header, data]);
}
