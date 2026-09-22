import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { tiff, wrap } from './fixtures/imageMetadata.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../../resources/js/lib/imageGps.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { readImageGps } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const extract = (bytes) => readImageGps(Uint8Array.from(bytes).buffer);
for (const format of ['jpeg', 'png', 'webp']) {
    for (const little of [true, false]) {
        test(`${format}: preserves photo coordinates (${little ? 'LE' : 'BE'})`, () => {
            assert.deepEqual(extract(wrap(tiff({ little }), format)), { latitude: 35.5, longitude: 139.75 });
        });
    }
}
test('keeps southern/western and zero coordinates', () => {
    assert.deepEqual(extract(wrap(tiff({ southWest: true }))), { latitude: -35.5, longitude: -139.75 });
    assert.deepEqual(extract(wrap(tiff({ zero: true }))), { latitude: 0, longitude: 0 });
});
test('invalid rationals and truncated metadata never invent a location or throw', () => {
    assert.equal(extract(wrap(tiff({ invalid: true }))), null);
    const bytes = wrap(tiff());
    for (let length = 0; length < bytes.length - 2; length++) assert.equal(extract(bytes.subarray(0, length)), null);
    assert.equal(extract(Buffer.from('not an image')), null);
});
test('out-of-range coordinates and pointers are rejected', () => {
    const bytes = tiff(); const view = new DataView(bytes.buffer);
    view.setUint32(92, 91, true);
    assert.equal(extract(wrap(bytes)), null);
    view.setUint32(30, 0xffffffff, true);
    assert.equal(extract(wrap(bytes)), null);
});

test('skips unrelated JPEG APP segments before EXIF', () => {
    const jpeg = wrap(tiff());
    const comment = Buffer.from([0xff, 0xe1, 0, 5, 88, 77, 80]);
    assert.deepEqual(extract(Buffer.concat([jpeg.subarray(0, 2), comment, jpeg.subarray(2)])), { latitude: 35.5, longitude: 139.75 });
});

test('reads WebP EXIF after an odd-sized padded chunk, with an EXIF prefix', () => {
    const data = Buffer.concat([Buffer.from('Exif\0\0'), Buffer.from(tiff())]);
    const riff = Buffer.alloc(12); riff.write('RIFF'); riff.write('WEBP', 8);
    const odd = Buffer.alloc(10); odd.write('JUNK'); odd.writeUInt32LE(1, 4);
    const exif = Buffer.alloc(8); exif.write('EXIF'); exif.writeUInt32LE(data.length, 4);
    const bytes = Buffer.concat([riff, odd, exif, data]); bytes.writeUInt32LE(bytes.length - 8, 4);
    assert.deepEqual(extract(bytes), { latitude: 35.5, longitude: 139.75 });
});

test('missing or unknown GPS references stay unknown', () => {
    const bytes = tiff(); bytes[48] = 'X'.charCodeAt(0);
    assert.equal(extract(wrap(bytes)), null);
    bytes[48] = 0;
    assert.equal(extract(wrap(bytes)), null);
});

test('mutated EXIF never throws or returns invalid coordinates', () => {
    let seed = 13579;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 500; sample++) {
        const bytes = wrap(tiff());
        for (let index = 0; index < 4; index++) bytes[next() % bytes.length] = next() & 255;
        const result = extract(bytes);
        if (result) {
            assert.ok(Number.isFinite(result.latitude) && Math.abs(result.latitude) <= 90);
            assert.ok(Number.isFinite(result.longitude) && Math.abs(result.longitude) <= 180);
        }
    }
});
