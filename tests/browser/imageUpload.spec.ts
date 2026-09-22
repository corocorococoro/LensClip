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

test('StrictMode sends one compressed image with photo GPS ahead of device GPS', async ({ page }) => {
    const exif=[...wrap(tiff()).subarray(2,-2)];
    await page.evaluate(async (exif) => {
        const api=window as any;const source=await api.photo();const bytes=new Uint8Array(await source.arrayBuffer());
        const file=new File([bytes.slice(0,2),new Uint8Array(exif),bytes.slice(2)],'camera.jpg',{type:'image/jpeg'});
        api.originalSize=file.size;api.mountUpload(file,1,2);
    },exif);
    await page.waitForFunction(()=>(window as any).calls.posts.length===1);
    const result=await page.evaluate(()=>{
        const api=window as any;const post=api.calls.posts[0];const file=post.data.get('image');
        return {posts:api.calls.posts.length,visits:api.calls.visits,latitude:post.data.get('latitude'),longitude:post.data.get('longitude'),size:file.size,original:api.originalSize};
    });
    expect(result.posts).toBe(1);expect(result.visits).toEqual([]);
    expect(result.latitude).toBe('35.5');expect(result.longitude).toBe('139.75');expect(result.size).toBeLessThan(result.original);
    await expect(page.getByText('ライブラリでまつ')).toHaveCount(0);
    await page.evaluate(() => (window as any).calls.posts[0].options.onProgress({percentage:50}));
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','50');
    await page.evaluate(() => (window as any).calls.posts[0].options.onError({image:'画像サイズを確認してください。'}));
    await expect(page.getByRole('alert')).toContainText('画像サイズを確認してください。');
});

test('keeps zero device coordinates when photo GPS is missing', async ({ page }) => {
    await page.evaluate(async ()=>{const api=window as any;api.mountUpload(await api.photo(),0,0)});
    await page.waitForFunction(()=>(window as any).calls.posts.length===1);
    expect(await page.evaluate(()=>{
        const data=(window as any).calls.posts[0].data;return [data.get('latitude'),data.get('longitude')];
    })).toEqual(['0','0']);
});

test('omits unavailable coordinates instead of inventing a location', async ({ page }) => {
    await page.evaluate(async ()=>{const api=window as any;api.mountUpload(await api.photo())});
    await page.waitForFunction(()=>(window as any).calls.posts.length===1);
    expect(await page.evaluate(()=>{
        const data=(window as any).calls.posts[0].data;return [data.has('latitude'),data.has('longitude')];
    })).toEqual([false,false]);
});

for(const failure of ['decode','encode']) {
    test(`${failure} failure shows recovery and never sends the original`, async ({ page }) => {
        await page.evaluate(async failure=>{
            const api=window as any;
            const file=failure==='decode'?new File([new Uint8Array([255,216,255,0])],'broken.jpg',{type:'image/jpeg'}):await api.photo();
            if(failure==='encode') HTMLCanvasElement.prototype.toBlob=function(callback){callback(null)};
            api.mountUpload(file);
        },failure);
        await expect(page.getByRole('alert')).toContainText('写真の準備に失敗しました');
        expect(await page.evaluate(()=>(window as any).calls.posts.length)).toBe(0);
        await page.getByRole('button',{name:'もどる'}).click();
        expect(await page.evaluate(()=>(window as any).calls.visits)).toContain('/dashboard');
    });
}

test('leaving during encoding cancels sending, releases URLs, and retains a newer selection', async ({ page }) => {
    await page.evaluate(async ()=>{
        const api=window as any;const file=await api.photo();const toBlob=HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){api.finishEncoding=()=>toBlob.call(this,callback,type,quality)};
        api.mountUpload(file);
    });
    await page.waitForFunction(()=>typeof (window as any).finishEncoding==='function');
    const result=await page.evaluate(async()=>{
        const api=window as any;const old=api.getPendingUpload();
        const newFile=new File(['GIF89a'],'new.gif',{type:'image/gif'});
        api.setPendingUpload(newFile,null,null);api.unmountUpload();
        await Promise.resolve();api.finishEncoding();
        return {oldPreview:old.previewUrl,newName:api.getPendingUpload()?.file.name};
    });
    await page.waitForFunction(()=>(window as any).activeUrls.size===1);
    expect(result.newName).toBe('new.gif');
    expect(await page.evaluate(()=>(window as any).calls.posts.length)).toBe(0);
    expect(await page.evaluate(()=>(window as any).revoked)).toContain(result.oldPreview);
});

test('a newer photo selection suppresses an older in-flight preparation', async ({ page }) => {
    await page.evaluate(async()=>{
        const api=window as any;const file=await api.photo();const toBlob=HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){api.finishEncoding=()=>toBlob.call(this,callback,type,quality)};
        api.mountUpload(file);
    });
    await page.waitForFunction(()=>typeof (window as any).finishEncoding==='function');
    await page.evaluate(()=>{
        const api=window as any;api.setPendingUpload(new File(['GIF89a'],'new.gif',{type:'image/gif'}),null,null);api.finishEncoding();
    });
    await page.waitForFunction(()=>(window as any).activeUrls.size===1);
    expect(await page.evaluate(()=>(window as any).calls.posts.length)).toBe(0);
    expect(await page.evaluate(()=>(window as any).getPendingUpload().file.name)).toBe('new.gif');
});
