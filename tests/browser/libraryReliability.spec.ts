import { expect, test } from '@playwright/test';

const observation = { id: 'one', title: '最初の記録', status: 'ready', thumb_url: null, created_at: '2026-09-01' };
const group = { yearMonth: '2026-09', label: '2026年9月', observations: [observation] };

async function openLibrary(page: import('@playwright/test').Page, processing = false) {
    await page.goto('/tests/browser/index.html');
    await page.waitForFunction(() => 'mountLibrary' in window);
    await page.evaluate(({ group, processing }) => {
        (window as any).mountLibrary({
            observations: { data: [] }, tags: [], filters: {}, viewMode: 'date',
            dateGroups: [{ ...group, observations: group.observations.map((o) => ({ ...o, status: processing ? 'processing' : 'ready' })) }],
            pagination: { hasMore: !processing, nextCursor: processing ? null : 'next' },
        });
    }, { group, processing });
}

test('failed pagination pauses automatic requests and lets the user retry without losing cards', async ({ page }) => {
    let requests = 0;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/library?*', (route) => {
        requests += 1;
        return requests === 1
            ? route.fulfill({ status: 503, body: 'Unavailable' })
            : route.fulfill({ json: { dateGroups: [{ ...group, observations: [{ ...observation, id: 'two', title: '次の記録' }] }], pagination: { hasMore: false, nextCursor: null } } });
    });
    await openLibrary(page);
    await page.getByText('最初の記録', { exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole('alert')).toContainText('続きの記録を読み込めませんでした');
    await page.waitForTimeout(600);
    expect(requests).toBe(1);
    await page.getByRole('button', { name: '再試行', exact: true }).click();
    await expect(page.getByText('次の記録', { exact: true })).toBeVisible();
    await expect(page.getByText('最初の記録', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(requests).toBe(2);
    expect(errors).toEqual([]);
});

test('status failure has a recovery action and never changes the card to analysis failed', async ({ page }) => {
    let healthy = false;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/observations/statuses?*', (route) => healthy
        ? route.fulfill({ json: { observations: [{ ...observation, title: '完成した記録' }] } })
        : route.fulfill({ status: 503, body: 'Unavailable' }));
    await openLibrary(page, true);
    await expect(page.getByRole('alert')).toContainText('分析状況を確認できませんでした');
    await expect(page.getByText('調べています', { exact: true })).toBeVisible();
    healthy = true;
    await page.getByRole('button', { name: '状態を再確認' }).click();
    await expect(page.getByText('完成した記録', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
});
