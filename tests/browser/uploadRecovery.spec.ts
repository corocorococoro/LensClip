import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/index.html');
    await page.waitForFunction(() => typeof (window as any).enqueueUpload === 'function');
});
async function start(page: any) {
    await page.evaluate(() => {
        const api = window as any;
        api.mountUpload(new File(['GIF89a'], 'photo.gif', { type: 'image/gif' }));
    });
}

test('lost response reconciles the saved record without a second POST, even after repeated retries', async ({ page }) => {
    let posts = 0, lookups = 0;
    await page.route('**/observations', route => { posts++; return route.abort('failed'); });
    await page.route('**/observations/uploads/*', route => { lookups++; return route.fulfill({ json: { id: 'already-saved', status: 'ready', title: 'Ladybug' } }); });
    await start(page);
    await expect(page.getByRole('button', { name: '再試行', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'ライブラリで待つ' }).click();
    await page.evaluate(() => { const api = window as any; const id = api.getUploads()[0].id; api.retryUpload(id); api.retryUpload(id); api.retryUpload(id); });
    await expect(page.getByRole('link', { name: 'Ladybugを見る' })).toBeVisible();
    expect(posts).toBe(1); expect(lookups).toBe(1);
    await page.waitForFunction(() => (window as any).calls.reloads > 0);
    expect(await page.evaluate(() => (window as any).calls.visits)).toEqual(['/library']);
});

test('missing receipt resends the same ID and compressed file', async ({ page }) => {
    let posts = 0;
    await page.route('**/observations', route => ++posts === 1 ? route.abort('failed') : route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
    await page.route('**/observations/uploads/*', route => route.fulfill({ status: 404, json: {} }));
    await start(page);
    await page.getByRole('button', { name: '再試行', exact: true }).click();
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    expect(await page.evaluate(() => {
        const posts = (window as any).calls.posts;
        return posts.length === 2 && posts[0].data.get('upload_id') === posts[1].data.get('upload_id') && posts[0].data.get('image') === posts[1].data.get('image');
    })).toBe(true);
});

test('100 percent means awaiting server confirmation, not saved', async ({ page }) => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    await page.route('**/observations', async route => { await pending; await route.fulfill({ json: { id: 'saved', status: 'ready', title: 'Done' } }); });
    await start(page);
    await page.waitForFunction(() => (window as any).calls.posts.length === 1);
    await page.evaluate(() => (window as any).calls.posts[0].options.onUploadProgress({ loaded: 100, total: 100 }));
    await expect(page.getByText('保存を確認中')).toBeVisible();
    expect(await page.evaluate(() => (window as any).getUploads()[0].file !== null || (window as any).getUploads()[0].prepared !== null)).toBe(true);
    finish();
    await expect(page.getByText('図鑑ができました')).toBeVisible();
    await page.evaluate(() => (window as any).calls.posts[0].options.onUploadProgress({ loaded: 50, total: 100 }));
    await expect(page.getByText('図鑑ができました')).toBeVisible();
    expect(await page.evaluate(() => (window as any).activeUrls.size)).toBe(0);
});

test('offline queue resumes when connection returns', async ({ page, context }) => {
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
    await context.setOffline(true);
    await start(page);
    await expect(page.getByText('接続待ち', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).calls.posts.length)).toBe(0);
    await context.setOffline(false);
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
});

test('an expired session stops subsequent photos and does not loop', async ({ page }) => {
    await page.route('**/observations', route => route.fulfill({ status: 419, json: { message: 'session expired' } }));
    await page.evaluate(() => {
        const api = window as any;
        api.mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' }));
        api.enqueueUpload(new File(['GIF89a'], 'two.gif', { type: 'image/gif' }), null, null);
    });
    await expect(page.getByRole('alert').first()).toContainText('ログイン状態が変わりました');
    expect(await page.evaluate(() => (window as any).calls.posts.length)).toBe(1);
    await expect(page.getByRole('button', { name: '再試行', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).enqueueUpload(new File(['GIF89a'], 'three.gif'), null, null))).toBeNull();
});

test('logout clears files and cancels the active upload without sending queued photos', async ({ page }) => {
    await page.route('**/observations', route => route.abort('failed'));
    await page.evaluate(() => {
        const api = window as any;
        api.mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' }));
        api.enqueueUpload(new File(['GIF89a'], 'two.gif', { type: 'image/gif' }), null, null);
        api.emitRouterEvent('before', { detail: { visit: { url: new URL('/logout', location.origin) } } });
    });
    await expect(page.getByRole('region', { name: '写真の送信状況' })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).getUploads().length)).toBe(0);
    expect(await page.evaluate(() => (window as any).activeUrls.size)).toBe(0);
    expect(await page.evaluate(() => (window as any).calls.posts.length)).toBeLessThanOrEqual(1);
});

test('switching users cannot continue a previous preparation', async ({ page }) => {
    await page.evaluate(() => {
        const api = window as any;
        api.mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' }));
        api.emitRouterEvent('navigate', { detail: { page: { props: { auth: { user: { id: 2 } } } } } });
    });
    await expect(page.getByRole('region', { name: '写真の送信状況' })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).activeUrls.size)).toBe(0);
    expect(await page.evaluate(() => (window as any).calls.posts.length)).toBe(0);
});

test('queue and byte limits do not silently drop earlier photos', async ({ page, context }) => {
    await context.setOffline(true);
    await start(page);
    const result = await page.evaluate(() => {
        const api = window as any;
        const file = new File(['GIF89a'], 'next.gif', { type: 'image/gif' });
        api.enqueueUpload(file, null, null); api.enqueueUpload(file, null, null);
        const rejected = api.enqueueUpload(file, null, null);
        return { rejected, count: api.getUploads().length, unique: new Set(api.getUploads().map((item: any) => item.id)).size };
    });
    expect(result).toEqual({ rejected: null, count: 3, unique: 3 });
    await expect(page.getByRole('alert')).toContainText('送信待ちの写真がいっぱい');
    await page.evaluate(() => { const api = window as any; api.setUploadOwner(null); api.setUploadOwner(1); api.enqueueUpload(new File([new Uint8Array(31 * 1024 * 1024)], 'huge.jpg'), null, null); });
    expect(await page.evaluate(() => (window as any).getUploads().length)).toBe(0);
});

for (const status of [410, 422, 429]) {
    test(`HTTP ${status} does not blindly resend`, async ({ page }) => {
        let posts = 0;
        await page.route('**/observations', route => { posts++; return route.fulfill({ status, headers: { 'Retry-After': '60' }, json: {} }); });
        await start(page);
        await expect(page.getByRole('alert')).toBeVisible();
        if (status === 429) await page.getByRole('button', { name: '再試行', exact: true }).click();
        else await expect(page.getByRole('button', { name: '再試行', exact: true })).toHaveCount(0);
        expect(posts).toBe(1);
    });
}

test('saved processing photos update to completed without navigating away', async ({ page }) => {
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
    await page.route('**/observations/statuses?*', route => route.fulfill({ json: { observations: [{ id: 'saved', status: 'ready', title: 'Ladybug' }] } }));
    await start(page);
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    await page.evaluate(() => (window as any).refreshSavedUploads());
    await expect(page.getByRole('link', { name: 'Ladybugを見る' })).toBeVisible();
    expect(await page.evaluate(() => (window as any).calls.visits)).toEqual([]);
});

for (const viewMode of ['date', 'category', 'map']) {
    test(`mobile ${viewMode} library keeps progress visible and sends from the camera input`, async ({ page, context }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await context.setOffline(true);
        await page.evaluate(viewMode => {
            (window as any).mountLibrary({ observations: { data: [] }, tags: [], filters: { q: 'search' }, viewMode, dateGroups: [], categories: [], pagination: { hasMore: false, nextCursor: null } });
        }, viewMode);
        await page.locator('input[type=file]').setInputFiles({ name: 'photo.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
        await expect(page.getByText('接続待ち', { exact: true })).toBeVisible();
        await page.evaluate(viewMode => {
            (window as any).mountLibrary({ observations: { data: [] }, tags: [], filters: { q: 'search' }, viewMode, dateGroups: [], categories: [], pagination: { hasMore: false, nextCursor: null } });
        }, viewMode);
        await expect(page.getByRole('region', { name: '写真の送信状況' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (viewMode === 'date') await page.screenshot({ path: testInfo.outputPath('upload-mobile.png'), fullPage: true });
    });
}

test('an upload refresh keeps loaded library pages and deduplicates the new record', async ({ page }) => {
    await page.route('**/observations', route => route.fulfill({ json: { id: 'new', status: 'ready', title: '新しい記録' } }));
    await page.route('**/library?*', route => route.fulfill({ json: {
        dateGroups: [{ yearMonth: '2026-09', label: '2026年9月', observations: [{ id: 'old', title: '読み込み済みの記録', status: 'ready', thumb_url: null, created_at: '2026-09-01' }] }],
        pagination: { hasMore: false, nextCursor: null },
    } }));
    await page.evaluate(() => {
        const item = { id: 'one', title: '最初の記録', status: 'ready', thumb_url: null, created_at: '2026-09-02' };
        const props = { observations: { data: [] }, tags: [], filters: {}, dateGroups: [{ yearMonth: '2026-09', label: '2026年9月', observations: [item] }], pagination: { hasMore: true, nextCursor: 'next' } };
        (window as any).mountLibrary(props);
        (window as any).nextLibraryProps = { ...props, dateGroups: [{ ...props.dateGroups[0], observations: [{ ...item, id: 'new', title: '新しい記録', created_at: '2026-09-03' }, item] }] };
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText('読み込み済みの記録', { exact: true })).toBeVisible();
    await page.evaluate(() => (window as any).enqueueUpload(new File(['GIF89a'], 'photo.gif', { type: 'image/gif' }), null, null));
    await expect(page.getByText('新しい記録', { exact: true })).toHaveCount(1);
    await expect(page.getByText('最初の記録', { exact: true })).toHaveCount(1);
    await expect(page.getByText('読み込み済みの記録', { exact: true })).toHaveCount(1);
});
