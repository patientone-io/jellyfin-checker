const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../userscripts/jellyfin-to-filmweb.user.js`, 'utf8')
  .replace('  let lastUrl = window.location.href;', '  globalThis.api = { getDirectFilmwebUrl, injectFilmwebButton }; return;\n  let lastUrl = window.location.href;');
function harness(handler, items = {}) {
  const buttons = [], calls = [], itemCalls = [];
  const container = { querySelector: () => buttons.find(b => b.isConnected) || null, appendChild: b => buttons.push(b) };
  let now = 0;
  const context = {
    console: { debug() {} }, AbortSignal,
    Date: { now: () => now },
    window: { location: { href: 'https://jellyfin.invalid/web/#/details?id=abc' }, ApiClient: {
      getCurrentUserId: () => 'user', getItem: async (user, id) => { itemCalls.push(id); return items[id]; }
    } },
    document: {
      querySelectorAll: selector => selector.includes('mainDetail') ? [container] : buttons.filter(b => b.isConnected),
      querySelector: () => null,
      createElement: () => ({ style: {}, attrs: {}, isConnected: true,
        setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
        addEventListener() {}, remove() { this.isConnected = false; }
      })
    },
    GM_xmlhttpRequest(opts) {
      calls.push(opts.url);
      Promise.resolve().then(() => handler(opts.url)).then(data => opts.onload({ status: data.status || 200,
        responseText: JSON.stringify(data.body ?? data) }), error => opts.onerror(error));
    }
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { ...context.api, context, buttons, calls, itemCalls, advance: ms => { now += ms; } };
}
const search = h => h.getDirectFilmwebUrl('Alpha Beta', 2020, '', 'Movie');
const hit = (id, matchedTitle = 'Alpha Beta', type = 'film') => ({ id, matchedTitle, type });

test('weak titles and shortened subtitles cannot select a different film', async () => {
  const h = harness(url => url.includes('/live/') ? { searchHits: [hit(1, 'Alpha Gamma')] } : { title: 'Alpha Gamma', year: 2020 });
  assert.match(await search(h), /\/search\?/);
  assert.match(await h.getDirectFilmwebUrl('Alpha Gamma: Part Two', 2020, '', 'Movie'), /\/search\?/);
});

test('original title and search alias survive a localized info title', async () => {
  for (const originalTitle of ['Alpha Beta', undefined]) {
    const h = harness(url => url.includes('/live/') ? { searchHits: [hit(1)] } : { title: 'Polski tytuł', originalTitle, year: 2020 });
    assert.match(await search(h), /\/film\/Polski\+tytuł-2020-1$/);
  }
});

test('later exact-year result beats an earlier near-year result; repeated info is fetched once', async () => {
  const h = harness(url => url.includes('/live/') ? { searchHits: url.includes('2020') ? [hit(1)] : [hit(1), hit(2)] }
    : { title: 'Alpha Beta', year: url.includes('/1/') ? 2019 : 2020 });
  assert.match(await search(h), /-2020-2$/);
  assert.equal(h.calls.filter(url => url.includes('/film/1/info')).length, 1);
});

test('equally strong candidates, wrong media type and missing year use search fallback', async () => {
  for (const [hits, year] of [[[hit(1), hit(2)], 2020], [[hit(1, 'Alpha Beta', 'serial')], 2020], [[hit(1)], undefined]]) {
    const h = harness(url => url.includes('/live/') ? { searchHits: hits } : { title: 'Alpha Beta', year });
    assert.match(await search(h), /\/search\?/);
  }
});

test('concurrent lookups share requests; successful absence expires', async () => {
  const h = harness(() => ({ searchHits: [] }));
  await Promise.all([search(h), search(h)]);
  assert.equal(h.calls.length, 2);
  await search(h); assert.equal(h.calls.length, 2);
  h.advance(60001); await search(h); assert.equal(h.calls.length, 4);
});

test('network errors, HTTP failures and malformed results are not cached', async () => {
  for (const failure of [() => { throw Error('offline'); }, () => ({ status: 503, body: {} }), () => ({ searchHits: {} })]) {
    let online = false;
    const h = harness(url => online ? (url.includes('/live/') ? { searchHits: [hit(1)] } : { title: 'Alpha Beta', year: 2020 }) : failure());
    await assert.rejects(search(h)); online = true;
    assert.match(await search(h), /-2020-1$/);
  }
});

test('failed info request never resolves by matchedTitle alone', async () => {
  const h = harness(url => url.includes('/live/') ? { searchHits: [hit(1)] } : { status: 403, body: {} });
  await assert.rejects(search(h));
});

for (const Type of ['Episode', 'Season']) {
  test(`${Type} uses parent series ID and coalesces injection; leaving details removes button`, async () => {
    const h = harness(() => { throw Error('must not query Filmweb'); }, {
      abc: { Type, SeriesId: 'def', Name: 'Season 3', ProductionYear: 2024, ProviderIds: { Filmweb: '999' } },
      def: { Type: 'Series', Name: 'Show', ProductionYear: 2015, ProviderIds: { Filmweb: '123' } }
    });
    await Promise.all([h.injectFilmwebButton(), h.injectFilmwebButton()]);
    assert.deepEqual(h.itemCalls, ['abc', 'def']);
    assert.equal(h.buttons[0].href, 'https://www.filmweb.pl/serial/-123');
    await h.injectFilmwebButton(); assert.equal(h.itemCalls.length, 2);
    h.context.window.location.href = 'https://jellyfin.invalid/web/#/home';
    await h.injectFilmwebButton(); assert.equal(h.buttons[0].isConnected, false);
  });
}

test('episode searches with parent premiere year and never its own year or provider ID', async () => {
  const h = harness(url => url.includes('/live/') ? { searchHits: [] } : {}, {
    abc: { Type: 'Episode', SeriesId: 'def', ProductionYear: 2024, ProviderIds: { Filmweb: '999' } },
    def: { Type: 'Series', Name: 'Show', ProductionYear: 2015 }
  });
  await h.injectFilmwebButton();
  assert.ok(h.calls.some(url => url.includes('2015')));
  assert.ok(h.calls.every(url => !url.includes('2024')));
  assert.match(h.buttons[0].href, /Show%202015/);
});

test('navigation during parent fetch cannot insert a stale button', async () => {
  const h = harness(() => ({ searchHits: [] }), { abc: { Type: 'Episode', SeriesId: 'def' } });
  const original = h.context.window.ApiClient.getItem;
  h.context.window.ApiClient.getItem = async (user, id) => {
    if (id === 'def') {
      h.context.window.location.href = 'https://jellyfin.invalid/web/#/details?id=aaa';
      return { Type: 'Series', Name: 'Old show' };
    }
    return original(user, id);
  };
  await h.injectFilmwebButton(); assert.equal(h.buttons.length, 0);
});

test('button retains search link on outage and can retry after cooldown', async () => {
  let online = false;
  const h = harness(url => { if (!online) throw Error('offline'); return url.includes('/live/') ? { searchHits: [hit(1)] } : { title: 'Alpha Beta', year: 2020 }; },
    { abc: { Type: 'Movie', Name: 'Alpha Beta', ProductionYear: 2020 } });
  await h.injectFilmwebButton(); assert.match(h.buttons[0].href, /\/search\?/);
  online = true; h.advance(30001); await h.injectFilmwebButton();
  assert.match(h.buttons[0].href, /-2020-1$/);
});
