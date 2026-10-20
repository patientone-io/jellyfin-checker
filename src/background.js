// Jellyfin Checker - Background Service Worker

const DEFAULT_CONFIG = {
  jellyfin_urls: ["http://localhost:8096"],
  jellyfin_api_key: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
  language: "en",
  theme: "system",
  enable_request_button: false,
  enable_sound_notifications: false
};

// Serialize all settings writes, including installation, across popup/options contexts.
let configWrites = Promise.resolve();
function queueConfigWrite(operation) {
  const result = configWrites.then(operation);
  configWrites = result.catch(() => {});
  return result;
}

function updateConfig(patch = {}, urlEdit = null) {
  return queueConfigWrite(async () => {
    const { config: existing = {} } = await chrome.storage.local.get("config");
    const config = { ...existing };
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.hasOwn(DEFAULT_CONFIG, key)) throw new Error("Unknown setting");
      const expected = DEFAULT_CONFIG[key];
      if (Array.isArray(expected) ? !Array.isArray(value) || value.some(v => typeof v !== "string") : typeof value !== typeof expected) {
        throw new Error("Invalid setting value");
      }
      config[key] = value;
    }
    if (urlEdit) {
      if (![0, 1].includes(urlEdit.index) || typeof urlEdit.value !== "string") throw new Error("Invalid URL field");
      config.jellyfin_urls = [...(config.jellyfin_urls || [])];
      config.jellyfin_urls[urlEdit.index] = urlEdit.value;
    }
    if (Object.hasOwn(patch, "jellyfin_api_key")) delete config.jellyfin_token;
    await chrome.storage.local.set({ config });
    return { ok: true };
  });
}

async function initializeConfig(details) {
  let defaults = DEFAULT_CONFIG;
  if (details.reason === "install") {
    try {
      const response = await fetch(chrome.runtime.getURL("config.json"));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      defaults = { ...DEFAULT_CONFIG, ...await response.json() };
    } catch (error) {
      console.warn("[JK] Could not load bundled configuration:", error.message);
    }
  }
  // Read storage after loading defaults so existing settings always take precedence.
  const { config: existing = {} } = await chrome.storage.local.get("config");
  const merged = { ...defaults, ...existing };
  if (existing.jellyfin_url && !existing.jellyfin_urls?.length) {
    merged.jellyfin_urls = [existing.jellyfin_url];
  }
  delete merged.jellyfin_url;
  if (!existing.jellyfin_api_key && existing.jellyfin_token) merged.jellyfin_api_key = existing.jellyfin_token;
  delete merged.jellyfin_token;
  await chrome.storage.local.set({ config: merged });
}

chrome.runtime.onInstalled.addListener(details => {
  queueConfigWrite(() => initializeConfig(details)).catch(error => console.error("[JK] Configuration initialization failed:", error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.action !== "string") return false;
  if (message.action === "update_config") {
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) {
      sendResponse({ ok: false, error: "Settings changes require an extension page" });
      return false;
    }
    updateConfig(message.patch, message.urlEdit).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
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
      const raw = Array.isArray(c.jellyfin_urls)
        ? c.jellyfin_urls
        : (c.jellyfin_url ? [c.jellyfin_url] : ["http://localhost:8096"]);
      const urls = raw.filter(Boolean);
      resolve({
        jellyfin_urls: urls,
        jellyfin_api_key: c.jellyfin_api_key || c.jellyfin_token || "",
        telegram_bot_token: c.telegram_bot_token || "",
        telegram_chat_id: c.telegram_chat_id || "",
        enable_request_button: c.enable_request_button ?? false
      });
    });
  });
}

async function handleSearch(params) {
  if (!params || !['movie', 'tv', 'person'].includes(params.type) || typeof params.title !== 'string' || !params.title.trim() || params.title.length > 500) {
    return { found: false, error: "Invalid title metadata" };
  }
  const config = await getConfig();
  if (!config.jellyfin_api_key || !config.jellyfin_urls.length) {
    return { found: false, error: "Configure a Jellyfin URL and API key", configMissing: true };
  }
  const headers = {
    "Authorization": `MediaBrowser Client="Jellyfin Checker", Device="Browser Extension", DeviceId="jellyfin-checker-ext", Version="1.0.4", Token="${config.jellyfin_api_key}"`,
    "X-Emby-Token": config.jellyfin_api_key,
    "accept": "application/json"
  };
  let completed = false;
  let lastError;
  for (const raw of config.jellyfin_urls) {
    try {
      const base = normalizeServerURL(raw);
      if (params.type === "person") {
        const { items, count } = await searchByPerson(base, headers, params.title);
        if (items.length) {
          return { found: true, count, jellyfinURL: `${base}/web/#/search.html?query=${encodeURIComponent(params.title)}`, items: items.slice(0, 3) };
        }
      } else {
        const titles = [...new Set([params.title, params.originalTitle].filter(Boolean))];
        for (const title of titles) {
          const item = await searchByTitle(base, headers, title, params.year, params.imdbId, params.tmdbId, params.type);
          if (item) return { found: true, item, jellyfinURL: `${base}/web/#/details?id=${item.Id}` };
        }
      }
      completed = true;
    } catch (error) {
      lastError = error;
    }
  }
  // A completed search can establish absence; failed requests cannot.
  return completed ? { found: false } : { found: false, error: lastError?.message || "Search failed" };
}

async function searchByTitle(base, headers, title, year, imdbId, tmdbId, type) {
  const itemType = type === "movie" ? "Movie" : type === "tv" ? "Series" : "Movie,Series";
  const resp = await fetch(`${base}/Items?SearchTerm=${encodeURIComponent(title)}&IncludeItemTypes=${itemType}&Recursive=true&Fields=ProviderIds,OriginalTitle&Limit=30`, { headers, signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data.Items)) throw new Error("Invalid Jellyfin response");
  if (data.Items.length === 0) return null;

  const candidates = data.Items.filter(item => {
    if (item.Type && itemType !== "Movie,Series" && item.Type !== itemType) return false;
    const ids = item.ProviderIds || {};
    if (imdbId && ids.Imdb && ids.Imdb.toLowerCase() !== imdbId.toLowerCase()) return false;
    if (tmdbId && ids.Tmdb && String(ids.Tmdb) !== String(tmdbId)) return false;
    return true;
  });

  // 1. Exact ProviderId match if available (highest confidence)
  for (const item of candidates) {
    const pIds = item.ProviderIds || {};
    if (imdbId && pIds.Imdb && pIds.Imdb.toLowerCase() === imdbId.toLowerCase()) {
      return item;
    }
    if (tmdbId && pIds.Tmdb && String(pIds.Tmdb) === String(tmdbId)) {
      return item;
    }
  }

  // 2. Similarity match (title or originalTitle, including subtitle variants)
  for (const item of candidates) {
    const name = item.Name || "";
    const orig = item.OriginalTitle || "";
    if (!titleSimilarMatch(name, title) && !titleSimilarMatch(orig, title)) continue;
    const y = extractYear(item);
    if (year && y && y !== year) {
      // Allow ±2 year tolerance
      const tolerance = Math.abs(y - year) <= 2;
      if (!tolerance) continue;
    }
    return item;
  }
  return null;
}

async function searchByPerson(base, headers, name) {
  const resp = await fetch(`${base}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Person=${encodeURIComponent(name)}&Limit=30`, { headers, signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data.Items)) throw new Error("Invalid Jellyfin response");
  const items = data.Items.map(i => ({ name: i.Name, year: i.ProductionYear, type: i.Type, id: i.Id }));
  return { items, count: Number.isInteger(data.TotalRecordCount) ? Math.max(items.length, data.TotalRecordCount) : items.length };
}

function normalizeStr(value) {
  return String(value || '').toLowerCase().replace(/ł/g, 'l').normalize('NFKD')
    .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function titleSimilarMatch(item, target) {
  const strip = value => normalizeStr(value).replace(/^the\s+/, '');
  const matchSingle = (rawA, rawB) => {
    const a = strip(rawA), b = strip(rawB);
    if (!a || !b) return false;
    if (a === b) return true;
    // Preserve sequel numbers, including terminal Roman numerals.
    const numbers = value => JSON.stringify([value.match(/\d+/g) || [], value.match(/\b[ivx]+$/)?.[0] || '']);
    if (numbers(a) !== numbers(b)) return false;
    const compactA = a.replace(/\s/g, ''), compactB = b.replace(/\s/g, '');
    if (Math.min(compactA.length, compactB.length) < 5) return false;
    const tolerance = Math.max(1, Math.floor(Math.min(compactA.length, compactB.length) * 0.15));
    if (Math.abs(compactA.length - compactB.length) > tolerance) return false;
    return levenshtein(compactA, compactB) <= tolerance;
  };
  if (matchSingle(item, target)) return true;

  const splitSubtitle = value => {
    const m = String(value || '').match(/^([^:–—]+?)(?:\s*[:–—]\s*|\s+-\s+)(.+)$/);
    if (!m) return null;
    const base = strip(m[1]), sub = normalizeStr(m[2]);
    if (!base || base.replace(/\s/g, '').length < 4) return null;
    if (/\b(?:part|czesc|vol|volume|sezon|season|odcinek|episode|ii|iii|iv|v|vi|vii|viii|ix|x|drug[ai]|trzeci[ai]|\d+)\b/.test(sub)) return null;
    return base;
  };
  const baseItem = splitSubtitle(item);
  const baseTarget = splitSubtitle(target);
  if (baseItem && !baseTarget && matchSingle(baseItem, target)) return true;
  if (baseTarget && !baseItem && matchSingle(item, baseTarget)) return true;
  return false;
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
  if (item.ProductionYear) return Number(item.ProductionYear);
    if (item.PremiereDate) return new Date(item.PremiereDate).getUTCFullYear();
  return item.ProductionYear || null;
}

function normalizeServerURL(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP(S) server URL without credentials, query or fragment');
  }
  return url.href.replace(/\/+$/, '');
}

async function testConnection(url, apiKey) {
  if (!url || !apiKey) return { success: false, error: "A URL and API key are required" };
  const headers = {
    "Authorization": `MediaBrowser Client="Jellyfin Checker", Device="Browser Extension", DeviceId="jellyfin-checker-ext", Version="1.0.4", Token="${apiKey}"`,
    "X-Emby-Token": apiKey,
    "accept": "application/json"
  };
  try {
    const base = normalizeServerURL(url);
    const resp = await fetch(`${base}/System/Info`, { headers, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { success: true, serverName: data.ServerName || "Jellyfin", version: data.Version };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
      text: "🟢 Test połączenia Jellyfin Checker\nWszystko działa!"
    }),
    signal: AbortSignal.timeout(5000)
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return { ok: true };
}

// ─── Telegram: request film addition ───
async function requestAdd(meta, sourceURL) {
  if (!meta || !['movie', 'tv'].includes(meta.type) || typeof meta.title !== 'string' || !meta.title.trim()) {
    return { ok: false, error: "Only movie or series requests are supported" };
  }
  const config = await getConfig();
  const botToken = config.telegram_bot_token;
  const chatId = config.telegram_chat_id;

  if (!botToken || !chatId) {
    return { ok: false, error: "Nie skonfigurowano Telegram" };
  }

  const type = meta.type === "tv" ? "Serial" : "Film";
  const lines = [
    `🎬 Prośba o dodanie ${type.toLowerCase()}`,
    `Tytuł: ${meta.title}`,
    meta.year ? `Rok: ${meta.year}` : null,
    meta.imdbId ? `IMDb: https://www.imdb.com/title/${meta.imdbId}` : null,
    meta.tmdbId ? `TMDb: https://www.themoviedb.org/${meta.type}/${meta.tmdbId}` : null,
    `Źródło: ${sourceURL}`,
    `Data: ${new Date().toLocaleString("pl-PL")}`
  ].filter(Boolean).join("\n");

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines,
      disable_notification: true
    }),
    signal: AbortSignal.timeout(5000)
  });

  const data = await resp.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return { ok: true };
}
