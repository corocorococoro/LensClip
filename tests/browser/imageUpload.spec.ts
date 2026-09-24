import { test, expect } from '@playwright/test';
import { tiff, wrap } from '../frontend/fixtures/imageMetadata.mjs';

// The real upload page, store, decoder, and canvas run in a browser. Only the
// surrounding layout and Inertia transport are replaced to avoid a live server.
test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/index.html');
    await page.waitForFunction(() => typeof (window as any).prepareImageUpload === 'function');
    await page.evaluate(() => {
        const api = window as any;
        api.photo = async (width = 3000, height = 2000, type = 'image/jpeg') => {
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
            ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, width / 2, height / 2);
            ctx.fillStyle = '#00f'; ctx.fillRect(width / 2, height / 2, width / 2, height / 2);
            const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), type, 0.98));
            return new File([blob], 'photo.jpg', { type, lastModified: 123 });
        };
        api.inspect = async (file: File) => {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
            const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
            return { width: canvas.width, height: canvas.height, pixels: [pixel(10,10), pixel(canvas.width-10,10), pixel(10,canvas.height-10), pixel(canvas.width-10,canvas.height-10)] };
        };
    });
});

for (const [width, height] of [[4032,3024],[3024,4032],[800,600]]) {
    test(`shrinks ${width}x${height} without enlarging dimensions or upload bytes`, async ({ page }) => {
        const result = await page.evaluate(async ([width,height]) => {
            const api = window as any; const original = await api.photo(width,height);
            const prepared = await api.prepareImageUpload(original);
            return { originalSize: original.size, size: prepared.file.size, type: prepared.file.type, modified: prepared.file.lastModified, ...await api.inspect(prepared.file) };
        }, [width,height]);
        expect(Math.max(result.width,result.height)).toBe(Math.min(2048,Math.max(width,height)));
        expect(result.size).toBeLessThanOrEqual(result.originalSize);
        expect(result.type).toBe('image/jpeg'); expect(result.modified).toBe(123);
    });
}

for (const orientation of [1,2,3,4,5,6,7,8]) {
    test(`preserves EXIF orientation ${orientation} and extracts GPS before encoding`, async ({ page }) => {
        const exif = [...wrap(tiff({ orientation })).subarray(2,-2)];
        const result = await page.evaluate(async (exif) => {
            const api = window as any; const original = await api.photo(); const bytes = new Uint8Array(await original.arrayBuffer());
            const file = new File([bytes.slice(0,2),new Uint8Array(exif),bytes.slice(2)],'camera.jpg',{type:'image/jpeg'});
            const before = await api.inspect(file); const prepared = await api.prepareImageUpload(file);
            return { before, after: await api.inspect(prepared.file), gps: prepared.gps, encodedGps: api.readImageGps(await prepared.file.arrayBuffer()), size:prepared.file.size, originalSize:file.size };
        }, exif);
        expect(result.gps).toEqual({latitude:35.5,longitude:139.75});
        expect(result.encodedGps).toBeNull();
        expect(result.size).toBeLessThan(result.originalSize);
        expect([result.after.width,result.after.height]).toEqual(orientation < 5 ? [2048,1365] : [1365,2048]);
        for (let corner=0;corner<4;corner++) {
            for(let channel=0;channel<3;channel++) expect(Math.abs(result.before.pixels[corner][channel]-result.after.pixels[corner][channel])).toBeLessThan(12);
        }
    });
}

test('recognizes empty or incorrect MIME types from the actual image', async ({ page }) => {
    const types = await page.evaluate(async () => {
        const api=window as any;const source=await api.photo();const results=[];
        for(const type of ['', 'image/png']) {
            const result=await api.prepareImageUpload(new File([source],'camera',{type}));
            results.push({type:result.file.type,size:result.file.size,original:source.size,name:result.file.name});
        }
        return results;
    });
    for(const result of types) { expect(result.type).toBe('image/jpeg');expect(result.name).toBe('camera.jpg');expect(result.size).toBeLessThan(result.original); }
});

test('preserves transparency and handles a browser without WebP encoding', async ({ page }) => {
    const result=await page.evaluate(async () => {
        const api=window as any;const source=await api.photo(3000,2000,'image/png');
        const normal=await api.prepareImageUpload(source);
        const toBlob=HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){return toBlob.call(this,callback,type==='image/webp'?'image/png':type,quality)};
        try {
            const fallback=await api.prepareImageUpload(source);
            return {normal:await api.inspect(normal.file),fallback:await api.inspect(fallback.file),type:fallback.file.type,name:fallback.file.name,size:fallback.file.size,original:source.size};
        } finally {HTMLCanvasElement.prototype.toBlob=toBlob;}
    });
    expect(result.normal.pixels[1][3]).toBe(0);expect(result.fallback.pixels[1][3]).toBe(0);
    expect(result.type).toBe('image/png');expect(result.size).toBeLessThanOrEqual(result.original);
});

test('keeps an already smaller original and GIFs without re-encoding', async ({ page }) => {
    const result=await page.evaluate(async () => {
        const api=window as any;const source=await api.photo(20,20);const toBlob=HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob=function(callback){callback(new Blob([new Uint8Array(source.size+100)],{type:'image/jpeg'}))};
        try {
            const prepared=await api.prepareImageUpload(source);
            const gif=new File(['GIF89a'],'animation.gif',{type:'image/gif'});
            return {same:prepared.file===source,gifSame:(await api.prepareImageUpload(gif)).file===gif};
        } finally {HTMLCanvasElement.prototype.toBlob=toBlob;}
    });
    expect(result).toEqual({same:true,gifSame:true});
});

test('StrictMode sends once with photo GPS, and leaving the page keeps sending', async ({ page }) => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    await page.route('**/observations', async route => { await pending; await route.fulfill({ json: { id: 'saved-photo', status: 'processing', title: null } }); });
    const exif = [...wrap(tiff()).subarray(2, -2)];
    await page.evaluate(async exif => {
        const api = window as any; const source = await api.photo(); const bytes = new Uint8Array(await source.arrayBuffer());
        const file = new File([bytes.slice(0, 2), new Uint8Array(exif), bytes.slice(2)], 'camera.jpg', { type: 'image/jpeg' });
        api.originalSize = file.size; api.mountUpload(file, 1, 2);
    }, exif);
    await page.waitForFunction(() => (window as any).calls.posts.length === 1);
    const result = await page.evaluate(() => {
        const api = window as any; const post = api.calls.posts[0];
        return { latitude: post.data.get('latitude'), longitude: post.data.get('longitude'), size: post.data.get('image').size, original: api.originalSize, id: post.data.get('upload_id'), owner: post.data.get('upload_owner_id') };
    });
    expect(result.latitude).toBe('35.5'); expect(result.longitude).toBe('139.75');
    expect(result.size).toBeLessThan(result.original); expect(result.id).toMatch(/^[\da-f-]{36}$/); expect(result.owner).toBe('1');
    await page.getByRole('link', { name: '図鑑へ戻る' }).click();
    await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toContainText('1');
    finish();
    await page.waitForFunction(() => (window as any).getUploads().some((item: any) => item.phase === 'saved' && item.observation.status === 'processing'));
    expect(await page.evaluate(() => (window as any).calls.posts.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).calls.visits)).toEqual(['/library']);
    await page.waitForFunction(() => (window as any).activeUrls.size === 0);
});

for (const coordinates of [[0, 0], [null, null]]) {
    test(`preserves device coordinates ${coordinates}`, async ({ page }) => {
        await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
        await page.evaluate(async coordinates => { const api = window as any; api.mountUpload(await api.photo(), ...coordinates); }, coordinates);
        await page.waitForFunction(() => (window as any).calls.posts.length === 1);
        expect(await page.evaluate(() => { const data = (window as any).calls.posts[0].data; return [data.get('latitude'), data.get('longitude')]; })).toEqual(coordinates.map(value => value === null ? null : String(value)));
    });
}

for (const failure of ['decode', 'encode']) {
    test(`${failure} failure shows recovery without uploading`, async ({ page }) => {
        await page.evaluate(async failure => {
            const api = window as any;
            const file = failure === 'decode' ? new File([new Uint8Array([255, 216, 255, 0])], 'broken.jpg', { type: 'image/jpeg' }) : await api.photo();
            if (failure === 'encode') HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
            api.mountUpload(file);
        }, failure);
        await expect(page.getByRole('alert')).toContainText('写真の準備に失敗しました');
        expect(await page.evaluate(() => (window as any).calls.posts.length)).toBe(0);
        await page.getByRole('button', { name: '追加を取り消す' }).click();
        expect(await page.evaluate(() => (window as any).activeUrls.size)).toBe(0);
    });
}

test('leaving during encoding continues the first upload and queues the next photo', async ({ page }) => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    let count = 0;
    await page.route('**/observations', async route => { count++; if (count === 1) await pending; await route.fulfill({ json: { id: `saved-${count}`, status: 'processing', title: null } }); });
    await page.evaluate(async () => {
        const api = window as any; const file = await api.photo(); const toBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) { api.finishEncoding = () => { HTMLCanvasElement.prototype.toBlob = toBlob; toBlob.call(this, callback, type, quality); }; };
        api.mountUpload(file);
    });
    await page.waitForFunction(() => typeof (window as any).finishEncoding === 'function');
    await page.getByRole('link', { name: '図鑑へ戻る' }).click();
    await page.evaluate(() => {
        const api = window as any;
        api.enqueueUpload(new File(['GIF89a'], 'next.gif', { type: 'image/gif' }), null, null);
        api.finishEncoding();
    });
    await page.waitForFunction(() => (window as any).calls.posts.length === 1);
    await expect(page.getByText('保存待ち', { exact: true })).toBeVisible();
    finish();
    await page.waitForFunction(() => (window as any).getUploads().every((item: any) => item.phase === 'saved'));
    expect(count).toBe(2);
    expect(await page.evaluate(() => (window as any).calls.posts.map((post: any) => post.data.get('upload_id')))).toHaveLength(2);
    await page.waitForFunction(() => (window as any).activeUrls.size === 0);
});
