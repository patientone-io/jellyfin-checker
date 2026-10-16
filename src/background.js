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
  await chrome.storage.local.set({ config: merged });
}

chrome.runtime.onInstalled.addListener(details => {
  initializeConfig(details).catch(error => console.error("[JK] Configuration initialization failed:", error));
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
        jellyfin_api_key: c.jellyfin_token || c.jellyfin_api_key || "",
        telegram_bot_token: c.telegram_bot_token || "",
        telegram_chat_id: c.telegram_chat_id || "",
        enable_request_button: c.enable_request_button ?? false
      });
    });
  });
}

async function handleSearch(params) {
  const config = await getConfig();
  if (!config.jellyfin_api_key || !config.jellyfin_urls.length) {
    return { found: false, error: "Configure a Jellyfin URL and API key", configMissing: true };
  }
  const headers = {
    "Authorization": `MediaBrowser Client="Jellyfin Checker", Device="Browser Extension", DeviceId="jellyfin-checker-ext", Version="1.0.3", Token="${config.jellyfin_api_key}"`,
    "X-Emby-Token": config.jellyfin_api_key,
    "accept": "application/json"
  };
  let completed = false;
  let lastError;
  for (const raw of config.jellyfin_urls) {
    const base = raw.replace(/\/$/, "");
    try {
      if (params.type === "person") {
        const items = await searchByPerson(base, headers, params.title);
        if (items.length) {
          return { found: true, count: items.length, jellyfinURL: `${base}/web/#/search.html?query=${encodeURIComponent(params.title)}`, items: items.slice(0, 3) };
        }
      } else {
        const titles = [...new Set([params.title, params.originalTitle].filter(Boolean))];
        for (const title of titles) {
          const item = await searchByTitle(base, headers, title, params.year, params.imdbId, params.tmdbId);
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

async function searchByTitle(base, headers, title, year, imdbId, tmdbId) {
  const resp = await fetch(`${base}/Items?SearchTerm=${encodeURIComponent(title)}&IncludeItemTypes=Movie,Series&Recursive=true&Fields=ProviderIds,OriginalTitle&Limit=30`, { headers, signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data.Items)) throw new Error("Invalid Jellyfin response");
  if (data.Items.length === 0) return null;

  // 1. Exact ProviderId match if available (highest confidence)
  for (const item of data.Items) {
    const pIds = item.ProviderIds || {};
    if (imdbId && pIds.Imdb && pIds.Imdb.toLowerCase() === imdbId.toLowerCase()) {
      return item;
    }
    if (tmdbId && pIds.Tmdb && String(pIds.Tmdb) === String(tmdbId)) {
      return item;
    }
  }

  // 2. Similarity match (normalized title or originalTitle)
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const target = normalize(title);
  for (const item of data.Items) {
    const normName = normalize(item.Name || "");
    const normOrig = item.OriginalTitle ? normalize(item.OriginalTitle) : "";
    if (!titleSimilarMatch(normName, target) && !titleSimilarMatch(normOrig, target)) continue;
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
  return data.Items.map(i => ({ name: i.Name, year: i.ProductionYear, type: i.Type, id: i.Id }));
}

function titleSimilarMatch(item, target) {
  if (!item || !target) return false;
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
  if (!url || !apiKey) return { success: false, error: "A URL and API key are required" };
  const base = url.replace(/\/$/, "");
  const headers = { "X-Emby-Token": apiKey, "accept": "application/json" };
  try {
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
