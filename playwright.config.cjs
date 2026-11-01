const {defineConfig} = require('@playwright/test');
const port = Number(process.env.TEST_PORT || 4173);
const baseURL = 'http://127.0.0.1:' + port;
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 20000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
  use: {baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  projects: [
    {name: 'desktop', use: {browserName: 'chromium', viewport: {width: 1280, height: 900}}},
    {name: 'mobile', use: {browserName: 'chromium', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}},
    {name: 'webkit-updates', testMatch: '**/offline-updates.spec.cjs', use: {browserName: 'webkit', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}}
  ],
  webServer: {command: 'node scripts/serve.cjs', url: baseURL, env: {PORT: String(port)}, reuseExistingServer: false}
});
