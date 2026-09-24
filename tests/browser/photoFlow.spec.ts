import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';

const baseProps = { auth: { user: { id: 1, name: 'Test', role: 'user' } }, errors: {} };
const photo = { id: 'new-photo', title: 'ダリア', status: 'processing', thumb_url: '/test-photo.png', original_url: '/test-photo.png', created_at: '2026-09-24T10:00:00Z', ai_json: null, tags: [] };
const library = { observations: { data: [] }, tags: [], filters: {}, dateGroups: [], categories: [], pagination: { hasMore: false, nextCursor: null } };
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

// Uses the built application and real Inertia router/history, rather than the unit harness alias.
async function respond(route: Route, component: string, props: object) {
    const request = route.request();
    const url = new URL(request.url());
    const payload = { component, props: { ...baseProps, ...props }, url: url.pathname + url.search, version: 'photo-flow', clearHistory: false, encryptHistory: false };
    if (request.headers()['x-inertia']) return route.fulfill({ headers: { 'X-Inertia': 'true' }, json: payload });
    const manifest = JSON.parse(readFileSync('public/build/manifest.json', 'utf8'))['resources/js/app.tsx'];
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${manifest.css.map((css: string) => `<link rel="stylesheet" href="/build/${css}">`).join('')}</head><body><div id="app" data-page="${JSON.stringify(payload).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div><script type="module" src="/build/${manifest.file}"></script></body></html>` });
}
async function setup(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/test-photo.png', route => route.fulfill({ contentType: 'image/png', body: tinyPng }));
    await page.route('**/observations/upload-pending?*', route => respond(route, 'Observations/UploadPending', {}));
    return errors;
}

test('selected photo progresses through saving, analysis, and result in the same frame', async ({ page }, testInfo) => {
    const errors = await setup(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let ready = false, posts = 0;
    await page.route('**/library*', route => respond(route, 'Library', library));
    await page.route('**/observations', async route => { posts++; await pending; await route.fulfill({ json: photo }); });
    await page.route('**/observations/new-photo?*', route => respond(route, 'Observations/Show', { observation: { ...photo, status: ready ? 'ready' : 'processing', kid_friendly: ready ? '花びらがたくさん重なっています。' : '' }, categories: [] }));
    await page.route('**/observations/new-photo/stream', route => { ready = true; return route.fulfill({ contentType: 'text/event-stream', body: 'event: ready\ndata: {}\n\n' }); });
    await page.goto('/library');
    await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByRole('heading', { name: /写真を送信中|保存を確認中/ })).toBeVisible();
    const before = await page.getByRole('img', { name: '選んだ写真' }).boundingBox();
    await expect(page.getByRole('button', { name: '追加を取り消す' })).toHaveCount(0);
    release();
    await expect(page.getByRole('heading', { name: 'ダリア', exact: true })).toBeVisible();
    await expect(page.getByText('花びらがたくさん重なっています。')).toBeVisible();
    const after = await page.getByRole('img', { name: 'ダリア', exact: true }).boundingBox();
    expect(after?.y).toBe(before?.y); expect(after?.width).toBe(before?.width);
    expect(posts).toBe(1); expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('photo-result-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: '図鑑へ戻る' }).click();
    await expect(page).toHaveURL(/\/library$/);
});

test('returning from a photo restores search, loaded pages, and scroll position', async ({ page }) => {
    const errors = await setup(page);
    let paginationRequests = 0;
    const records = Array.from({ length: 18 }, (_, n) => ({ ...photo, id: `record-${n}`, title: `記録 ${n}`, status: 'ready' }));
    const props = { ...library, filters: { q: '植物' }, dateGroups: [{ yearMonth: '2026-09', label: '2026年9月', observations: records }], pagination: { hasMore: true, nextCursor: 'more' } };
    await page.route('**/library*', route => {
        if (new URL(route.request().url()).searchParams.has('cursor')) {
            paginationRequests++;
            return route.fulfill({ json: { dateGroups: [{ yearMonth: '2026-08', label: '2026年8月', observations: [{ ...photo, id: 'older', title: '前に読み込んだ写真', status: 'ready' }] }], pagination: { hasMore: false, nextCursor: null } } });
        }
        return respond(route, 'Library', props);
    });
    await page.route('**/observations/older?*', route => respond(route, 'Observations/Show', { observation: { ...photo, id: 'older', title: '前に読み込んだ写真', status: 'ready' }, categories: [] }));
    await page.goto('/library?q=%E6%A4%8D%E7%89%A9');
    await page.getByText('記録 17', { exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const older = page.getByRole('link', { name: '前に読み込んだ写真' });
    await older.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await older.click();
    await expect(page.getByRole('heading', { name: '前に読み込んだ写真' })).toBeVisible();
    await page.getByRole('link', { name: '図鑑へ戻る' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('植物');
    await expect(older).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    expect(paginationRequests).toBe(1); expect(errors).toEqual([]);
});

test('leaving while saving retains one card without navigating on completion', async ({ page }) => {
    const errors = await setup(page);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let saved = false;
    await page.route('**/observations', async route => { await pending; saved = true; await route.fulfill({ json: { ...photo, status: 'ready' } }); });
    await page.route('**/library*', route => respond(route, 'Library', { ...library, dateGroups: saved ? [{ yearMonth: '2026-09', label: '2026年9月', observations: [{ ...photo, status: 'ready' }] }] : [] }));
    await page.goto('/library');
    await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByRole('heading', { name: /写真を送信中|保存を確認中/ })).toBeVisible();
    // The primary navigation is always reachable, including after scrolling.
    await page.getByRole('navigation').getByRole('link', { name: /図鑑/ }).click();
    await expect(page.locator('[data-upload-id]')).toHaveCount(1);
    release();
    await expect(page.getByText('ダリア', { exact: true })).toHaveCount(1);
    await expect(page).toHaveURL(/\/library$/);
    expect(errors).toEqual([]);
});

test('a failed transition after saving leaves the photo and a recovery link without resending', async ({ page }) => {
    const errors = await setup(page);
    let posts = 0;
    await page.route('**/library*', route => respond(route, 'Library', library));
    await page.route('**/observations', route => { posts++; return route.fulfill({ json: { ...photo, status: 'ready' } }); });
    await page.route('**/observations/new-photo?*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await page.goto('/library');
    await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByRole('link', { name: '写真の画面を開く' })).toBeVisible();
    const retryResponse = page.waitForResponse(response => response.url().includes('/observations/new-photo?'));
    await page.getByRole('link', { name: '写真の画面を開く' }).click();
    await retryResponse;
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('img', { name: '選んだ写真' })).toBeVisible();
    await expect(page.getByRole('button', { name: '追加を取り消す' })).toHaveCount(0);
    expect(posts).toBe(1); expect(errors).toEqual([]);
});

test('saving during a slow library navigation does not override the chosen destination', async ({ page }) => {
    const errors = await setup(page);
    let save!: () => void, openLibrary!: () => void;
    const saving = new Promise<void>(resolve => { save = resolve; });
    const navigating = new Promise<void>(resolve => { openLibrary = resolve; });
    let posts = 0, photoVisits = 0;
    await page.route('**/library*', async route => {
        if (route.request().headers()['x-inertia']) await navigating;
        await respond(route, 'Library', library);
    });
    await page.route('**/observations', async route => { posts++; await saving; await route.fulfill({ json: { ...photo, status: 'ready' } }); });
    await page.route('**/observations/new-photo?*', route => { photoVisits++; return respond(route, 'Observations/Show', { observation: { ...photo, status: 'ready' }, categories: [] }); });
    await page.goto('/library');
    await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByRole('heading', { name: /写真を送信中|保存を確認中/ })).toBeVisible();
    const libraryRequest = page.waitForRequest(request => new URL(request.url()).pathname === '/library' && !!request.headers()['x-inertia']);
    await page.getByRole('navigation').getByRole('link', { name: /図鑑/ }).click();
    await libraryRequest;
    save();
    await expect(page.getByText('写真は図鑑に保存されています。', { exact: true })).toBeVisible();
    expect(photoVisits).toBe(0);
    openLibrary();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByText('ダリア', { exact: true })).toHaveCount(1);
    expect(photoVisits).toBe(0); expect(posts).toBe(1); expect(errors).toEqual([]);
});

for (const failure of ['server', 'network'] as const) {
    test(`a ${failure} error while opening analysis results keeps the photo and allows rechecking`, async ({ page }) => {
        const errors = await setup(page);
        let healthy = false, checks = 0;
        await page.route('**/observations/new-photo?*', route => {
            if (!route.request().headers()['x-inertia']) return respond(route, 'Observations/Show', { observation: photo, categories: [] });
            checks++;
            if (!healthy) return failure === 'server' ? route.fulfill({ status: 503, body: 'Internal response must not be displayed' }) : route.abort('failed');
            return respond(route, 'Observations/Show', { observation: { ...photo, status: 'ready' }, categories: [] });
        });
        await page.route('**/observations/new-photo/stream', route => route.fulfill({ contentType: 'text/event-stream', body: 'event: ready\ndata: {}\n\n' }));
        await page.goto('/observations/new-photo?return_to=%2Flibrary');
        const retry = page.getByRole('button', { name: '状態を再確認' });
        await expect(retry).toBeVisible();
        await expect(page.locator('iframe')).toHaveCount(0);
        await expect(page.getByRole('img', { name: '選んだ写真' })).toBeVisible();
        expect(checks).toBe(1); expect(errors).toEqual([]);
        healthy = true;
        await retry.click();
        await expect(page.getByRole('heading', { name: 'ダリア', exact: true })).toBeVisible();
        expect(checks).toBe(2); expect(errors).toEqual([]);
    });
}

test('browser Back cancels an in-flight saved-photo transition without cancelling the saved record', async ({ page }) => {
    const errors = await setup(page);
    let openPhoto!: () => void;
    const opening = new Promise<void>(resolve => { openPhoto = resolve; });
    await page.route('**/library*', route => respond(route, 'Library', library));
    await page.route('**/observations', route => route.fulfill({ json: { ...photo, status: 'ready' } }));
    await page.route('**/observations/new-photo?*', async route => { await opening; await respond(route, 'Observations/Show', { observation: { ...photo, status: 'ready' }, categories: [] }); });
    await page.goto('/library');
    const transition = page.waitForRequest(request => request.url().includes('/observations/new-photo?'));
    await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
    await transition;
    const cancelled = page.waitForEvent('requestfailed', request => request.url().includes('/observations/new-photo?'));
    await page.goBack();
    await cancelled;
    openPhoto();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByText('ダリア', { exact: true })).toHaveCount(1);
    expect(errors).toEqual([]);
});

test('a lookback photo returns to the same place on Home', async ({ page }) => {
    const errors = await setup(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const recent = Array.from({ length: 6 }, (_, n) => ({ ...photo, id: `recent-${n}`, title: `最近 ${n}`, status: 'ready' }));
    await page.route('**/dashboard', route => respond(route, 'Home', {
        stats: { total: 20, today: 0, processing: 0 }, recent,
        lookback: { label: '1年前の発見', observation: { ...photo, status: 'ready' } }, quizAvailable: true, magazine: null,
    }));
    await page.route('**/observations/new-photo*', route => respond(route, 'Observations/Show', { observation: { ...photo, status: 'ready' }, categories: [] }));
    await page.goto('/dashboard');
    const lookback = page.getByRole('link', { name: /1年前の発見/ });
    await lookback.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    expect(scroll).toBeGreaterThan(0);
    await lookback.click();
    await page.getByRole('link', { name: 'ホームへ戻る' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(lookback).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    expect(errors).toEqual([]);
});

for (const recover of [false, true]) {
    test(`failed saved-photo navigation preserves the library position${recover ? ' after manually reopening' : ''}`, async ({ page }) => {
        const errors = await setup(page);
        let healthy = false, posts = 0;
        const records = Array.from({ length: 18 }, (_, n) => ({ ...photo, id: `record-${n}`, title: `記録 ${n}`, status: 'ready' }));
        await page.route('**/library*', route => respond(route, 'Library', { ...library, filters: { q: '植物' }, dateGroups: [{ yearMonth: '2026-09', label: '2026年9月', observations: records }] }));
        await page.route('**/observations', route => { posts++; return route.fulfill({ json: { ...photo, status: 'ready' } }); });
        await page.route('**/observations/new-photo?*', route => healthy
            ? respond(route, 'Observations/Show', { observation: { ...photo, status: 'ready' }, categories: [] })
            : route.fulfill({ status: 503, body: 'Unavailable' }));
        await page.goto('/library?q=%E6%A4%8D%E7%89%A9');
        await page.getByText('記録 17', { exact: true }).scrollIntoViewIfNeeded();
        const scroll = await page.evaluate(() => scrollY);
        expect(scroll).toBeGreaterThan(0);
        await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: tinyPng });
        const recovery = page.getByRole('link', { name: '写真の画面を開く' });
        await expect(recovery).toBeVisible();
        if (recover) {
            healthy = true;
            await recovery.click();
            await expect(page.getByRole('heading', { name: 'ダリア', exact: true })).toBeVisible();
        }
        await page.getByRole('link', { name: '図鑑へ戻る' }).click();
        await expect(page.getByRole('searchbox')).toHaveValue('植物');
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
        expect(posts).toBe(1); expect(errors).toEqual([]);
    });
}
