// Real Chromium + isolated fixtures. No personal profile, server or Telegram access.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'jk-browser-'));
  const errors = [];
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ url: req.url, token: req.headers['x-emby-token'] });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/System/Info')) res.end(JSON.stringify({ ServerName: 'Fixture', Version: '10' }));
    else res.end(JSON.stringify({ Items: [{ Id: 'matrix', Name: 'The Matrix', Type: 'Movie', ProductionYear: 1999,
      ProviderIds: { Imdb: 'tt0133093', Tmdb: '603' } }], TotalRecordCount: 1 }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const extension = path.join(root, 'dist/chrome');
  let context;
  let standalone;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
    });
    context.setDefaultTimeout(10000);
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const popup = await context.newPage(), options = await context.newPage();
    for (const page of [popup, options]) page.on('pageerror', e => errors.push(e.message));
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await options.goto(`chrome-extension://${id}/options.html`);
    await popup.locator('#jellyfin-url').fill(base);
    await popup.locator('#jellyfin-api-key').fill('fixture-key');
    await popup.locator('#test-btn').click();
    await popup.waitForFunction(() => document.getElementById('status').textContent.includes('Fixture'));
    assert.ok(requests.some(r => r.url === '/System/Info' && r.token === 'fixture-key'));
    await Promise.all([
      popup.locator('#jellyfin-api-key').fill('changed-key'),
      options.locator('#telegram-chat-id').fill('fixture-chat'),
      options.locator('#theme-dark').click()
    ]);
    // The service worker handles the real extension messages and serializes writes.
    await options.waitForFunction(async () => {
      const { config } = await chrome.storage.local.get('config');
      return config.jellyfin_api_key === 'changed-key' && config.telegram_chat_id === 'fixture-chat' && config.theme === 'dark';
    });
    await options.locator('#lang-pl').click();
    await popup.waitForFunction(() => document.documentElement.lang === 'pl');
    const film = await context.newPage(); film.on('pageerror', e => errors.push(e.message));
    await film.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<h1>The Matrix</h1><script type="application/ld+json">{"@type":"Movie","name":"The Matrix","datePublished":"1999-03-31"}</script>' }));
    await film.goto('https://www.imdb.com/title/tt0133093/');
    await film.waitForFunction(() => document.getElementById('jellyfin-keeper-badge')?.textContent.includes('Obejrzyj'));
    await film.locator('#jellyfin-keeper-badge button').click();
    assert.equal(await film.locator('#jellyfin-keeper-wrapper').count(), 0);
    console.log('PASS Chromium extension: real storage/messages, two forms, connection test and IMDb badge');

    standalone = await chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const checker = await standalone.newPage(); checker.on('pageerror', e => errors.push(e.message));
    await checker.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<meta property="og:title" content="The Matrix (1999)"><h1>The Matrix</h1>' }));
    await checker.goto('https://www.themoviedb.org/movie/603-the-matrix');
    await checker.evaluate(() => {
      const values = { config: { jellyfin_urls: ['https://fixture.invalid'], jellyfin_api_key: 'dummy', language: 'en' } };
      window.GM_getValue = (key, fallback) => values[key] ?? fallback;
      window.GM_setValue = (key, value) => { values[key] = value; };
      window.GM_registerMenuCommand = (name, fn) => { window.openCheckerSettings = fn; };
      window.GM_xmlhttpRequest = opts => queueMicrotask(() => opts.onload({ status: 200, responseText: JSON.stringify(
        opts.url.includes('/System/Info') ? { ServerName: 'Standalone', Version: '10' } :
          { Items: [{ Id: 'movie', Name: 'The Matrix', Type: 'Movie', ProductionYear: 1999, ProviderIds: { Tmdb: '603' } }] }) }));
    });
    await checker.addScriptTag({ path: path.join(root, 'userscripts/jellyfin-checker.user.js') });
    await checker.waitForFunction(() => document.getElementById('jellyfin-keeper-badge')?.textContent.includes('Watch'));
    await checker.evaluate(() => window.openCheckerSettings());
    await checker.locator('#btn-jk-test-server').click();
    await checker.waitForFunction(() => document.getElementById('jk-status-server').textContent.includes('Standalone'));
    await checker.locator('#btn-jk-close').click();
    assert.equal(await checker.locator('#jk-apikey').count(), 0);
    console.log('PASS Chromium checker userscript: TMDb badge, settings, connection name, modal removal');

    const linker = await standalone.newPage(); linker.on('pageerror', e => errors.push(e.message));
    await linker.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<div class="mainDetailButtons"></div>' }));
    await linker.goto('https://jellyfin.invalid/web/#/details?id=abc');
    await linker.evaluate(() => {
      window.fixtureCalls = [];
      window.ApiClient = { getCurrentUserId: () => 'user', getItem: async (user, id) => {
        window.fixtureCalls.push(id);
        return id === 'abc' ? { Type: 'Episode', SeriesId: 'def' } : { Type: 'Series', Name: 'Show', ProductionYear: 2015, ProviderIds: { Filmweb: '123' } };
      } };
      window.GM_xmlhttpRequest = () => { throw Error('Filmweb must not be queried for a provider ID'); };
    });
    await linker.addScriptTag({ path: path.join(root, 'userscripts/jellyfin-to-filmweb.user.js') });
    await linker.waitForFunction(() => document.querySelector('.btn-filmweb-linker')?.href === 'https://www.filmweb.pl/serial/-123');
    // Trigger unrelated DOM mutations and let the observer's debounce run.
    await linker.evaluate(() => document.body.appendChild(document.createElement('p')));
    await linker.waitForTimeout(300);
    assert.deepEqual(await linker.evaluate(() => window.fixtureCalls), ['abc', 'def']);
    await linker.evaluate(() => { location.hash = '#/home'; });
    await linker.waitForFunction(() => !document.querySelector('.btn-filmweb-linker'));
    console.log('PASS Chromium linker userscript: parent series, observer deduplication and SPA cleanup');
    assert.deepEqual(errors, [], 'uncaught browser errors');
  } finally {
    if (context) await context.close();
    if (standalone) await standalone.close();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
