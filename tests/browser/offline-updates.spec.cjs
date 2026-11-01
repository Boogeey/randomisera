const {test, expect} = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {build} = require('../../scripts/build-site.cjs');
const root = path.resolve(__dirname, '../..');
let fixtureRoot, releases;
test.describe.configure({mode: 'serial'});

async function release(label) {
  const dir = path.join(fixtureRoot, label);
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const files = JSON.parse(worker.match(/const FILES = (\[[\s\S]*?\]);/)[1]);
  for (const url of files) {
    const file = url.endsWith('/') ? url + 'index.html' : url;
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(root, file), target);
  }
  fs.cpSync(path.join(root, 'templates'), path.join(dir, 'templates'), {recursive: true});
  for (const file of fs.readdirSync(path.join(root, 'assets')).filter(file => file.endsWith('.js'))) {
    fs.copyFileSync(path.join(root, 'assets', file), path.join(dir, 'assets', file));
  }
  fs.writeFileSync(path.join(dir, 'sw.js'), worker);
  fs.appendFileSync(path.join(dir, 'assets/pwa.js'), '\nwindow.__offlineTestRelease = ' + JSON.stringify(label) + ';');
  fs.appendFileSync(path.join(dir, 'assets/app.js'), '\nwindow.__offlineTestToolRelease = ' + JSON.stringify(label) + ';');
  const result = await build(dir);
  const bytes = new Map(files.map(url => {
    const file = url.endsWith('/') ? url + 'index.html' : url;
    return ['/' + url.replace(/^\.\//, ''), fs.readFileSync(path.join(result.output, file))];
  }));
  bytes.set('/sw.js', fs.readFileSync(path.join(result.output, 'sw.js')));
  return {bytes, version: result.cache};
}

test.beforeAll(async () => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'randomisera-upgrade-'));
  releases = {A: await release('A'), B: await release('B')};
});
test.afterAll(() => {
  const resolved = path.resolve(fixtureRoot);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'randomisera-upgrade-')) throw Error('Unsafe fixture cleanup');
  fs.rmSync(resolved, {recursive: true, force: true});
});

async function host() {
  const state = {release: 'A', corrupt: false, fail: false};
  const server = http.createServer((request, response) => {
    let pathname = new URL(request.url, 'http://localhost').pathname.replace(/index\.html$/, '');
    if (pathname === '/monitor') {
      response.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
      response.end('<!doctype html><title>Update test observer</title>'); return;
    }
    pathname = pathname.replace(/^\/site\//, '/');
    const bytes = releases[state.release].bytes.get(pathname);
    if (!bytes) {response.writeHead(404); response.end(); return;}
    if (pathname === '/assets/app.js' && state.fail) {response.writeHead(503); response.end(); return;}
    const type = pathname.endsWith('.js') ? 'application/javascript' : pathname.endsWith('.css') ? 'text/css' : pathname.endsWith('.webmanifest') ? 'application/manifest+json' : pathname.endsWith('.png') ? 'image/png' : 'text/html';
    response.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
    response.end(pathname === '/assets/app.js' && state.corrupt ? Buffer.concat([bytes, Buffer.from('\n// wrong release bytes')]) : bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {state, url: 'http://127.0.0.1:' + server.address().port + '/site', close: () => new Promise(resolve => server.close(resolve))};
}

function newContext(browser) {
  const {viewport, isMobile, hasTouch} = test.info().project.use;
  return browser.newContext({viewport, isMobile, hasTouch});
}

async function install(page, origin) {
  await page.goto(origin + '/app/');
  await page.locator('#offline-settings > summary').click();
  await page.locator('#enable-offline').click();
  await expect(page.locator('#offline-info')).toHaveText('Tillgänglig offline på den här enheten.');
  await page.reload();
  expect(await page.evaluate(() => window.__offlineTestRelease)).toBe('A');
}

async function check(page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
    if (reg.installing) await new Promise(resolve => {
      const worker = reg.installing;
      const done = () => {if (['installed', 'redundant'].includes(worker.state)) resolve();};
      worker.addEventListener('statechange', done); done();
    });
  });
}

test('two open windows retain A until both close; B then works offline and preserves lists', async ({browser}) => {
  const site = await host(), context = await newContext(browser);
  try {
    const first = await context.newPage(); await install(first, site.url);
    const saved = JSON.stringify({version: 1, lists: [{name: 'Behåll', entries: ['Anna', 'Bo']}]});
    await first.evaluate(value => localStorage.setItem('randomisera-saved-lists-v1', value), saved);
    const second = await context.newPage(); await second.goto(site.url + '/');
    await second.locator('#entries').fill('Anna\nBo'); await second.locator('#submit').click();
    const result = await second.locator('#output').textContent();
    site.state.release = 'B'; await check(first);
    await expect(first.locator('#update-status')).toContainText('väntar');
    await expect(first.locator('.update-notice')).toBeVisible();
    await expect(second.locator('.update-notice')).toBeHidden();
    await expect(second.locator('#output')).toHaveText(result);
    expect(await second.evaluate(() => window.__offlineTestRelease)).toBe('A');
    await first.reload(); expect(await first.evaluate(() => window.__offlineTestRelease)).toBe('A');
    await first.close();
    await second.reload(); expect(await second.evaluate(() => window.__offlineTestRelease)).toBe('A');
    await expect(second.locator('.update-notice')).toBeVisible();
    // Observe from the same origin but outside the worker's scope, so this
    // page neither blocks activation nor needs Chromium-only worker APIs.
    const monitor = await context.newPage(); await monitor.goto(new URL('/monitor', site.url).href);
    await monitor.evaluate(async scope => {
      const reg = await navigator.serviceWorker.getRegistration(scope), worker = reg.waiting;
      window.activation = new Promise(resolve => {
        const check = () => {if (worker.state === 'activated') resolve(true);};
        worker.addEventListener('statechange', check); check();
      });
    }, site.url + '/');
    await second.close(); await monitor.evaluate(() => window.activation); await monitor.close();
    await context.setOffline(true);
    const updated = await context.newPage(); await updated.goto(site.url + '/');
    expect(await updated.evaluate(() => window.__offlineTestRelease)).toBe('B');
    expect(await updated.evaluate(() => localStorage.getItem('randomisera-saved-lists-v1'))).toBe(saved);
    await updated.goto(site.url + '/app/');
    await expect(updated.locator('#offline-version')).toContainText(releases.B.version.replace('randomisera-offline-', ''));
  } finally {await context.close(); await site.close();}
});

for (const failure of ['fail', 'corrupt']) {
  test('an ' + failure + ' download cannot replace working release A', async ({browser}) => {
    const site = await host(), context = await newContext(browser);
    try {
      const page = await context.newPage(); await install(page, site.url);
      site.state.release = 'B'; site.state[failure] = true; await check(page);
      expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting)).toBe(false);
      await context.setOffline(true); await page.reload();
      expect(await page.evaluate(() => window.__offlineTestRelease)).toBe('A');
    } finally {await context.close(); await site.close();}
  });
}

test('missing A script cannot fetch B or repair A with B bytes', async ({browser}) => {
  const site = await host(), context = await newContext(browser);
  try {
    const page = await context.newPage(); await install(page, site.url);
    site.state.release = 'B';
    const result = await page.evaluate(async version => {
      const script = new URL('../assets/app.js', location.href).href;
      const cache = await caches.open(version); await cache.delete(script);
      const response = await fetch(script);
      const reg = await navigator.serviceWorker.getRegistration();
      const status = await new Promise(resolve => {
        const channel = new MessageChannel(); channel.port1.onmessage = event => {channel.port1.close(); resolve(event.data);};
        reg.active.postMessage({type: 'PREPARE_OFFLINE'}, [channel.port2]);
      });
      return {status: response.status, ready: status.ready, cached: !!await cache.match(script)};
    }, releases.A.version);
    expect(result).toEqual({status: 503, ready: false, cached: false});
    expect(await page.evaluate(() => window.__offlineTestRelease)).toBe('A');
    await check(page);
    await expect(page.locator('#update-status')).toContainText('väntar');
  } finally {await context.close(); await site.close();}
});
