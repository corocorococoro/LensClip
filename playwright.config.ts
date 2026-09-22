import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: false,
    workers: 1,
    use: {
        baseURL: 'http://127.0.0.1:4174',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                launchOptions: {
                    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
                    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
                },
            },
        },
        { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    ],
    webServer: {
        command: 'npx vite --config tests/browser/vite.config.ts --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174/tests/browser/index.html',
        reuseExistingServer: false,
    },
});
