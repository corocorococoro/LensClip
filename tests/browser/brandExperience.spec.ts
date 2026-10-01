import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';

const user = { id: 1, name: 'Test', role: 'user' };
const photo = { id: 'flower', title: 'ひまわり', status: 'ready', thumb_url: '/images/lp/sunflower.webp', original_url: '/images/lp/sunflower.webp', image_url: '/images/lp/sunflower.webp', created_at: '2026-09-01', date: '9月1日', category: 'plant', milestones: [], description: 'きいろい はなびらが ならんでいるね。', kid_friendly: 'きいろい はなびらが ならんでいるね。' };
const paths: Record<string, string> = { dashboard: '/dashboard', register: '/register', login: '/login', terms: '/terms', 'privacy-policy': '/privacy-policy', 'auth.google.redirect': '/auth/google', 'password.request': '/forgot-password' };

async function respond(route: Route, component: string, props: object, signedIn = true) {
    const url = new URL(route.request().url());
    const payload = { component, props: { auth: { user: signedIn ? user : null }, errors: {}, ...props }, url: url.pathname + url.search, version: 'brand', clearHistory: false, encryptHistory: false };
    if (route.request().headers()['x-inertia']) return route.fulfill({ headers: { 'X-Inertia': 'true' }, json: payload });
    const manifest = JSON.parse(readFileSync('public/build/manifest.json', 'utf8'))['resources/js/app.tsx'];
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${manifest.css.map((css: string) => `<link rel="stylesheet" href="/build/${css}">`).join('')}</head><body><div id="app" data-page="${JSON.stringify(payload).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div><script type="module" src="/build/${manifest.file}"></script></body></html>` });
}

async function setup(page: Page, signedIn = false) {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(paths => {
        (window as any).route = (name: string) => {
            if (!paths[name]) throw new Error(`Unknown route: ${name}`);
            return paths[name];
        };
    }, paths);
    // Optional local font for environments without Japanese system fonts. CI uses Playwright's fonts.
    if (process.env.PLAYWRIGHT_JAPANESE_FONT_PATH) {
        const data = readFileSync(process.env.PLAYWRIGHT_JAPANESE_FONT_PATH).toString('base64');
        await page.addInitScript(async data => {
            const font = new FontFace('Noto Sans JP', `url(data:font/woff2;base64,${data})`);
            document.fonts.add(await font.load());
        }, data);
    }
    await page.route('**/', route => respond(route, 'Welcome', {}, signedIn));
    await page.route('**/register', route => respond(route, 'Auth/Register', {}, false));
    await page.route('**/login', route => respond(route, 'Auth/Login', { canResetPassword: true }, false));
    await page.route('**/forgot-password', route => respond(route, 'Auth/ForgotPassword', {}, false));
    await page.route('**/dashboard', route => respond(route, 'Home', {
        stats: { total: 3, today: 0, processing: 0 }, recent: [photo], lookback: null, quizAvailable: true,
        magazine: { yearMonth: '2026-09', label: '2026年9月', count: 3 },
    }));
    await page.route('**/library', route => respond(route, 'Library', { observations: { data: [] }, tags: [], filters: {}, dateGroups: [], categories: [], pagination: { hasMore: false, nextCursor: null } }));
    return errors;
}

for (const width of [320, 390, 768, 1280]) {
    test(`landing page at ${width}px keeps images, registration, and login usable`, async ({ page }, testInfo) => {
        const errors = await setup(page);
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page).toHaveTitle('LensClip｜写真でつくる、親子の図鑑');
        for (const heading of await page.getByRole('heading', { level: 2 }).all()) await heading.scrollIntoViewIfNeeded();
        await expect.poll(() => page.locator('main img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`landing-hero-${width}.png`) });
        await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
        await page.getByRole('link', { name: '親子の図鑑をはじめる', exact: true }).first().click();
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole('textbox', { name: '名前', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'ログイン', exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'パスワードを忘れた方' }).click();
        await expect(page).toHaveURL(/\/forgot-password$/);
        await expect(page.getByRole('textbox', { name: 'メールアドレス', exact: true })).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test('signed-in landing returns to Home and accommodates enlarged text', async ({ page }, testInfo) => {
    const errors = await setup(page, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await expect(page.getByRole('link', { name: '親子の図鑑をはじめる', exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('landing-large-text.png') });
    const overflowing = await page.locator('body *').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 40) })).slice(0, 10));
    expect(overflowing).toEqual([]);
    await page.getByRole('link', { name: 'ホームへ', exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: '図鑑', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
});

test('Home quiz entry opens photos, reveals answers, and returns to the guide', async ({ page }, testInfo) => {
    const errors = await setup(page, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/quiz', route => respond(route, 'Quiz', { questions: [photo, { ...photo, id: 'two' }, { ...photo, id: 'three' }], eligibleCount: 3, categories: [], filters: { category: null } }));
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /これ、なんだっけ/ }).click();
    await expect(page.getByRole('heading', { name: '発見クイズ', exact: true })).toBeVisible();
    for (let index = 0; index < 3; index++) {
        await page.getByRole('button', { name: /これ、なんだっけ/ }).click();
        await expect(page.getByText(photo.kid_friendly, { exact: true })).toBeVisible();
        if (index === 0) {
            await page.getByRole('button', { name: 'おぼえてた！' }).click();
            await expect(page.getByText('おぼえてたね！')).toBeVisible();
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: testInfo.outputPath('quiz-answer-mobile.png'), fullPage: true });
        }
        await page.getByRole('button', { name: index === 2 ? '終わる' : '次の写真へ', exact: true }).click();
    }
    await expect(page.getByText('図鑑の写真を3件見返しました。')).toBeVisible();
    await page.getByRole('link', { name: '図鑑を見る', exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    expect(errors).toEqual([]);
});

for (const isCurrentMonth of [true, false]) {
    test(`monthly guide keeps reading and printing usable (current month: ${isCurrentMonth})`, async ({ page }, testInfo) => {
        const errors = await setup(page, true);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(() => { (window as any).printCalls = 0; window.print = () => { (window as any).printCalls++; }; });
        await page.route('**/magazine/2026-09', route => respond(route, 'Magazine/Show', {
            yearMonth: '2026-09', label: '2026年9月', isCurrentMonth, isEmpty: false, cover: photo, entries: [photo], categoryBreakdown: [], processingCount: 1, totalReadyCount: 3, categories: [],
        }));
        await page.goto('/dashboard');
        await page.getByRole('link', { name: /2026年9月号/ }).click();
        await expect(page.getByRole('heading', { name: '月刊図鑑 2026年9月号' })).toBeVisible();
        await expect(page.getByText('今月の発見を追加中', { exact: true })).toHaveCount(isCurrentMonth ? 1 : 0);
        await expect(page.getByText('調べている写真1件は、まだ載っていません。')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole('button', { name: '図鑑を印刷', exact: true }).click();
        expect(await page.evaluate(() => (window as any).printCalls)).toBe(1);
        await page.emulateMedia({ media: 'print' });
        await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toBeHidden();
        await expect(page.getByRole('button', { name: '図鑑を印刷', exact: true })).toBeHidden();
        await expect(page.getByRole('heading', { name: '月刊図鑑 2026年9月号' })).toBeVisible();
        if (isCurrentMonth) await page.screenshot({ path: testInfo.outputPath('magazine-print.png'), fullPage: true });
        expect(errors).toEqual([]);
    });
}

test('empty quiz explains eligibility without treating processing photos as playable', async ({ page }) => {
    const errors = await setup(page, true);
    await page.route('**/quiz', route => respond(route, 'Quiz', { questions: [], eligibleCount: 2, categories: [], filters: { category: null } }));
    await page.goto('/quiz');
    await expect(page.getByText('名前がついた、調べ終わった写真が3件たまると遊べます。')).toBeVisible();
    await expect(page.getByRole('button', { name: /これ、なんだっけ/ })).toHaveCount(0);
    await page.getByRole('link', { name: 'ホームへ戻る', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(errors).toEqual([]);
});
