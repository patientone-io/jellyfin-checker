// Jellyfin Checker - Background Service Worker

const DEFAULT_CONFIG = {
  jellyfin_url: "http://localhost:8096",
  jellyfin_api_key: ""
};

chrome.runtime.onInstalled.addListener(() => {
  // Load defaults from config.json
  fetch(chrome.runtime.getURL("config.json"))
    .then(r => r.json())
    .then(cfg => {
      chrome.storage.local.get("config", (result) => {
        const existing = result.config || {};
        // Only set defaults from config.json if not already configured
        if (!existing.jellyfin_api_key && cfg.jellyfin_api_key) {
          chrome.storage.local.set({
            config: { ...cfg, ...existing }
          });
        }
      });
    })
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "search_jellyfin") {
    handleSearch(message.params).then(sendResponse).catch(err => {
      sendResponse({ error: err.message, found: false });
    });
    return true;
  }
  if (message.action === "get_config") {
    chrome.storage.local.get("config", (result) => {
      sendResponse(result.config || DEFAULT_CONFIG);
    });
    return true;
  }
  if (message.action === "test_connection") {
    testConnection(message.url, message.apiKey).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  if (message.action === "get_filmweb_rating") {
    getFilmwebRating(message.title, message.year).then(sendResponse).catch(err => {
      sendResponse({ found: false, error: err.message });
    });
    return true;
  }
  if (message.action === "request_add") {
    requestAdd(message.meta, message.sourceURL).then(sendResponse).catch(err => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
  if (message.action === "test_telegram") {
    testTelegram(message.botToken, message.chatId).then(sendResponse).catch(err => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
});

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get("config", (r) => {
      const c = r.config || {};
      // Support jellyfin_urls array or single jellyfin_url
      const raw = c.jellyfin_urls && c.jellyfin_urls.length > 0
        ? c.jellyfin_urls
        : (c.jellyfin_url ? [c.jellyfin_url] : ["http://localhost:8096"]);
      const urls = raw.filter(Boolean);
      resolve({
        jellyfin_urls: urls,
        jellyfin_api_key: c.jellyfin_token || c.jellyfin_api_key || "",
        telegram_bot_token: c.telegram_bot_token || "",
        telegram_chat_id: c.telegram_chat_id || "",
        enable_request_button: c.enable_request_button ?? false
      });
    });
  });
}

// Try each URL, return working base + result
async function searchAllUrls(urls, headers, searchFn) {
  for (const raw of urls) {
    const base = raw.replace(/\/$/, '');
    try {
      const result = await searchFn(base, headers);
      if (result) return { base, result, jellyfinURL: `${base}/web/#/details?id=${result.Id}` };
    } catch { continue; }
  }
  return null;
}

async function handleSearch(params) {
  const config = await getConfig();
  if (!config.jellyfin_api_key) {
    return { found: false, error: "No API key configured", configMissing: true };
  }

  const urls = config.jellyfin_urls;
  const headers = { "X-Emby-Token": config.jellyfin_api_key, "accept": "application/json" };

  // 1 — By IMDb ID
  if (params.imdbId && params.type !== "person") {
    const fn = async (base) => searchByProviderId(base, headers, "imdb", params.imdbId);
    const found = await searchAllUrls(urls, headers, fn);
    if (found) {
      const itemName = found.result.Name || "";
      if (params.title && !titleSimilarMatch(normalizeStr(itemName), normalizeStr(params.title))) {
        console.warn(`[JK] IMDb match title mismatch: expected "${params.title}", got "${itemName}" — falling through`);
      } else {
        return { found: true, item: found.result, jellyfinURL: found.jellyfinURL };
      }
    }
  }
  // 2 — By TMDb ID
  if (params.tmdbId) {
    const fn = async (base) => searchByProviderId(base, headers, "tmdb", params.tmdbId);
    const found = await searchAllUrls(urls, headers, fn);
    if (found) {
      const itemName = found.result.Name || "";
      if (params.title && !titleSimilarMatch(normalizeStr(itemName), normalizeStr(params.title))) {
        console.warn(`[JK] TMDb match title mismatch: expected "${params.title}", got "${itemName}" — falling through`);
      } else {
        return { found: true, item: found.result, jellyfinURL: found.jellyfinURL };
      }
    }
  }
  // 3 — Person search
  if (params.type === "person" && params.title) {
    const fn = async (base) => searchByPerson(base, headers, params.title);
    for (const raw of urls) {
      const base = raw.replace(/\/$/, '');
      try {
        const items = await fn(base);
        if (items.length > 0) {
          return { found: true, count: items.length, jellyfinURL: `${base}/web/#/search.html?query=${encodeURIComponent(params.title)}`, items: items.slice(0, 3) };
        }
      } catch { continue; }
    }
    return { found: false };
  }
  // 4 — Fuzzy by title+year
  if (params.title && params.type !== "person") {
    let fn = async (base) => searchByTitle(base, headers, params.title, params.year, params.type);
    let found = await searchAllUrls(urls, headers, fn);
    if (found) return { found: true, item: found.result, jellyfinURL: found.jellyfinURL };
    // Fallback: try original title (e.g. English title from Filmweb)
    if (params.originalTitle && params.originalTitle !== params.title) {
      fn = async (base) => searchByTitle(base, headers, params.originalTitle, params.year, params.type);
      found = await searchAllUrls(urls, headers, fn);
      if (found) return { found: true, item: found.result, jellyfinURL: found.jellyfinURL };
    }
  }

  return { found: false };
}

async function searchByProviderId(base, headers, provider, value) {
  // Jellyfin/Emby doesn't support anyProviderIdEquals on Items endpoint.
  // Instead: search all items with the provider ID in the filter via Search endpoint,
  // or just return null and let searchByTitle do the work.
  try {
    const providerKey = provider === 'imdb' ? 'IMDb' : 'Tmdb';
    // Try the Items endpoint with ProviderIds filter — Jellyfin doesn't support
    // providerIdEquals, so we use a title-based search fallback instead.
    // This function returns null so handleSearch falls through to searchByTitle.
    return null;
  } catch { return null; }
}

async function searchByTitle(base, headers, title, year, type) {
  try {
    const resp = await fetch(`${base}/Items?SearchTerm=${encodeURIComponent(title)}&IncludeItemTypes=${type === "tv" ? "Series" : "Movie"}&Recursive=true&Limit=5`, { headers, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.Items) return null;
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const target = normalize(title);
    for (const item of data.Items) {
      if (!titleSimilarMatch(normalize(item.Name || ""), target)) continue;
      const y = extractYear(item);
      if (year && y && y !== year) continue;
      return item;
    }
  } catch { return null; }
  return null;
}

async function searchByPerson(base, headers, name) {
  try {
    const resp = await fetch(`${base}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Person=${encodeURIComponent(name)}&Limit=20`, { headers, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.Items || []).map(i => ({ name: i.Name, year: i.ProductionYear, type: i.Type, id: i.Id }));
  } catch { return []; }
}

const normalizeStr = s => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

function titleSimilarMatch(item, target) {
  const strip = s => s.replace(/^the/, "").trim();
  return strip(item) === strip(target) || item.startsWith(target) || target.startsWith(item) || levenshtein(item, target) <= Math.max(2, target.length * 0.15);
}

function levenshtein(a, b) {
  const m = Array.from({ length: b.length + 1 }, (_, i) => Array.from({ length: a.length + 1 }, (_, j) => 0));
  for (let i = 0; i <= b.length; i++) m[i][0] = i;
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) {
    m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1] + (b[i-1] === a[j-1] ? 0 : 1));
  }
  return m[b.length][a.length];
}

function extractYear(item) {
  if (item.PremiereDate) return new Date(item.PremiereDate).getFullYear();
  return item.ProductionYear || null;
}

async function testConnection(url, apiKey) {
  const base = url.replace(/\/$/, "");
  try {
    const resp = await fetch(`${base}/System/Info/Public`, { headers: { "X-Emby-Token": apiKey }, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { success: true, serverName: data.ServerName || "Jellyfin", version: data.Version };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─── Filmweb rating (for Jellyfin → Filmweb reverse direction) ───
async function getFilmwebRating(title, year) {
  try {
    const resp = await fetch(`https://www.filmweb.pl/api/v1/search?query=${encodeURIComponent(title)}&type=movie&size=5`, {
      headers: { "accept": "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    if (!resp.ok) return { found: false };
    const data = await resp.json();
    if (data && data.length > 0) {
      const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const target = normalize(title);
      for (const item of data) {
        const itemName = normalize(item.title || item.originalTitle || item.name || "");
        if (!titleSimilarMatch(itemName, target)) continue;
        if (year && item.year && item.year !== year) continue;
        const rating = item.filmwebRanking?.rating || item.fwRanking?.rating || item.rateFilm?.averageRate || null;
        if (rating) return { found: true, rating: rating.toFixed(1) };
      }
    }
  } catch (e) { console.log("Filmweb API:", e.message); }
  return { found: false };
}

// ─── Telegram: test connection ───
async function testTelegram(botToken, chatId) {
  if (!botToken || !chatId) {
    return { ok: false, error: "Nie podano tokena lub Chat ID" };
  }
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "🟢 *Test połączenia Jellyfin Checker*\nWszystko działa!",
      parse_mode: "Markdown"
    }),
    signal: AbortSignal.timeout(5000)
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return { ok: true };
}

// ─── Telegram: request film addition ───
async function requestAdd(meta, sourceURL) {
  const config = await getConfig();
  const botToken = config.telegram_bot_token;
  const chatId = config.telegram_chat_id;

  if (!botToken || !chatId) {
    return { ok: false, error: "Nie skonfigurowano Telegram" };
  }

  const type = meta.type === "tv" ? "Serial" : "Film";
  const lines = [
    `🎬 *Prośba o dodanie ${type?.toLowerCase()}*`,
    `*Tytuł:* ${meta.title}`,
    meta.year ? `*Rok:* ${meta.year}` : null,
    meta.imdbId ? `*IMDb:* [${meta.imdbId}](https://www.imdb.com/title/${meta.imdbId})` : null,
    meta.tmdbId ? `*TMDb:* [${meta.tmdbId}](https://www.themoviedb.org/${meta.type}/${meta.tmdbId})` : null,
    `*Źródło:* [link](${sourceURL})`,
    `*Data:* ${new Date().toLocaleString("pl-PL")}`
  ].filter(Boolean).join("\n");

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines,
      parse_mode: "Markdown",
      disable_notification: true
    }),
    signal: AbortSignal.timeout(5000)
  });

  const data = await resp.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return { ok: true };
}
