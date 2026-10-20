const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = file => fs.readFileSync(new URL(`../${file}`, `file://${__filename}`), 'utf8');
const json = value => JSON.parse(JSON.stringify(value));
const response = (Items = [], status = 200) => ({ ok: status === 200, status, json: async () => ({ Items }) });
const movie = { Id: 'matrix', Name: 'Matrix', ProductionYear: 1999 };
const metadata = { title: 'Matrix', year: 1999, type: 'movie' };
const config = { jellyfin_urls: ['https://local.invalid', 'https://remote.invalid'], jellyfin_api_key: 'test-key', language: 'en' };
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};

function harness(file, initial = config) {
  let stored = structuredClone(initial);
  const elements = new Map();
  const listeners = new Map();
  const storageListeners = [];
  const gmValues = new Map();
  class Element {
    constructor() {
      this.children = [];
      this.events = {};
      this.style = {};
      this.value = '';
      this.classList = { toggle() {}, add() {}, remove() {} };
    }
    appendChild(child) { this.children.push(child); child.parent = this; }
    remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
    addEventListener(name, fn) { this.events[name] = fn; }
    setAttribute() {}
    removeAttribute() {}
  }
  const body = new Element();
  const document = {
    body,
    documentElement: new Element(),
    createElement: () => new Element(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    querySelector(selector) {
      if (selector.startsWith('[data-i18n=')) return document.getElementById(selector);
      return null;
    },
    querySelectorAll: () => [],
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  const ctx = {
    console: { log() {}, warn() {}, debug() {}, error() {} }, AbortSignal, URL,
    setTimeout, clearTimeout, setInterval() {}, document,
    navigator: { language: 'en' },
    window: { location: { href: 'https://unsupported.invalid/', pathname: '/' }, addEventListener() {}, open() {} },
    history: {},
    MutationObserver: class { constructor(fn) { this.fn = fn; ctx.observer = this; } observe() {} disconnect() { this.disconnected = true; } },
    chrome: {
      runtime: { onInstalled: { addListener() {} }, onMessage: { addListener(fn) { ctx.messageHandler = fn; } }, getURL: path => `extension://${path}`, sendMessage: async () => undefined },
      storage: { onChanged: { addListener(fn) { storageListeners.push(fn); } }, local: {
        get(key, cb) { const result = { config: structuredClone(stored) }; if (cb) cb(result); else return Promise.resolve(result); },
        set(value, cb) {
          const oldValue = stored;
          stored = structuredClone(value.config);
          if (JSON.stringify(oldValue) !== JSON.stringify(stored)) {
            for (const listener of storageListeners) listener({ config: { oldValue, newValue: stored } }, 'local');
          }
          if (cb) cb(); return Promise.resolve();
        }
      } }
    },
    GM_getValue: (key, fallback) => key === 'config' ? structuredClone(stored) : (gmValues.get(key) ?? fallback),
    GM_setValue(key, value) { if (key === 'config') stored = structuredClone(value); else gmValues.set(key, structuredClone(value)); }, GM_registerMenuCommand() {}
  };
  vm.createContext(ctx);
  if (['src/popup.js', 'src/options.js'].includes(file)) {
    vm.runInContext(source('src/background.js'), ctx);
    ctx.chrome.runtime.sendMessage = message => new Promise(resolve => ctx.messageHandler(message, { url: 'extension://settings.html' }, resolve));
    vm.runInContext(source('src/settings.js'), ctx);
  }
  let code = source(file);
  if (file.startsWith('userscripts/')) {
    code = code.replace('  // Initial load\n  run();', '  globalThis.api = { handleSearch, waitForElement, requestAdd, showBadge, run, detectSite, extractFilmweb, extractFilmwebPerson, extractIMDB, extractIMDBPerson, extractTMDB, extractTMDBPerson, getConfig, saveConfig, getCachedResult, setCachedResult, titleSimilarMatch, testConnection };');
  }
  vm.runInContext(code, ctx, { filename: file });
  return { ctx, elements, listeners, get stored() { return stored; } };
}

function background(initial) { return harness('src/background.js', initial); }

test('empty original title cannot accept an unrelated movie; valid title and provider ID still match', async () => {
  const { ctx } = background();
  for (const [a, b] of [['', 'matrix'], ['matrix', ''], ['', '']]) assert.equal(ctx.titleSimilarMatch(a, b), false);
  ctx.fetch = async () => response([{ Id: 'wrong', Name: 'Unrelated movie', ProductionYear: 1999 }]);
  assert.equal(await ctx.searchByTitle('https://local.invalid', {}, 'Matrix', 1999), null);
  ctx.fetch = async () => response([{ Name: 'Different title', ProviderIds: { Imdb: 'tt0133093' } }]);
  assert.equal((await ctx.searchByTitle('https://local.invalid', {}, 'Matrix', 1999, 'tt0133093')).Name, 'Different title');
  assert.equal(ctx.titleSimilarMatch('the matrix', 'matrix'), true);
  assert.equal(ctx.titleSimilarMatch('matrx', 'matrix'), true);
});

test('network failures, rejected authentication, and malformed responses are errors, not missing movies', async () => {
  const { ctx } = background();
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => response([], 401), async () => ({ ok: true, json: async () => ({}) })]) {
    ctx.fetch = fetcher;
    const result = await ctx.handleSearch(metadata);
    assert.equal(result.found, false);
    assert.ok(result.error);
  }
});

test('fallback address can find an item after a failure or empty response', async () => {
  const { ctx } = background();
  for (const first of [() => { throw new Error('offline'); }, () => response()]) {
    ctx.fetch = async url => url.startsWith('https://local.invalid') ? first() : response([movie]);
    const result = await ctx.handleSearch(metadata);
    assert.equal(result.found, true);
    assert.ok(result.jellyfinURL.startsWith('https://remote.invalid/'));
  }
});

test('a completed empty search establishes absence even if another address fails', async () => {
  const { ctx } = background();
  ctx.fetch = async url => { if (url.startsWith('https://local.invalid')) throw new Error('offline'); return response(); };
  assert.deepEqual(json(await ctx.handleSearch(metadata)), { found: false });
});

test('original title fallback is searched and a failed fallback does not establish absence', async () => {
  const { ctx } = background({ ...config, jellyfin_urls: [config.jellyfin_urls[0]] });
  ctx.fetch = async url => new URL(url).searchParams.get('SearchTerm') === 'Matrix' ? response([movie]) : response();
  assert.equal((await ctx.handleSearch({ ...metadata, title: 'Macierz', originalTitle: 'Matrix' })).found, true);
  ctx.fetch = async url => { if (new URL(url).searchParams.get('SearchTerm') === 'Matrix') throw new Error('offline'); return response(); };
  assert.ok((await ctx.handleSearch({ ...metadata, title: 'Macierz', originalTitle: 'Matrix' })).error);
});

test('person search distinguishes rejected credentials from absence and uses fallback addresses', async () => {
  const { ctx } = background();
  ctx.fetch = async () => response([], 403);
  assert.ok((await ctx.handleSearch({ type: 'person', title: 'Actor' })).error);
  ctx.fetch = async url => url.startsWith('https://local.invalid') ? response() : response([movie]);
  assert.equal((await ctx.handleSearch({ type: 'person', title: 'Actor' })).count, 1);
});

test('empty address list requests configuration without making a network request', async () => {
  const { ctx } = background({ ...config, jellyfin_urls: [] });
  ctx.fetch = () => { throw new Error('must not fetch'); };
  assert.equal((await ctx.handleSearch(metadata)).configMissing, true);
});

test('connection test never uses public reachability as proof that credentials work', async () => {
  const { ctx } = background();
  const calls = [];
  ctx.fetch = async (url, opts) => { calls.push({ url, headers: opts?.headers }); return response([], 401); };
  assert.equal((await ctx.testConnection('https://local.invalid', 'wrong')).success, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://local.invalid/System/Info');
  assert.match(calls[0].headers?.Authorization || '', /MediaBrowser .*Token="wrong"/);
  assert.equal(calls[0].headers?.['X-Emby-Token'], 'wrong');
});

test('bundled defaults load on installation, existing settings survive updates and legacy URLs migrate', async () => {
  const h = background(undefined);
  // A genuinely fresh install has no saved configuration.
  await h.ctx.chrome.storage.local.set({ config: {} });
  let fetchCount = 0;
  h.ctx.fetch = async () => { fetchCount++; return { ok: true, json: async () => ({ jellyfin_urls: ['https://family.invalid'], jellyfin_api_key: 'bundled' }) }; };
  await h.ctx.initializeConfig({ reason: 'install' });
  assert.equal(h.stored.jellyfin_api_key, 'bundled');
  assert.deepEqual(h.stored.jellyfin_urls, ['https://family.invalid']);
  await h.ctx.chrome.storage.local.set({ config: { theme: 'dark', jellyfin_api_key: 'saved', jellyfin_url: 'https://old.invalid' } });
  await h.ctx.initializeConfig({ reason: 'update' });
  assert.equal(fetchCount, 1);
  assert.equal(h.stored.theme, 'dark');
  assert.equal(h.stored.jellyfin_api_key, 'saved');
  assert.deepEqual(h.stored.jellyfin_urls, ['https://old.invalid']);
  assert.equal(h.stored.jellyfin_url, undefined);
});

test('failed bundled configuration falls back to safe defaults', async () => {
  const h = background({});
  h.ctx.fetch = async () => { throw new Error('missing file'); };
  await h.ctx.initializeConfig({ reason: 'install' });
  assert.equal(h.stored.jellyfin_api_key, '');
  assert.deepEqual(h.stored.jellyfin_urls, ['http://localhost:8096']);
});

for (const file of ['src/background.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: Telegram preserves punctuation as plain text without making a real request`, async () => {
    const { ctx } = harness(file, { ...config, telegram_bot_token: 'test-token', telegram_chat_id: 'test-chat' });
    let body;
    const mock = async (url, opts) => { body = JSON.parse(opts.body); return { json: async () => ({ ok: true }) }; };
    ctx.fetch = mock;
    ctx.GM_xmlhttpRequest = opts => { body = JSON.parse(opts.data); opts.onload({ status: 200, responseText: '{"ok":true}' }); };
    const meta = { ...metadata, title: '[REC] * _ (test)' };
    const result = ctx.api ? await ctx.api.requestAdd(meta, ctx.GM_getValue('config'), 'https://source.invalid/') : await ctx.requestAdd(meta, 'https://source.invalid/');
    assert.equal(result.ok, true);
    assert.equal(body.parse_mode, undefined);
    assert.ok(body.text.includes(meta.title));
    assert.ok(body.text.includes('https://source.invalid/'));
  });
}

test('standalone search checks later servers after an empty response', async () => {
  const { ctx } = harness('userscripts/jellyfin-checker.user.js');
  ctx.GM_xmlhttpRequest = opts => opts.onload({ status: 200, responseText: JSON.stringify({ Items: opts.url.startsWith('https://remote.invalid') ? [movie] : [] }) });
  assert.equal((await ctx.api.handleSearch(metadata, config)).found, true);
  ctx.GM_xmlhttpRequest = opts => opts.onload({ status: 401, responseText: '{}' });
  assert.ok((await ctx.api.handleSearch(metadata, config)).error);
});

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: element wait times out without mutations and disconnects the observer`, async () => {
    const { ctx } = harness(file);
    const wait = ctx.api?.waitForElement || ctx.waitForElement;
    assert.equal(await wait('h1', 5), null);
    assert.equal(ctx.observer.disconnected, true);
  });

  test(`${file}: closing the badge removes its request button too`, () => {
    const { ctx } = harness(file);
    (ctx.api?.showBadge || ctx.showBadge)('Missing', null, '#000', true, metadata);
    const wrapper = ctx.document.body.children[0];
    assert.equal(wrapper.children.length, 2);
    const badge = wrapper.children[0];
    badge.children.at(-1).events.click({ stopPropagation() {} });
    assert.equal(ctx.document.body.children.length, 0);
  });
}

test('SPA: late responses and earlier runs of the same URL cannot replace the current badge', async () => {
  const { ctx } = harness('src/content.js');
  const pending = [];
  const badges = [];
  ctx.detectSite = () => ({ name: 'tmdb', id: '1', type: 'movie' });
  ctx.extractTMDB = () => metadata;
  ctx.showBadge = (...args) => badges.push(args);
  ctx.chrome.runtime.sendMessage = () => { const d = deferred(); pending.push(d); return d.promise; };
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  ctx.window.location.href = 'https://themoviedb.org/movie/1';
  const old = ctx.runCheck();
  await flush();
  ctx.window.location.href = 'https://themoviedb.org/movie/2';
  const current = ctx.runCheck();
  await flush();
  pending[1].resolve({ found: true, jellyfinURL: 'https://server.invalid/current' });
  await current;
  pending[0].resolve({ found: true, jellyfinURL: 'https://server.invalid/old' });
  await old;
  assert.equal(badges.at(-1)[1], 'https://server.invalid/current');
  assert.equal(badges.some(b => b[1] === 'https://server.invalid/old'), false);
  const earlier = ctx.runCheck(); await flush();
  const later = ctx.runCheck(); await flush();
  pending[3].resolve({ found: false }); await later;
  pending[2].resolve({ found: true, jellyfinURL: 'https://server.invalid/obsolete' }); await earlier;
  assert.equal(badges.at(-1)[0], 'Not on Jellyfin');
});

for (const file of ['src/options.js', 'src/popup.js']) {
  test(`${file}: failed test messages restore controls and show errors`, async () => {
    const h = harness(file, { ...config, theme: 'dark' });
    // Status timers aren't relevant to the control restoration check.
    h.ctx.setTimeout = () => 0;
    await h.listeners.get('DOMContentLoaded')();
    h.ctx.chrome.runtime.sendMessage = async () => { throw new Error('No receiver'); };
    for (const id of ['test-btn', 'test-tg-btn']) {
      await h.elements.get(id).events.click();
      assert.equal(h.elements.get(id).disabled, false);
    }
    const status = h.elements.get(file.endsWith('options.js') ? 'status-jf' : 'status');
    assert.ok(status.textContent.includes('No receiver'));
    assert.ok(h.elements.get('status-tg').textContent.includes('No receiver'));
    h.ctx.chrome.runtime.sendMessage = async () => undefined;
    await h.elements.get('test-tg-btn').events.click();
    assert.ok(h.elements.get('status-tg').textContent.includes('No response'));
  });
}

test('saving full options retains the theme and unknown settings', async () => {
  const h = harness('src/options.js', { ...config, theme: 'dark', futureSetting: 'preserve' });
  h.ctx.setTimeout = () => 0;
  await h.listeners.get('DOMContentLoaded')();
  await h.elements.get('save-btn').events.click();
  assert.equal(h.stored.theme, 'dark');
  assert.equal(h.stored.futureSetting, 'preserve');
});

test('standalone SPA: an older result cannot replace the badge or enter the cache after navigation', async () => {
  const { ctx } = harness('userscripts/jellyfin-checker.user.js');
  const pending = [];
  const cacheWrites = [];
  ctx.GM_xmlhttpRequest = opts => pending.push(opts);
  ctx.GM_setValue = (key, value) => { if (key === 'search_cache_data') cacheWrites.push(value); };
  ctx.document.getElementById('__NEXT_DATA__').textContent = JSON.stringify({ props: { pageProps: { movie: { title: 'Matrix', release_date: '1999-01-01' } } } });
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  ctx.window.location.href = 'https://themoviedb.org/movie/1';
  const old = ctx.api.run(true); await flush();
  ctx.window.location.href = 'https://themoviedb.org/movie/2';
  const current = ctx.api.run(true); await flush();
  pending[1].onload({ status: 200, responseText: JSON.stringify({ Items: [movie] }) });
  await current;
  const count = cacheWrites.length;
  const wrapper = ctx.document.body.children.at(-1);
  pending[0].onload({ status: 200, responseText: JSON.stringify({ Items: [{ ...movie, Id: 'obsolete' }] }) });
  await old;
  assert.equal(cacheWrites.length, count);
  assert.equal(ctx.document.body.children.at(-1), wrapper);
});

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: successful element wait disconnects and clears its timeout`, async () => {
    const { ctx } = harness(file);
    let timerCallback;
    let cleared = false;
    ctx.setTimeout = callback => { timerCallback = callback; return 123; };
    ctx.clearTimeout = id => { cleared = id === 123; };
    const result = (ctx.api?.waitForElement || ctx.waitForElement)('h1', 50);
    const heading = {};
    ctx.document.querySelector = () => heading;
    ctx.observer.fn();
    assert.equal(await result, heading);
    assert.equal(ctx.observer.disconnected, true);
    assert.equal(cleared, true);
    assert.equal(typeof timerCallback, 'function');
  });
}

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: Filmweb badge allows main cards and series seasons/episodes while excluding unrelated subpages`, async () => {
    const { ctx } = harness(file);
    const detect = ctx.api?.detectSite || ctx.detectSite;
    for (const host of ['filmweb.pl', 'www.filmweb.pl']) {
      for (const [path, name, id] of [
        ['/film/Matrix-1999-628', 'filmweb', '628'],
        ['/serial/Dark-2017-771383/', 'filmweb', '771383'],
        ['/serial/Dark-2017-771383/season/1', 'filmweb', '771383'],
        ['/serial/Dark-2017-771383/season/2/?ref=series#episodes', 'filmweb', '771383'],
        ['/serial/We+Can+Be+Heroes-2005-556943/episode/1/1', 'filmweb', '556943'],
        ['/serial/Dark-2017-771383/episode/1', 'filmweb', '771383'],
        ['/person/Keanu+Reeves-87?ref=search#bio', 'filmweb-person', '87']
      ]) {
        ctx.window.location.href = `https://${host}${path}`;
        assert.deepEqual(json(detect()), { name, id });
      }
    }
    let requests = 0;
    ctx.chrome.runtime.sendMessage = async () => { requests++; };
    ctx.GM_xmlhttpRequest = () => { requests++; };
    ctx.fetch = async () => { requests++; };
    for (const path of [
      '/', '/news', '/news/Matrix-123456', '/ranking/film', '/search', '/film',
      '/film/Matrix', '/film/Matrix-1999-628/discussion', '/film/Matrix-1999-628/cast',
      '/serial/Dark-2017-771383/episode/ranking', '/serial/Dark-2017-771383/season/1/discussion',
      '/serial/Dark-2017-771383/season/invalid', '/film/Matrix-1999-628/season/1',
      '/film/Matrix-1999-628/episode/1/1',
      '/person/Keanu+Reeves-87/season/1',
      '/person/Keanu+Reeves-87/filmography',
      '/news?redirect=imdb.com/title/tt0133093', '/search?url=https://filmweb.pl/film/Matrix-1999-628'
    ]) {
      ctx.window.location.href = `https://www.filmweb.pl${path}`;
      assert.equal(detect(), null, path);
      await (ctx.api?.run || ctx.runCheck)();
    }
    assert.equal(requests, 0);
  });
}

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: a season or episode uses the parent series ID, title and premiere year`, async () => {
    const { ctx } = harness(file);
    for (const href of [
      'https://www.filmweb.pl/serial/Dark-2017-771383/season/3',
      'https://www.filmweb.pl/serial/Dark-2017-771383/episode/3/1'
    ]) {
      ctx.window.location.href = href;
      ctx.window.location.pathname = new URL(ctx.window.location.href).pathname;
      const urls = [];
      ctx.fetch = async url => {
        urls.push(url);
        return { ok: true, json: async () => ({ title: 'Dark', originalTitle: 'Dark', year: 2017 }) };
      };
      ctx.GM_xmlhttpRequest = opts => {
        urls.push(opts.url);
        opts.onload({ status: 200, responseText: JSON.stringify({ title: 'Dark', originalTitle: 'Dark', year: 2017 }) });
      };
      const site = (ctx.api?.detectSite || ctx.detectSite)();
      const result = await (ctx.api?.extractFilmweb || ctx.extractFilmweb)(site.id);
      assert.deepEqual(urls, ['https://www.filmweb.pl/api/v1/serial/771383/info']);
      assert.equal(result.title, 'Dark');
      assert.equal(result.year, 2017);
      assert.equal(result.type, 'tv');
      assert.equal(result.filmwebId, '771383');
    }
  });
}

for (const file of ['src/background.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: media type and conflicting provider IDs reject false positives`, async () => {
    const { ctx } = harness(file);
    const urls = [];
    let items;
    ctx.fetch = async url => { urls.push(url); return response(items); };
    ctx.GM_xmlhttpRequest = opts => { urls.push(opts.url); opts.onload({ status: 200, responseText: JSON.stringify({ Items: items }) }); };
    const search = params => ctx.api ? ctx.api.handleSearch(params, config) : ctx.handleSearch(params);
    const params = { ...metadata, imdbId: 'tt0133093', tmdbId: '603' };
    for (const item of [
      { ...movie, Type: 'Series', ProviderIds: { Imdb: params.imdbId, Tmdb: '603' } },
      { ...movie, Type: 'Movie', ProviderIds: { Imdb: 'tt99999' } },
      { ...movie, Type: 'Movie', ProviderIds: { Imdb: params.imdbId, Tmdb: '999' } }
    ]) {
      items = [item];
      assert.equal((await search(params)).found, false);
    }
    items = [{ ...movie, Type: 'Movie' }];
    assert.equal((await search(params)).found, true, 'missing IDs still allow title fallback');
    assert.ok(urls.every(url => new URL(url).searchParams.get('IncludeItemTypes') === 'Movie'));
    urls.length = 0;
    items = [{ ...movie, Type: 'Series' }];
    assert.equal((await search({ ...metadata, type: 'tv' })).found, true);
    assert.equal(new URL(urls[0]).searchParams.get('IncludeItemTypes'), 'Series');
  });
}

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: IMDb episodes and seasons use only parent series metadata`, async () => {
    const { ctx } = harness(file);
    const extract = ctx.api?.extractIMDB || ctx.extractIMDB;
    for (const type of ['TVEpisode', 'TVSeason']) {
      const data = { '@type': type, name: 'Episode title', datePublished: '2024-01-01', partOfSeries: { name: 'Example show' } };
      ctx.document.querySelectorAll = () => [{ textContent: JSON.stringify(data) }];
      ctx.document.querySelector = () => ({ content: 'Episode title (2024)' });
      const meta = extract('tt99999');
      assert.deepEqual(json(meta), { title: 'Example show', year: null, imdbId: null, type: 'tv' });
      const bg = background();
      bg.ctx.fetch = async () => response([{ Id: 'series', Type: 'Series', Name: 'Example show', ProductionYear: 2015, ProviderIds: { Imdb: 'tt11111' } }]);
      assert.equal((await bg.ctx.handleSearch(meta)).found, true);
      data.partOfSeries.startDate = '2015-01-01';
      data.partOfSeries.url = 'https://www.imdb.com/title/tt11111/';
      assert.equal(extract('tt99999').imdbId, 'tt11111');
      assert.equal(extract('tt99999').year, 2015);
      delete data.partOfSeries;
      assert.equal(extract('tt99999'), null, 'do not search by episode title without a parent');

      // Fallback to DOM series link when ld+json omits partOfSeries
      ctx.document.querySelector = selector => selector.includes('series-link')
        ? { textContent: 'We Can Be Heroes', href: '/title/tt0425674/?ref_=tt_ov_inf' }
        : { content: 'Episode #1.1 (2005)' };
      assert.deepEqual(json(extract('tt0774467')), { title: 'We Can Be Heroes', year: null, imdbId: 'tt0425674', type: 'tv' });
    }
    // IMDb /title/tt.../episodes/ subpage
    ctx.window.location.href = 'https://www.imdb.com/title/tt0425674/episodes/?ref_=tt_epspo_eps';
    ctx.window.location.pathname = '/title/tt0425674/episodes/';
    const detect = ctx.api?.detectSite || ctx.detectSite;
    assert.deepEqual(json(detect()), { name: 'imdb', id: 'tt0425674' });
    ctx.document.querySelector = selector => selector === 'meta[property="og:title"]'
      ? { content: 'We Can Be Heroes (TV Series 2005) - Episode list - IMDb' }
      : (selector.includes('h1') ? { textContent: 'Episode list' } : null);
    assert.deepEqual(json(extract('tt0425674')), { imdbId: 'tt0425674', title: 'We Can Be Heroes', year: 2005, type: 'tv' });
  });
}

for (const file of ['src/popup.js', 'src/options.js']) {
  test(`${file}: autosave changes only the edited field and reflects external updates`, async () => {
    const h = harness(file);
    await h.listeners.get('DOMContentLoaded')();
    // Keep a stale form to verify field-level writes independently of synchronization.
    const input = h.elements.get('jellyfin-api-key');
    await h.ctx.chrome.storage.local.set({ config: { ...config, jellyfin_api_key: 'new-key' } });
    assert.equal(input.value, 'new-key');
    input.value = 'stale-key';
    h.elements.get('telegram-chat-id').value = '123';
    await h.elements.get('telegram-chat-id').events.input();
    assert.equal(h.stored.jellyfin_api_key, 'new-key');
    assert.equal(h.stored.telegram_chat_id, '123');
    h.elements.get('jellyfin-url').value = '';
    await h.elements.get('jellyfin-url').events.input();
    assert.deepEqual(h.stored.jellyfin_urls, ['', config.jellyfin_urls[1]]);
    h.elements.get('jellyfin-url-external').value = 'https://changed.invalid';
    await h.elements.get('jellyfin-url-external').events.change();
    assert.deepEqual(h.stored.jellyfin_urls, ['', 'https://changed.invalid']);
  });
}

test('concurrent configuration patches and URL edits retain all values; queue recovers after failure', async () => {
  const h = background({ ...config, jellyfin_token: 'old' });
  await Promise.all([
    h.ctx.updateConfig({ language: 'pl' }), h.ctx.updateConfig({ theme: 'dark' }),
    h.ctx.updateConfig({}, { index: 0, value: 'https://new.invalid' }),
    h.ctx.updateConfig({}, { index: 1, value: 'https://backup.invalid' }),
    h.ctx.updateConfig({ jellyfin_api_key: 'new' })
  ]);
  assert.equal(h.stored.language, 'pl'); assert.equal(h.stored.theme, 'dark');
  assert.deepEqual(h.stored.jellyfin_urls, ['https://new.invalid', 'https://backup.invalid']);
  assert.equal(h.stored.jellyfin_token, undefined);
  await assert.rejects(h.ctx.updateConfig({ language: [] }));
  await h.ctx.updateConfig({ language: 'en' }); assert.equal(h.stored.language, 'en');
});

for (const file of ['src/background.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: title fallback rejects sequels and short unrelated titles, preserves Unicode and matches colon subtitles`, async () => {
    const { ctx } = harness(file);
    const match = ctx.api?.titleSimilarMatch || ctx.titleSimilarMatch;
    for (const [a,b] of [
      ['Matrix Reloaded','Matrix'],
      ['Rocky 2','Rocky 3'],
      ['It','Up'],
      ['Rocky IV','Rocky V'],
      ['Diuna: Część druga', 'Diuna'],
      ['Dune: Part Two', 'Dune'],
      ['Love is Blind: Polska', 'Love is Blind: Holandia']
    ]) {
      assert.equal(match(a,b), false, `${a} / ${b}`);
    }
    assert.equal(match('Żółć', 'Zolc'), true);
    assert.equal(match('千と千尋の神隠し', '千と千尋の神隠し'), true);
    assert.equal(match('We Can Be Heroes: Finding The Australian of the Year', 'We Can Be Heroes'), true);
    assert.equal(match('We Can Be Heroes', 'We Can Be Heroes: Finding The Australian of the Year'), true);
    assert.equal(match('Cube 2: Hypercube', 'Cube 2'), true);

    const items = [{
      Id: '9f9d98b41c15a0f900c609df5114840b',
      Name: 'We Can Be Heroes: Finding The Australian of the Year',
      OriginalTitle: 'We Can Be Heroes: Finding The Australian of the Year',
      ProductionYear: 2005,
      Type: 'Series'
    }];
    ctx.fetch = async () => response(items);
    ctx.GM_xmlhttpRequest = opts => opts.onload({ status: 200, responseText: JSON.stringify({ Items: items }) });
    const search = params => ctx.api ? ctx.api.handleSearch(params, config) : ctx.handleSearch(params);
    const res = await search({ title: 'We Can Be Heroes', year: 2005, type: 'tv' });
    assert.equal(res.found, true);
  });
}

test('standalone cache separates movie/series/person IDs and title variants', () => {
  const { ctx } = harness('userscripts/jellyfin-checker.user.js');
  ctx.api.setCachedResult({ title: 'Same', type: 'movie', tmdbId: '123' }, { found: true });
  assert.equal(ctx.api.getCachedResult({ title: 'Same', type: 'tv', tmdbId: '123' }), null);
  assert.equal(ctx.api.getCachedResult({ title: 'Same', type: 'person', tmdbId: '123' }), null);
  ctx.api.setCachedResult({ title: 'Local', originalTitle: 'First', type: 'movie' }, { found: true });
  assert.equal(ctx.api.getCachedResult({ title: 'Local', originalTitle: 'Second', type: 'movie' }), null);
});

test('standalone configuration permits an empty URL list and connection test returns server name', async () => {
  const { ctx } = harness('userscripts/jellyfin-checker.user.js', { ...config, jellyfin_urls: [] });
  assert.equal(ctx.api.getConfig().jellyfin_urls.length, 0);
  ctx.GM_xmlhttpRequest = opts => opts.onload({ status: 200, responseText: '{"ServerName":"Home","Version":"10"}' });
  const result = await ctx.api.testConnection('https://local.invalid', 'key');
  assert.equal(result.serverName, 'Home');
});

for (const file of ['src/content.js', 'userscripts/jellyfin-checker.user.js']) {
  test(`${file}: metadata fallback parses full IMDb title and TMDb title/year`, () => {
    const { ctx } = harness(file);
    ctx.document.getElementById = () => null;
    ctx.document.querySelector = selector => selector === 'meta[property="og:title"]' ? { content: 'The Matrix (1999)' } : null;
    const imdb = (ctx.api?.extractIMDB || ctx.extractIMDB)('tt0133093');
    assert.equal(imdb.title, 'The Matrix'); assert.equal(imdb.year, 1999);
    const tmdb = (ctx.api?.extractTMDB || ctx.extractTMDB)('603', 'movie');
    assert.equal(tmdb.title, 'The Matrix'); assert.equal(tmdb.year, 1999);

    // TMDb TV season and episode subpages extract parent series title and TMDb ID
    const detect = ctx.api?.detectSite || ctx.detectSite;
    for (const url of [
      'https://www.themoviedb.org/tv/13676-we-can-be-heroes-finding-the-australian-of-the-year/season/1',
      'https://www.themoviedb.org/tv/13676-we-can-be-heroes-finding-the-australian-of-the-year/season/1/episode/1',
      'https://www.themoviedb.org/tv/13676-we-can-be-heroes-finding-the-australian-of-the-year/seasons'
    ]) {
      ctx.window.location.href = url;
      ctx.window.location.pathname = new URL(url).pathname;
      assert.deepEqual(json(detect()), { name: 'tmdb', type: 'tv', id: '13676' });
      ctx.document.title = 'We Can Be Heroes: Finding The Australian of the Year: Sezon 1 (2005) — The Movie Database (TMDB)';
      ctx.document.querySelector = selector => selector === 'meta[property="og:title"]' ? { content: 'Sezon 1' } : null;
      assert.deepEqual(json((ctx.api?.extractTMDB || ctx.extractTMDB)('13676', 'tv')), {
        tmdbId: '13676',
        title: 'We Can Be Heroes: Finding The Australian of the Year',
        year: null,
        type: 'tv'
      });
    }
  });

  test(`${file}: person extractors strip Roman suffixes and TMDb branding across ld+json and DOM fallbacks`, () => {
    const { ctx } = harness(file);
    ctx.document.getElementById = () => null;
    ctx.document.querySelectorAll = () => [{ textContent: JSON.stringify({ '@type': 'Person', name: 'Keanu Reeves (I)', sameAs: 'https://www.imdb.com/name/nm0000206/' }) }];
    assert.deepEqual(json((ctx.api?.extractIMDBPerson || ctx.extractIMDBPerson)('nm0000206')), { imdbId: 'nm0000206', title: 'Keanu Reeves', type: 'person' });
    assert.deepEqual(json((ctx.api?.extractFilmwebPerson || ctx.extractFilmwebPerson)()), { title: 'Keanu Reeves', imdbId: 'nm0000206', type: 'person' });

    ctx.document.querySelectorAll = () => [];
    ctx.document.querySelector = selector => selector === 'meta[property="og:title"]'
      ? { content: 'Keanu Reeves — The Movie Database (TMDB)' }
      : { textContent: 'Keanu Reeves II' };
    assert.deepEqual(json((ctx.api?.extractIMDBPerson || ctx.extractIMDBPerson)('nm0000206')), { imdbId: 'nm0000206', title: 'Keanu Reeves', type: 'person' });
    assert.deepEqual(json((ctx.api?.extractFilmwebPerson || ctx.extractFilmwebPerson)()), { title: 'Keanu Reeves', imdbId: null, type: 'person' });
    assert.deepEqual(json((ctx.api?.extractTMDBPerson || ctx.extractTMDBPerson)('6384')), { tmdbId: '6384', title: 'Keanu Reeves', type: 'person' });
  });

  test(`${file}: unrelated site paths and query strings cannot trigger title detection`, () => {
    const { ctx } = harness(file);
    for (const url of ['https://www.imdb.com/find/?q=imdb.com/title/tt123', 'https://www.themoviedb.org/search?query=themoviedb.org/movie/123']) {
      ctx.window.location.href = url;
      assert.equal((ctx.api?.detectSite || ctx.detectSite)(), null);
    }
  });
}
