import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/index.html');
    await page.waitForFunction(() => typeof (window as any).enqueueUpload === 'function');
});

test('library reconciles an upload that finished before the library mounted', async ({ page }) => {
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'ready', title: '保存した記録' } }));
    await page.evaluate(() => {
        const api = window as any;
        api.mountUpload(new File(['GIF89a'], 'photo.gif', { type: 'image/gif' }));
        api.nextLibraryProps = {
            observations: { data: [] }, tags: [], filters: {},
            dateGroups: [{ yearMonth: '2026-09', label: '2026年9月', observations: [{ id: 'saved', status: 'ready', title: '保存した記録', thumb_url: null, created_at: '2026-09-23' }] }],
            pagination: { hasMore: false, nextCursor: null },
        };
    });
    await expect(page.getByText('図鑑ができました')).toBeVisible();
    await page.getByRole('link', { name: 'ライブラリで待つ' }).click();
    await expect(page.getByText('保存した記録', { exact: true })).toBeVisible({ timeout: 2000 });
    expect(await page.evaluate(() => (window as any).calls.reloads)).toBe(1);
});

test('status failures are visible, back off, and can be retried without resending the photo', async ({ page }) => {
    let checks = 0, posts = 0, healthy = false;
    await page.route('**/observations', route => { posts++; return route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }); });
    await page.route('**/observations/statuses?*', route => {
        checks++;
        return healthy ? route.fulfill({ json: { observations: [{ id: 'saved', status: 'ready', title: '完成' }] } }) : route.fulfill({ status: 503, json: {} });
    });
    await page.evaluate(() => (window as any).mountUpload(new File(['GIF89a'], 'photo.gif', { type: 'image/gif' })));
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    await page.evaluate(() => (window as any).refreshSavedUploads());
    await expect(page.getByRole('alert')).toContainText('解析状況を確認できません');
    await page.evaluate(async () => { for (let n = 0; n < 4; n++) await (window as any).refreshSavedUploads(); });
    expect(checks).toBe(1);
    healthy = true;
    await page.getByRole('button', { name: '状態を再確認' }).click();
    await expect(page.getByText('図鑑ができました')).toBeVisible();
    expect(posts).toBe(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
});

test('refreshes are serialized and leaving the library cancels its pending refresh', async ({ page }) => {
    let posts = 0;
    await page.route('**/observations', route => route.fulfill({ json: { id: `saved-${++posts}`, status: 'ready', title: null } }));
    await page.evaluate(() => {
        const api = window as any;
        api.holdReload = true;
        api.mountLibrary({ observations: { data: [] }, tags: [], filters: {}, dateGroups: [], pagination: { hasMore: false, nextCursor: null } });
        api.enqueueUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' }), null, null);
    });
    await page.waitForFunction(() => (window as any).calls.reloads === 1);
    await page.evaluate(() => (window as any).enqueueUpload(new File(['GIF89a'], 'two.gif', { type: 'image/gif' }), null, null));
    await expect(page.getByText('図鑑ができました')).toHaveCount(2);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).calls.reloads)).toBe(1);
    await page.evaluate(() => { const options = (window as any).calls.reloadOptions[0]; options.onSuccess(); options.onFinish(); });
    await page.waitForFunction(() => (window as any).calls.reloads === 2);
    await page.evaluate(() => (window as any).unmountUpload());
    expect(await page.evaluate(() => (window as any).calls.cancellations)).toBe(1);
});

test('expired status polling stops pending uploads and further polling', async ({ page }) => {
    let posts = 0, checks = 0;
    await page.route('**/observations', route => { posts++; return route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }); });
    await page.route('**/observations/statuses?*', route => { checks++; return route.fulfill({ status: 401, json: {} }); });
    await page.evaluate(() => (window as any).mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' })));
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    await page.evaluate(() => (window as any).refreshSavedUploads());
    await expect(page.getByRole('alert')).toContainText('ログイン状態が変わりました');
    expect(await page.evaluate(() => (window as any).enqueueUpload(new File(['GIF89a'], 'two.gif', { type: 'image/gif' }), null, null))).toBeNull();
    await page.evaluate(() => (window as any).refreshSavedUploads(true));
    expect(checks).toBe(1); expect(posts).toBe(1);
});

test('logging out aborts an outstanding status check and discards late results', async ({ page }) => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    let checking = false;
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
    await page.route('**/observations/statuses?*', async route => { checking = true; await pending; await route.fulfill({ json: { observations: [{ id: 'saved', status: 'ready', title: 'Old owner' }] } }); });
    await page.evaluate(() => (window as any).mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' })));
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    await page.evaluate(() => { void (window as any).refreshSavedUploads(); });
    await expect.poll(() => checking).toBe(true);
    await page.evaluate(() => (window as any).setUploadOwner(null));
    finish();
    await expect(page.getByRole('region', { name: '写真の送信状況' })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).getUploads())).toEqual([]);
});

test('background refresh failures are scoped, reported, and recovered after reconnecting', async ({ page }) => {
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'ready', title: null } }));
    await page.evaluate(() => {
        const api = window as any;
        api.holdReload = true;
        api.mountLibrary({ observations: { data: [] }, tags: [], filters: {}, dateGroups: [], pagination: { hasMore: false, nextCursor: null } });
        api.enqueueUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' }), null, null);
    });
    await page.waitForFunction(() => (window as any).calls.reloads === 1);
    const result = await page.evaluate(() => {
        const api = window as any;
        const options = api.calls.reloadOptions[0];
        const unrelated = new CustomEvent('invalid', { cancelable: true, detail: { response: { config: { headers: {} } } } });
        api.emitRouterEvent('invalid', unrelated);
        const invalid = new CustomEvent('invalid', { cancelable: true, detail: { response: { config: { headers: options.headers } } } });
        api.emitRouterEvent('invalid', invalid);
        const exception = new CustomEvent('exception', { cancelable: true, detail: { exception: { isAxiosError: true, config: { headers: options.headers } } } });
        api.emitRouterEvent('exception', exception);
        options.onFinish();
        return [unrelated.defaultPrevented, invalid.defaultPrevented, exception.defaultPrevented];
    });
    expect(result).toEqual([false, true, true]);
    await expect(page.getByRole('alert')).toContainText('一覧を更新できませんでした');
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).calls.reloads)).toBe(1);
    await page.evaluate(() => { (window as any).holdReload = false; window.dispatchEvent(new Event('online')); });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.waitForFunction(() => (window as any).calls.reloads === 2);
});

test('manual status checks respect Retry-After and malformed replies retain saved records', async ({ page }) => {
    let checks = 0, rateLimited = true;
    await page.route('**/observations', route => route.fulfill({ json: { id: 'saved', status: 'processing', title: null } }));
    await page.route('**/observations/statuses?*', route => {
        checks++;
        return rateLimited ? route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, json: {} }) : route.fulfill({ json: { observations: [{ id: 'saved', status: 'unknown' }] } });
    });
    await page.evaluate(() => (window as any).mountUpload(new File(['GIF89a'], 'one.gif', { type: 'image/gif' })));
    await expect(page.getByText('保存済み・解析中')).toBeVisible();
    await page.evaluate(() => (window as any).refreshSavedUploads());
    await page.getByRole('button', { name: '状態を再確認' }).click();
    expect(checks).toBe(1);
    rateLimited = false;
    await page.evaluate(() => { const later = Date.now() + 61000; Date.now = () => later; });
    await page.getByRole('button', { name: '状態を再確認' }).click();
    await expect.poll(() => checks).toBe(2);
    await expect(page.getByRole('link', { name: '保存した写真を見る' })).toBeVisible();
    await expect(page.getByText('保存済み・状況の確認待ち')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('解析状況を確認できません');
});
