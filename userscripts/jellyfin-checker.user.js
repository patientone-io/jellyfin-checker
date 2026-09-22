// ==UserScript==
// @name         Jellyfin Checker
// @namespace    patientone.io
// @version      0.9.5
// @description  Checks if movies, shows, or people are available on your Jellyfin server. Works with IMDb, Filmweb, and TMDb.
// @author       patientone
// @match        https://www.imdb.com/*
// @match        https://imdb.com/*
// @match        https://m.imdb.com/*
// @match        https://www.filmweb.pl/*
// @match        https://filmweb.pl/*
// @match        https://www.themoviedb.org/*
// @match        https://themoviedb.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      filmweb.pl
// @connect      www.filmweb.pl
// @connect      api.telegram.org
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // --- Constants & Defaults ---
  const DEFAULT_CONFIG = {
    jellyfin_urls: ["http://localhost:8096"],
    jellyfin_api_key: "",
    telegram_bot_token: "",
    telegram_chat_id: "",
    language: "pl",
    enable_request_button: false,
    enable_sound_notifications: false
  };

  const JELLYFIN_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%2300A4DC' d='M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 18.5c14.6 0 26.5 11.9 26.5 26.5S64.6 76.5 50 76.5 23.5 64.6 23.5 50 35.4 23.5 50 23.5z'/><path fill='%23AA00FF' d='M50 33.5c-9.1 0-16.5 7.4-16.5 16.5s7.4 16.5 16.5 16.5 16.5-7.4 16.5-16.5-7.4-16.5-16.5-16.5z'/></svg>";

  const i18n = {
    pl: {
      noTitle: "Nie znaleziono tytułu",
      checking: "Sprawdzam Jellyfin...",
      found: "Obejrzyj na Jellyfin!",
      foundMany: n => {
        if (n === 1) return `1 pozycja na Jellyfin`;
        if (n >= 2 && n <= 4) return `${n} pozycje na Jellyfin`;
        return `${n} pozycji na Jellyfin`;
      },
      notFound: "Brak na Jellyfin",
      error: "Błąd połączenia",
      needConfig: "Skonfiguruj Jellyfin",
      reqText: "Nie znaleziono — chcesz poprosić o dodanie?",
      reqBtn: "Poproś o film ▶",
      reqSending: "🔄 Wysyłam...",
      reqSent: "✅ Wysłano!",
      reqFail: err => `❌ ${err}`,
      reqErrFallback: "Błąd wysyłania",
      closeTitle: "Zamknij",
      settingsTitle: "Ustawienia Jellyfin Checker",
      urlLabel: "Jellyfin URL #1",
      urlLabelExt: "Jellyfin URL #2 (Opcjonalny)",
      keyLabel: "Klucz API",
      botLabel: "Telegram Bot Token",
      chatLabel: "Telegram Chat ID",
      hintApi: "Drugi URL używany gdy pierwszy nie odpowiada",
      hintKey: "Jellyfin → Dashboard → Ustawienia → Klucze API",
      hintBot: "Stwórz bota przez @BotFather → /newbot",
      hintChat: "Twój Chat ID lub ID grupy (z minusem)",
      saveBtn: "Zapisz",
      testBtn: "Testuj Serwer",
      testTgBtn: "Testuj Telegram",
      toggleSound: "Powiadomienia dźwiękowe",
      toggleSoundSub: "Piszcz przy znalezieniu filmu",
      toggleRequest: "Przycisk prośby",
      toggleRequestSub: "Pokazuj gdy filmu brak na Jellyfin",
      saved: "✅ Zapisano konfigurację!",
      connected: server => `✅ Połączono z ${server.name} (v${server.version})`,
      connectFail: err => `❌ Błąd połączenia: ${err}`,
      testSent: "✅ Test Telegram wysłany!",
      testFail: err => `❌ ${err}`,
      fillFields: "Uzupełnij wymagane pola (URL i API Key)"
    },
    en: {
      noTitle: "Title not found",
      checking: "Checking Jellyfin...",
      found: "Watch on Jellyfin!",
      foundMany: n => `${n} ${n === 1 ? 'title' : 'titles'} on Jellyfin`,
      notFound: "Not on Jellyfin",
      error: "Connection error",
      needConfig: "Configure Jellyfin",
      reqText: "Not found — want to request it?",
      reqBtn: "Request film ▶",
      reqSending: "🔄 Sending...",
      reqSent: "✅ Sent!",
      reqFail: err => `❌ ${err}`,
      reqErrFallback: "Send failed",
      closeTitle: "Close",
      settingsTitle: "Jellyfin Checker Settings",
      urlLabel: "Jellyfin URL #1",
      urlLabelExt: "Jellyfin URL #2 (Optional)",
      keyLabel: "API Key",
      botLabel: "Telegram Bot Token",
      chatLabel: "Telegram Chat ID",
      hintApi: "Second URL is used when the first is unreachable",
      hintKey: "Jellyfin Dashboard → Settings → API Keys",
      hintBot: "Create a bot via @BotFather → /newbot",
      hintChat: "Your Chat ID or group ID (with minus)",
      saveBtn: "Save",
      testBtn: "Test Server",
      testTgBtn: "Test Telegram",
      toggleSound: "Sound Notifications",
      toggleSoundSub: "Beep when film is found on Jellyfin",
      toggleRequest: "Request Button",
      toggleRequestSub: "Show when film is not on Jellyfin",
      saved: "✅ Configuration saved!",
      connected: server => `✅ Connected to ${server.name} (v${server.version})`,
      connectFail: err => `❌ Connection failed: ${err}`,
      testSent: "✅ Test message sent!",
      testFail: err => `❌ ${err}`,
      fillFields: "Fill in URL and API key fields"
    }
  };

  // --- Configuration Management ---
  function getConfig() {
    const stored = GM_getValue("config", {});
    return {
      jellyfin_urls: (stored.jellyfin_urls && stored.jellyfin_urls.length && stored.jellyfin_urls[0] !== "") ? stored.jellyfin_urls : DEFAULT_CONFIG.jellyfin_urls,
      jellyfin_api_key: stored.jellyfin_api_key || DEFAULT_CONFIG.jellyfin_api_key,
      telegram_bot_token: stored.telegram_bot_token || DEFAULT_CONFIG.telegram_bot_token,
      telegram_chat_id: stored.telegram_chat_id || DEFAULT_CONFIG.telegram_chat_id,
      language: stored.language || DEFAULT_CONFIG.language,
      enable_request_button: stored.enable_request_button !== undefined ? stored.enable_request_button : DEFAULT_CONFIG.enable_request_button,
      enable_sound_notifications: stored.enable_sound_notifications !== undefined ? stored.enable_sound_notifications : DEFAULT_CONFIG.enable_sound_notifications
    };
  }

  function saveConfig(cfg) {
    GM_setValue("config", cfg);
    GM_setValue("search_cache_data", {}); // Wyczyść cache przy zapisie nowych ustawień
  }

  // --- Cache Helpers ---
  function getCachedResult(metadata) {
    const key = metadata.imdbId || metadata.tmdbId || `title_${normalizeStr(metadata.title)}_${metadata.year || ''}`;
    const cache = GM_getValue("search_cache_data", {});
    const entry = cache[key];
    if (entry && entry.expiry > Date.now()) {
      return entry.value;
    }
    return null;
  }

  function setCachedResult(metadata, value) {
    const key = metadata.imdbId || metadata.tmdbId || `title_${normalizeStr(metadata.title)}_${metadata.year || ''}`;
    const cache = GM_getValue("search_cache_data", {});
    const now = Date.now();
    const cleanCache = {};
    for (const k in cache) {
      if (cache[k] && cache[k].expiry > now) {
        cleanCache[k] = cache[k];
      }
    }
    // Cache TTL: 12h dla znalezionych, 1h dla nieznalezionych
    const ttl = value.found ? 12 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000;
    cleanCache[key] = {
      value: value,
      expiry: now + ttl
    };
    GM_setValue("search_cache_data", cleanCache);
  }

  function getLang() {
    return getConfig().language || "en";
  }

  async function badgeText(key, ...args) {
    const lang = getLang();
    const t = i18n[lang] || i18n.en;
    const val = t[key];
    return typeof val === "function" ? val(...args) : val;
  }

  // --- Network Helpers (GM_xmlhttpRequest wraps) ---
  function gmFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: options.method || "GET",
        url: url,
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ...options.headers
        },
        data: options.body || null,
        timeout: options.timeout || 5000,
        onload: (res) => {
          resolve({
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            statusText: res.statusText,
            json: () => {
              try {
                return Promise.resolve(JSON.parse(res.responseText));
              } catch (e) {
                return Promise.reject(new Error("JSON Parse failed"));
              }
            },
            text: () => Promise.resolve(res.responseText)
          });
        },
        ontimeout: () => reject(new Error("Network timeout")),
        onerror: (err) => reject(new Error(err.statusText || "Network error"))
      });
    });
  }

  // --- Audio Synthesis Notification ---
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      console.warn("[JK] Audio error:", e);
    }
  }

  // --- Similarity Math & Normalization ---
  const cleanText = str => str ? str.replace(/[\u00A0\s]+/g, " ").trim() : "";
  const normalizeStr = s => s ? s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/[\s\u00A0]+/g, " ").trim() : "";

  function titleSimilarMatch(item, target) {
    // Strip common leading articles in multiple languages
    const strip = s => s.replace(/^(the|a|an|el|la|le|les|o|w|y)\s+/i, "").trim();
    const cleanItem = strip(item);
    const cleanTarget = strip(target);
    if (cleanItem === cleanTarget) return true;

    // Try stripping year suffix (e.g. "iron man 2008" -> "iron man")
    const noYearItem = cleanItem.replace(/\s+\d{4}$/, "").trim();
    const noYearTarget = cleanTarget.replace(/\s+\d{4}$/, "").trim();
    if (noYearItem === noYearTarget) return true;

    // Levenshtein check on spaceless representation to allow spelling variations
    const dist = levenshtein(cleanItem.replace(/\s/g, ""), cleanTarget.replace(/\s/g, ""));
    const targetLen = cleanTarget.replace(/\s/g, "").length;
    return dist <= Math.max(1, Math.floor(targetLen * 0.15));
  }

  function levenshtein(a, b) {
    const m = Array.from({ length: b.length + 1 }, (_, i) => Array.from({ length: a.length + 1 }, () => 0));
    for (let i = 0; i <= b.length; i++) m[i][0] = i;
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = Math.min(
          m[i-1][j] + 1,
          m[i][j-1] + 1,
          m[i-1][j-1] + (b[i-1] === a[j-1] ? 0 : 1)
        );
      }
    }
    return m[b.length][a.length];
  }

  function extractYear(item) {
    if (item.PremiereDate) return new Date(item.PremiereDate).getFullYear();
    return item.ProductionYear || null;
  }

  // --- Jellyfin API Searches ---
  function getJellyfinHeaders(apiKey) {
    const headers = {};
    if (apiKey) {
      headers["Authorization"] = `MediaBrowser Client="Jellyfin Checker", Device="Browser", DeviceId="jellyfin-checker", Version="0.9.5", Token="${apiKey}"`;
      headers["X-Emby-Token"] = apiKey;
    }
    return headers;
  }

  async function testConnection(url, apiKey) {
    const base = url.replace(/\/$/, "");
    const headers = getJellyfinHeaders(apiKey);
    try {
      // Wywołujemy /System/Info, które wymaga autoryzacji i faktycznie weryfikuje poprawność klucza API
      let resp = await gmFetch(`${base}/System/Info`, {
        headers,
        timeout: 5000
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(`HTTP ${resp.status} (Niepoprawny klucz API / brak autoryzacji)`);
        }
        // Fallback do /System/Info/Public jeśli serwer ogranicza dostęp do /System/Info
        resp = await gmFetch(`${base}/System/Info/Public`, {
          headers,
          timeout: 5000
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      return { success: true, serverName: data.ServerName || "Jellyfin", version: data.Version };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function searchOnServer(base, params, headers) {
    // 1. Person search
    if (params.type === "person" && params.title) {
      const resp = await gmFetch(`${base}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Person=${encodeURIComponent(params.title)}&Limit=30`, { headers, timeout: 5000 });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const items = data.Items || [];
      if (items.length > 0) {
        return {
          found: true,
          count: items.length,
          jellyfinURL: `${base}/web/#/search.html?query=${encodeURIComponent(params.title)}`,
          items: items.slice(0, 3)
        };
      }
      return { found: false };
    }

    // Helper for matching item against search parameters (provider IDs or title / originalTitle)
    function isItemMatching(item, target, origTarget, year) {
      if (!item) return false;
      const pIds = item.ProviderIds || {};
      if (params.imdbId && pIds.Imdb && pIds.Imdb.toLowerCase() === params.imdbId.toLowerCase()) return true;
      if (params.tmdbId && pIds.Tmdb && String(pIds.Tmdb) === String(params.tmdbId)) return true;

      const name = normalizeStr(item.Name || "");
      const origName = item.OriginalTitle ? normalizeStr(item.OriginalTitle) : "";

      const titleMatched = (target && (titleSimilarMatch(name, target) || (origName && titleSimilarMatch(origName, target))))
                        || (origTarget && (titleSimilarMatch(name, origTarget) || (origName && titleSimilarMatch(origName, origTarget))));

      if (!titleMatched) return false;

      const y = extractYear(item);
      if (year && y) {
        if (Math.abs(y - year) > 2) return false; // Allow ±2 year tolerance
      }
      return true;
    }

    // 2. Search both Movie and Series by title
    const searchTitle = params.title;
    if (!searchTitle) return { found: false };

    const queryUrl = `${base}/Items?SearchTerm=${encodeURIComponent(searchTitle)}&IncludeItemTypes=Movie,Series&Recursive=true&Fields=ProviderIds,OriginalTitle&Limit=30`;
    const resp = await gmFetch(queryUrl, { headers, timeout: 5000 });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    const items = data.Items || [];

    const target = normalizeStr(searchTitle);
    const origTarget = params.originalTitle ? normalizeStr(params.originalTitle) : null;

    for (const item of items) {
      if (isItemMatching(item, target, origTarget, params.year)) {
        return { found: true, item, jellyfinURL: `${base}/web/#/details?id=${item.Id}` };
      }
    }

    // 4. Try originalTitle text-based search if different
    if (params.originalTitle && params.originalTitle !== params.title) {
      const queryUrl2 = `${base}/Items?SearchTerm=${encodeURIComponent(params.originalTitle)}&IncludeItemTypes=${itemTypes}&Recursive=true&Fields=ProviderIds,OriginalTitle&Limit=30`;
      const resp2 = await gmFetch(queryUrl2, { headers, timeout: 4000 });
      if (!resp2.ok) throw new Error(`HTTP ${resp2.status}`);

      const data2 = await resp2.json();
      const items2 = data2.Items || [];

      for (const item of items2) {
        if (isItemMatching(item, target, origTarget, params.year)) {
          return { found: true, item, jellyfinURL: `${base}/web/#/details?id=${item.Id}` };
        }
      }
    }

    return { found: false };
  }

  async function handleSearch(params, config) {
    if (!config.jellyfin_api_key) {
      return { found: false, error: "No API key configured", configMissing: true };
    }

    const urls = (config.jellyfin_urls || []).filter(Boolean);
    if (urls.length === 0) {
      return { found: false, error: "No URLs configured", configMissing: true };
    }

    const headers = getJellyfinHeaders(config.jellyfin_api_key);

    // Ustawienie ostatnio działającego URL na początku tablicy
    const lastWorkingUrl = GM_getValue("last_working_url", "");
    const sortedUrls = [...urls];
    if (lastWorkingUrl && sortedUrls.includes(lastWorkingUrl)) {
      const idx = sortedUrls.indexOf(lastWorkingUrl);
      sortedUrls.splice(idx, 1);
      sortedUrls.unshift(lastWorkingUrl);
    }

    // Run parallel searches with Promise.any
    const searchPromises = sortedUrls.map(async (raw) => {
      const base = raw.replace(/\/$/, '');
      try {
        const res = await searchOnServer(base, params, headers);
        // Zapisz pomyślne połączenie
        GM_setValue("last_working_url", raw);
        return res;
      } catch (err) {
        console.warn(`[JK] Server search failed on ${raw}:`, err);
        throw err;
      }
    });

    try {
      return await Promise.any(searchPromises);
    } catch (e) {
      console.error("[JK] All server search attempts failed:", e.errors || e);
      return { found: false, error: "All servers unreachable" };
    }
  }

  // --- Telegram Messaging ---
  async function testTelegram(botToken, chatId) {
    if (!botToken || !chatId) {
      return { ok: false, error: "Telegram parameters missing" };
    }
    try {
      const resp = await gmFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🟢 *Jellyfin Checker Userscript*\nConnection test successful!",
          parse_mode: "Markdown"
        })
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.description || "Telegram API Error");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function requestAdd(meta, config, sourceURL) {
    const botToken = config.telegram_bot_token;
    const chatId = config.telegram_chat_id;
    if (!botToken || !chatId) {
      return { ok: false, error: "Telegram not configured" };
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

    try {
      const resp = await gmFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines,
          parse_mode: "Markdown",
          disable_notification: true
        })
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.description || "Telegram error");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // --- Site detection & Metadata extraction ---
  function detectSite() {
    const url = window.location.href;
    if (url.includes("imdb.com/title/")) {
      const match = url.match(/title\/(tt[\d]+)/);
      return match ? { name: "imdb", id: match[1] } : { name: "imdb" };
    }
    if (url.includes("imdb.com/name/")) {
      const match = url.match(/name\/(nm[\d]+)/);
      return match ? { name: "imdb-person", id: match[1] } : { name: "imdb-person" };
    }
    if (url.includes("filmweb.pl/film/") || url.includes("filmweb.pl/serial/")) {
      let path = url.split(/[?#]/)[0];
      path = path.split("/episode/")[0];
      const nums = path.match(/\d+/g);
      return { name: "filmweb", id: nums ? nums[nums.length - 1] : null };
    }
    if (url.includes("filmweb.pl/person/")) {
      const match = url.match(/-([0-9]+)$/);
      return match ? { name: "filmweb-person", id: match[1] } : { name: "filmweb-person" };
    }
    if (url.includes("themoviedb.org/person/")) {
      const match = url.match(/\/(\d+)/);
      return match ? { name: "tmdb-person", id: match[1] } : { name: "tmdb-person" };
    }
    if (url.includes("themoviedb.org/movie/") || url.includes("themoviedb.org/tv/")) {
      const match = url.match(/\/(\d+)/);
      return match ? { name: "tmdb", type: url.includes("/movie/") ? "movie" : "tv", id: match[1] } : { name: "tmdb" };
    }
    return null;
  }

  // Helper to retrieve all JSON-LD parsed objects from the document
  function getLdJsonObjects() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const results = [];
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (Array.isArray(data)) {
          results.push(...data);
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data['@graph'])) {
            results.push(...data['@graph']);
          } else {
            results.push(data);
          }
        }
      } catch (e) {}
    });
    return results;
  }

  function extractIMDB(imdbId) {
    let title = null;
    let year = null;
    let type = "movie";

    const ldObjects = getLdJsonObjects();
    for (const data of ldObjects) {
      const t = data['@type'] || '';
      if (t === 'TVEpisode') {
        type = "tv";
        if (data.partOfSeries && data.partOfSeries.name) title = cleanText(data.partOfSeries.name);
        if (!title && data.name) title = cleanText(data.name);
        if (data.datePublished) year = parseInt(data.datePublished.split('-')[0]);
        break;
      } else if (t === 'TVSeries' || t === 'TVSeason' || t === 'TVMiniSeries' || t === 'CreativeWork') {
        if (!title && data.name) title = cleanText(data.name);
        if (t === 'TVSeries' || t === 'TVSeason' || t === 'TVMiniSeries') type = "tv";
        if (data.datePublished) year = parseInt(data.datePublished.split('-')[0]);
        if (data.startDate) year = parseInt(data.startDate.split('-')[0]);
        if (t === 'TVSeries' || t === 'TVMiniSeries') break;
      } else if (t === 'Movie') {
        if (!title && data.name) title = cleanText(data.name);
        if (data.datePublished) year = parseInt(data.datePublished.split('-')[0]);
        break;
      }
    }

    if (!title) {
      const h1 = document.querySelector("h1[data-testid='hero__pageTitle'] span.hero__primary-text, h1[data-testid='hero__pageTitle'], h1");
      if (h1) title = cleanText(h1.textContent);
    }

    const og = document.querySelector('meta[property="og:title"]');
    if (og && og.content) {
      if (og.content.includes("TV Series") || og.content.includes("TV Mini Series") || og.content.includes("TV Special")) {
        type = "tv";
      }
      const m = og.content.match(/^([^(]+?)(?:\s*\([^)]*?(\d{4})[^)]*\))?/);
      if (m) {
        if (!title) title = cleanText(m[1].replace(/\s*(?:—|–|⋆|⭐|★).*/, ''));
        if (m[2] && !year) year = parseInt(m[2]);
      }
    }

    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType && ogType.content && (ogType.content.includes("tv_show") || ogType.content.includes("tv_series"))) {
      type = "tv";
    }

    if (type !== "tv") {
      const subnav = document.querySelector("[data-testid='hero-subnav-bar-left']");
      if (subnav && (subnav.textContent.includes("TV Series") || subnav.textContent.includes("TV Mini Series"))) {
        type = "tv";
      }
    }

    return title ? { imdbId, title, year, type } : null;
  }

  function stripRomanSuffix(name) {
    return name.replace(/\s*\([IVXLCDM]+\)\s*$/, '').replace(/\s+[IVXLCDM]+\s*$/, '').trim();
  }

  function extractIMDBPerson(imdbId) {
    let title = null;
    const ldObjects = getLdJsonObjects();
    for (const data of ldObjects) {
      if (data['@type'] === 'Person' && data.name) {
        title = stripRomanSuffix(data.name.trim());
        break;
      }
    }
    if (!title) {
      const el = document.querySelector("h1");
      if (el) title = stripRomanSuffix(el.textContent.trim());
    }
    return title ? { imdbId, title, type: "person" } : null;
  }

  async function extractFilmweb(filmwebId) {
    let title = null;
    let originalTitle = null;
    let year = null;
    let imdbId = null;
    const isTv = window.location.href.includes("/serial/");

    // 1. Try URL regex for year (e.g. /film/Together-2025-10071441)
    const urlMatch = window.location.pathname.match(/-(\d{4})-(\d+)(?:[?#]|$)/);
    if (urlMatch) {
      year = parseInt(urlMatch[1]);
    }

    // 2. Fetch Filmweb internal API (fast, authoritative metadata)
    if (filmwebId) {
      try {
        const itemType = isTv ? "serial" : "film";
        const infoResp = await gmFetch(`https://www.filmweb.pl/api/v1/${itemType}/${filmwebId}/info`, { timeout: 4000 });
        if (infoResp.ok) {
          const info = await infoResp.json();
          if (info) {
            if (info.title) title = cleanText(info.title);
            if (info.originalTitle) originalTitle = cleanText(info.originalTitle);
            if (info.year) year = info.year;
          }
        }
      } catch (e) {
        console.debug("[JK] Filmweb info API fallback error:", e);
      }
    }

    // 3. Parse ALL ld+json tags on page for additional metadata / imdbId
    const ldObjects = getLdJsonObjects();
    for (const data of ldObjects) {
      const type = data['@type'];
      if (type === 'Movie' || type === 'TVSeries' || type === 'TVSeason' || type === 'TVEpisode' || type === 'CreativeWork') {
        if (!title && data.name) title = cleanText(data.name);
        if (!originalTitle && data.alternateName) originalTitle = cleanText(data.alternateName);
        if (!year) {
          const dateStr = data.datePublished || data.dateCreated || data.releaseDate || data.startDate;
          if (dateStr) {
            const ym = String(dateStr).match(/\d{4}/);
            if (ym) year = parseInt(ym[0]);
          }
        }
      }
      if (!imdbId && data.sameAs) {
        const sameAsArr = Array.isArray(data.sameAs) ? data.sameAs : [data.sameAs];
        for (const s of sameAsArr) {
          if (typeof s === 'string') {
            const im = s.match(/title\/(tt\d+)/);
            if (im) { imdbId = im[1]; break; }
          }
        }
      }
    }

    // 4. Fallback DOM selectors for title
    if (!title) {
      const t = document.querySelector("h1.filmCoverSection__title, h1[itemprop='name'], .filmCoverSection__title, .filmHeaderSection__title, h1");
      if (t) title = cleanText(t.textContent);
    }

    // 5. Fallback DOM selectors for year if still missing
    if (!year) {
      const yearEl = document.querySelector(".filmCoverSection__year, .filmHeaderSection__year, span.filmHeaderSection__year, a[href*='year']");
      if (yearEl) {
        const m = yearEl.textContent.match(/(\d{4})/);
        if (m) year = parseInt(m[1]);
      }
    }

    // 6. Fallback DOM selectors for original title
    if (!originalTitle) {
      const otInfoEl = document.querySelector(".filmInfo__group--originalTitle .filmInfo__info, [data-i18n='film:info.original-title.label'] ~ .filmInfo__info, [data-i18n='film:info.original-title.label'] + .filmInfo__info, .filmHeaderSection__originalTitle, .filmHeaderSection__alias");
      if (otInfoEl && otInfoEl.textContent.trim()) {
        const otText = cleanText(otInfoEl.textContent);
        if (title && otText !== title) originalTitle = otText;
      }

      if (!originalTitle) {
        const coverOtEl = document.querySelector(".filmCoverSection__originalTitle");
        if (coverOtEl) {
          const clone = coverOtEl.cloneNode(true);
          clone.querySelectorAll(".filmCoverSection__year").forEach(el => el.remove());
          const otText = cleanText(clone.textContent);
          if (title && otText && otText !== title) originalTitle = otText;
        }
      }
    }

    if (originalTitle && title && originalTitle.toLowerCase() === title.toLowerCase()) {
      originalTitle = null;
    }

    return title ? {
      title,
      originalTitle,
      year,
      filmwebId,
      imdbId,
      type: isTv ? "tv" : "movie"
    } : null;
  }

  function extractFilmwebPerson() {
    let imdbId = null;
    let title = null;

    const ldObjects = getLdJsonObjects();
    for (const data of ldObjects) {
      if (data['@type'] === 'Person' || data.name) {
        if (!title && data.name && (data['@type'] === 'Person' || !data['@type'])) title = cleanText(data.name);
        if (!imdbId && data.sameAs) {
          const sameAsArr = Array.isArray(data.sameAs) ? data.sameAs : [data.sameAs];
          for (const s of sameAsArr) {
            if (typeof s === 'string') {
              const m = s.match(/name\/(nm\d+)/);
              if (m) { imdbId = m[1]; break; }
            }
          }
        }
      }
    }

    if (!title) {
      const el = document.querySelector("h1.personHeaderSection__name, h1.personCoverSection__name, h1[itemprop='name'], h1");
      if (el) title = stripRomanSuffix(cleanText(el.textContent));
    }

    return title ? { title, imdbId, type: "person" } : null;
  }

  function extractTMDB(tmdbId, type) {
    const nextData = document.getElementById("__NEXT_DATA__");
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent);
        const pageProps = data.props?.pageProps;
        const details = pageProps?.[type === "movie" ? "movie" : "tv"]
                      || pageProps?.media
                      || pageProps?.[`${type}Data`];
        if (details) {
          const title = details.title || details.name || details.original_title;
          const dateStr = details.release_date || details.first_air_date || "";
          const year = dateStr ? parseInt(dateStr.split('-')[0]) : null;
          const imdbId = details.imdb_id || null;
          if (title) return { tmdbId, imdbId, title, year, type };
        }
      } catch (e) {}
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      return { tmdbId, title: ogTitle.content, year: null, type };
    }
    const h1 = document.querySelector("h1");
    return h1 ? { tmdbId, title: h1.textContent.trim(), year: null, type } : null;
  }

  // (extractTMDBPerson and waitForElement remain unchanged...)
  function extractTMDBPerson(personId) {
    const nextData = document.getElementById("__NEXT_DATA__");
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent);
        const details = data.props?.pageProps?.person || data.props?.pageProps?.media;
        const name = details?.name || details?.title;
        if (name) return { tmdbId: personId, title: name, type: "person" };
      } catch (e) {}
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) return { tmdbId: personId, title: ogTitle.content, type: "person" };
    const h1 = document.querySelector("h1");
    return h1 ? { tmdbId: personId, title: h1.textContent.trim(), type: "person" } : null;
  }

  function waitForElement(selector, maxWait = 5000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const start = Date.now();
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); return; }
        if (Date.now() - start > maxWait) { observer.disconnect(); resolve(null); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // --- Badge Injection UI ---
  function showBadge(text, url, gradient, requestable = null, metadata = null) {
    removeExistingBadge();

    const wrapper = document.createElement("div");
    wrapper.id = "jellyfin-keeper-wrapper";
    wrapper.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

    const container = document.createElement("div");
    container.id = "jellyfin-keeper-badge";
    container.style.cssText = `display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.25);background:${gradient};cursor:${url && url !== "#" ? "pointer" : "default"};`;

    // Icon area
    const iconWrap = document.createElement("span");
    iconWrap.style.cssText = `padding:0 10px;display:flex;align-items:center;flex-shrink:0;`;
    const icon = document.createElement("img");
    icon.src = JELLYFIN_ICON;
    icon.alt = "J";
    icon.style.cssText = "width:24px;height:24px;";
    iconWrap.appendChild(icon);
    container.appendChild(iconWrap);

    // Text area
    const inner = document.createElement("span");
    inner.textContent = text;
    inner.style.cssText = `color:white;padding:10px 14px 10px 0;display:flex;align-items:center;font-size:15px;font-weight:600;white-space:nowrap;`;
    container.appendChild(inner);

    // Refresh Button (↻ icon)
    const refreshBtn = document.createElement("button");
    refreshBtn.innerHTML = "&#x21BB;"; // ↻
    refreshBtn.title = "Refresh / Odśwież";
    refreshBtn.style.cssText = "background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);border:none;font-size:16px;padding:0 8px;cursor:pointer;line-height:1;transition:background .2s,color .2s,transform .5s ease;flex-shrink:0;";
    refreshBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (metadata) {
        const key = metadata.imdbId || metadata.tmdbId || `title_${normalizeStr(metadata.title)}_${metadata.year || ''}`;
        const cache = GM_getValue("search_cache_data", {});
        delete cache[key];
        GM_setValue("search_cache_data", cache);
      }
      refreshBtn.style.transform = "rotate(360deg)";
      setTimeout(() => {
        run(true);
      }, 300);
    });
    refreshBtn.addEventListener("mouseenter", () => {
      refreshBtn.style.background = "rgba(255,255,255,.15)";
      refreshBtn.style.color = "#fff";
    });
    refreshBtn.addEventListener("mouseleave", () => {
      refreshBtn.style.background = "rgba(255,255,255,.07)";
      refreshBtn.style.color = "rgba(255,255,255,.75)";
    });
    container.appendChild(refreshBtn);

    // Settings Button (Gear icon)
    const gearBtn = document.createElement("button");
    gearBtn.innerHTML = "&#9881;"; // ⚙
    gearBtn.title = "Settings";
    gearBtn.style.cssText = "background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);border:none;font-size:16px;padding:0 8px;cursor:pointer;line-height:1;transition:background .2s,color .2s;flex-shrink:0;";
    gearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSettings();
    });
    gearBtn.addEventListener("mouseenter", () => {
      gearBtn.style.background = "rgba(255,255,255,.15)";
      gearBtn.style.color = "#fff";
    });
    gearBtn.addEventListener("mouseleave", () => {
      gearBtn.style.background = "rgba(255,255,255,.07)";
      gearBtn.style.color = "rgba(255,255,255,.75)";
    });
    container.appendChild(gearBtn);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u00D7";
    closeBtn.title = "Close";
    closeBtn.style.cssText = "background:rgba(0,0,0,.15);color:rgba(255,255,255,.6);border:none;font-size:20px;padding:0 10px;cursor:pointer;line-height:1;flex-shrink:0;";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      wrapper.remove();
    });
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#fff"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "rgba(255,255,255,.6)"; });
    container.appendChild(closeBtn);

    // Click behavior
    if (url && url !== "#") {
      container.addEventListener("click", (e) => {
        if (e.target === closeBtn || e.target === gearBtn || e.target === refreshBtn) return;
        window.open(url, "_blank");
      });
      container.addEventListener("mouseenter", () => { container.style.filter = "brightness(1.12)"; });
      container.addEventListener("mouseleave", () => { container.style.filter = "none"; });
    }

    wrapper.appendChild(container);

    // Request Button
    if (requestable && metadata?.title) {
      const config = getConfig();
      const lang = getLang();
      const t = i18n[lang] || i18n.en;

      const reqBtn = document.createElement("button");
      reqBtn.textContent = t.reqBtn;
      reqBtn.style.cssText = "background:#1e293b;border:1px solid #475569;color:#e2e8f0;padding:6px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s;font-family:inherit;box-shadow:0 3px 6px rgba(0,0,0,.2);";
      reqBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        reqBtn.style.pointerEvents = "none";
        reqBtn.style.opacity = "0.6";
        reqBtn.textContent = t.reqSending;

        const res = await requestAdd(metadata, config, window.location.href);
        if (res.ok) {
          reqBtn.style.background = "#064e3b";
          reqBtn.style.borderColor = "#15803d";
          reqBtn.style.color = "#6ee7b7";
          reqBtn.textContent = t.reqSent;
          reqBtn.style.cursor = "default";
          setTimeout(() => reqBtn.remove(), 4000);
        } else {
          reqBtn.style.background = "#7f1d1d";
          reqBtn.style.borderColor = "#991b1b";
          reqBtn.style.color = "#fca5a5";
          reqBtn.textContent = t.reqFail(res.error || t.reqErrFallback);
          reqBtn.style.cursor = "default";
        }
        reqBtn.style.pointerEvents = "auto";
        reqBtn.style.opacity = "1";
      });
      reqBtn.addEventListener("mouseenter", () => { reqBtn.style.background = "#334155"; });
      reqBtn.addEventListener("mouseleave", () => { reqBtn.style.background = "#1e293b"; });
      wrapper.appendChild(reqBtn);
    }

    document.body.appendChild(wrapper);
  }

  function removeExistingBadge() {
    document.getElementById("jellyfin-keeper-wrapper")?.remove();
  }

  // --- Beautiful overlay Settings Panel ---
  function injectSettingsStyle() {
    if (document.getElementById("jk-settings-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "jk-settings-styles";
    styleEl.textContent = `
      #jk-slider-sound:before, #jk-slider-req:before {
        content: ""; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;
      }
      #jk-toggle-sound:checked + #jk-slider-sound { background-color: #15803d !important; }
      #jk-toggle-request:checked + #jk-slider-req { background-color: #15803d !important; }
      #jk-toggle-sound:checked + #jk-slider-sound:before { transform: translateX(20px); }
      #jk-toggle-request:checked + #jk-slider-req:before { transform: translateX(20px); }
      
      .jk-btn-active {
        border-color: #0082C8 !important;
        color: #e2e8f0 !important;
        background: rgba(0, 130, 200, 0.15) !important;
      }
      #jellyfin-checker-settings input:focus {
        outline: none !important;
        border-color: #0082C8 !important;
        box-shadow: 0 0 0 3px rgba(0, 130, 200, 0.2) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  function openSettings() {
    injectSettingsStyle();
    let modal = document.getElementById("jellyfin-checker-settings");
    if (modal) {
      modal.style.display = "flex";
      loadModalValues();
      return;
    }

    modal = document.createElement("div");
    modal.id = "jellyfin-checker-settings";
    modal.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(15, 23, 42, 0.6);backdrop-filter:blur(8px);display:flex;justify-content:center;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;line-height:1.4;";

    modal.innerHTML = `
      <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;width:100%;max-width:500px;padding:24px;box-shadow:0 12px 30px rgba(0,0,0,0.5);box-sizing:border-box;max-height:92vh;overflow-y:auto;position:relative;">
        
        <!-- Header -->
        <div style="display:flex;justify-content:between;align-items:center;border-bottom:1px solid #334155;padding-bottom:12px;margin-bottom:20px;justify-content:space-between;">
          <h2 id="jk-title" style="margin:0;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;color:#fff;">
            🎬 Jellyfin Checker Ustawienia
          </h2>
          <div style="display:flex;gap:4px;">
            <button id="btn-jk-pl" style="background:none;border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:4px;">PL</button>
            <button id="btn-jk-en" style="background:none;border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:4px;">EN</button>
          </div>
        </div>

        <!-- Section 1: Server Config -->
        <div style="margin-bottom:20px;">
          <h3 id="jk-sec-server" style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:0 0 12px 0;">Jellyfin Server</h3>
          <div style="margin-bottom:12px;">
            <label id="jk-lbl-url1" style="display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Jellyfin URL #1</label>
            <input type="text" id="jk-url-1" placeholder="http://localhost:8096" style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;">
          </div>
          <div style="margin-bottom:12px;">
            <label id="jk-lbl-url2" style="display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Jellyfin URL #2 (Opcjonalny)</label>
            <input type="text" id="jk-url-2" placeholder="https://jellyfin.example.com" style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;">
            <p id="jk-hint-url" style="font-size:11px;color:#475569;margin:4px 0 0 0;"></p>
          </div>
          <div style="margin-bottom:16px;">
            <label id="jk-lbl-key" style="display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Klucz API</label>
            <input type="password" id="jk-apikey" placeholder="••••••••" style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;">
            <p id="jk-hint-key" style="font-size:11px;color:#475569;margin:4px 0 0 0;"></p>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-jk-save-server" style="flex:1;background:#0082C8;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;transition:filter .2s;">Zapisz</button>
            <button id="btn-jk-test-server" style="flex:1;background:#A30C6B;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;transition:filter .2s;">Testuj Serwer</button>
          </div>
          <div id="jk-status-server" style="display:none;margin-top:10px;padding:8px 12px;border-radius:6px;font-size:12px;"></div>
        </div>

        <!-- Section 2: Telegram Config -->
        <div style="margin-bottom:20px;border-top:1px solid #334155;padding-top:16px;">
          <h3 id="jk-sec-tg" style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:0 0 12px 0;">Telegram — Prośby o dodanie</h3>
          <div style="margin-bottom:12px;">
            <label id="jk-lbl-bot" style="display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Bot Token</label>
            <input type="password" id="jk-bot-token" placeholder="123456:ABC-DEF..." style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;">
            <p id="jk-hint-bot" style="font-size:11px;color:#475569;margin:4px 0 0 0;"></p>
          </div>
          <div style="margin-bottom:16px;">
            <label id="jk-lbl-chat" style="display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Chat ID</label>
            <input type="text" id="jk-chat-id" placeholder="-1001234567890" style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:13px;font-family:monospace;box-sizing:border-box;">
            <p id="jk-hint-chat" style="font-size:11px;color:#475569;margin:4px 0 0 0;"></p>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-jk-save-tg" style="flex:1;background:#0082C8;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;transition:filter .2s;">Zapisz</button>
            <button id="btn-jk-test-tg" style="flex:1;background:#A30C6B;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;transition:filter .2s;">Testuj Telegram</button>
          </div>
          <div id="jk-status-tg" style="display:none;margin-top:10px;padding:8px 12px;border-radius:6px;font-size:12px;"></div>
        </div>

        <!-- Section 3: General Options -->
        <div style="margin-bottom:24px;border-top:1px solid #334155;padding-top:16px;">
          <h3 id="jk-sec-opts" style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:0 0 12px 0;">Ustawienia</h3>
          
          <!-- Sound toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div>
              <div id="jk-lbl-sound" style="font-size:13px;font-weight:600;color:#e2e8f0;">Powiadomienia dźwiękowe</div>
              <div id="jk-lbl-sound-sub" style="font-size:11px;color:#64748b;">Piszcz przy znalezieniu filmu</div>
            </div>
            <label style="position:relative;display:inline-block;width:40px;height:20px;">
              <input type="checkbox" id="jk-toggle-sound" style="opacity:0;width:0;height:0;">
              <span id="jk-slider-sound" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#475569;transition:.4s;border-radius:20px;"></span>
            </label>
          </div>

          <!-- Request toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div id="jk-lbl-req" style="font-size:13px;font-weight:600;color:#e2e8f0;">Przycisk "Poproś o dodanie"</div>
              <div id="jk-lbl-req-sub" style="font-size:11px;color:#64748b;">Pokazuj gdy film nie jest na Jellyfin</div>
            </div>
            <label style="position:relative;display:inline-block;width:40px;height:20px;">
              <input type="checkbox" id="jk-toggle-request" style="opacity:0;width:0;height:0;">
              <span id="jk-slider-req" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#475569;transition:.4s;border-radius:20px;"></span>
            </label>
          </div>
        </div>

        <!-- Footer / Close -->
        <div style="display:flex;justify-content:flex-end;border-top:1px solid #334155;padding-top:16px;">
          <button id="btn-jk-close" style="background:#475569;color:white;border:none;padding:8px 18px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;transition:filter .2s;">Zamknij</button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    // Event Wireups
    document.getElementById("btn-jk-close").addEventListener("click", () => { modal.style.display = "none"; });
    document.getElementById("btn-jk-pl").addEventListener("click", () => { changeLanguage("pl"); });
    document.getElementById("btn-jk-en").addEventListener("click", () => { changeLanguage("en"); });

    // Server saving & testing
    document.getElementById("btn-jk-save-server").addEventListener("click", () => {
      const url1 = document.getElementById("jk-url-1").value.trim();
      const url2 = document.getElementById("jk-url-2").value.trim();
      const key = document.getElementById("jk-apikey").value.trim();

      if (!url1 || !key) {
        showStatus("jk-status-server", true, badgeTextSync("fillFields"));
        return;
      }

      const cfg = getConfig();
      cfg.jellyfin_urls = [url1, url2].filter(Boolean);
      cfg.jellyfin_api_key = key;
      saveConfig(cfg);
      showStatus("jk-status-server", false, badgeTextSync("saved"));
      restartApp();
    });

    document.getElementById("btn-jk-test-server").addEventListener("click", async () => {
      const btn = document.getElementById("btn-jk-test-server");
      btn.disabled = true;
      btn.textContent = "...";

      const url1 = document.getElementById("jk-url-1").value.trim();
      const url2 = document.getElementById("jk-url-2").value.trim();
      const key = document.getElementById("jk-apikey").value.trim();
      const urls = [url1, url2].filter(Boolean);

      let working = null;
      for (const url of urls) {
        const res = await testConnection(url, key);
        if (res.success) { working = res; break; }
      }

      btn.disabled = false;
      btn.textContent = badgeTextSync("testBtn");

      if (working) {
        showStatus("jk-status-server", false, badgeTextSync("connected", working));
      } else {
        showStatus("jk-status-server", true, badgeTextSync("connectFail", "Unreachable"));
      }
    });

    // Telegram saving & testing
    document.getElementById("btn-jk-save-tg").addEventListener("click", () => {
      const bot = document.getElementById("jk-bot-token").value.trim();
      const chat = document.getElementById("jk-chat-id").value.trim();

      const cfg = getConfig();
      cfg.telegram_bot_token = bot;
      cfg.telegram_chat_id = chat;
      saveConfig(cfg);
      showStatus("jk-status-tg", false, badgeTextSync("saved"));
      restartApp();
    });

    document.getElementById("btn-jk-test-tg").addEventListener("click", async () => {
      const btn = document.getElementById("btn-jk-test-tg");
      btn.disabled = true;
      btn.textContent = "...";

      const bot = document.getElementById("jk-bot-token").value.trim();
      const chat = document.getElementById("jk-chat-id").value.trim();

      const res = await testTelegram(bot, chat);
      btn.disabled = false;
      btn.textContent = badgeTextSync("testTgBtn");

      if (res.ok) {
        showStatus("jk-status-tg", false, badgeTextSync("testSent"));
      } else {
        showStatus("jk-status-tg", true, badgeTextSync("testFail", res.error));
      }
    });

    // General toggles autosave
    const toggleSound = document.getElementById("jk-toggle-sound");
    toggleSound.addEventListener("change", () => {
      const cfg = getConfig();
      cfg.enable_sound_notifications = toggleSound.checked;
      saveConfig(cfg);
    });

    const toggleReq = document.getElementById("jk-toggle-request");
    toggleReq.addEventListener("change", () => {
      const cfg = getConfig();
      cfg.enable_request_button = toggleReq.checked;
      saveConfig(cfg);
      restartApp();
    });

    loadModalValues();
  }

  function loadModalValues() {
    const cfg = getConfig();
    document.getElementById("jk-url-1").value = cfg.jellyfin_urls?.[0] || "";
    document.getElementById("jk-url-2").value = cfg.jellyfin_urls?.[1] || "";
    document.getElementById("jk-apikey").value = cfg.jellyfin_api_key || "";
    document.getElementById("jk-bot-token").value = cfg.telegram_bot_token || "";
    document.getElementById("jk-chat-id").value = cfg.telegram_chat_id || "";
    document.getElementById("jk-toggle-sound").checked = cfg.enable_sound_notifications ?? false;
    document.getElementById("jk-toggle-request").checked = cfg.enable_request_button ?? false;

    changeLanguage(cfg.language || "en", false); // apply initial language
  }

  function changeLanguage(lang, save = true) {
    const cfg = getConfig();
    if (save) {
      cfg.language = lang;
      saveConfig(cfg);
    }

    const t = i18n[lang] || i18n.en;

    // Apply translations
    document.getElementById("jk-title").textContent = "🎬 " + t.settingsTitle;
    document.getElementById("jk-sec-server").textContent = t.headingServer || "Jellyfin Server";
    document.getElementById("jk-lbl-url1").textContent = t.urlLabel;
    document.getElementById("jk-lbl-url2").textContent = t.urlLabelExt;
    document.getElementById("jk-hint-url").textContent = t.hintApi;
    document.getElementById("jk-lbl-key").textContent = t.keyLabel;
    document.getElementById("jk-hint-key").textContent = t.hintKey;
    document.getElementById("btn-jk-save-server").textContent = t.saveBtn;
    document.getElementById("btn-jk-test-server").textContent = t.testBtn;

    document.getElementById("jk-sec-tg").textContent = t.headingTelegram || "Telegram";
    document.getElementById("jk-lbl-bot").textContent = t.botLabel;
    document.getElementById("jk-hint-bot").textContent = t.hintBot;
    document.getElementById("jk-lbl-chat").textContent = t.chatLabel;
    document.getElementById("jk-hint-chat").textContent = t.hintChat;
    document.getElementById("btn-jk-save-tg").textContent = t.saveBtn;
    document.getElementById("btn-jk-test-tg").textContent = t.testTgBtn;

    document.getElementById("jk-sec-opts").textContent = t.headingSettings || "Settings";
    document.getElementById("jk-lbl-sound").textContent = t.toggleSound;
    document.getElementById("jk-lbl-sound-sub").textContent = t.toggleSoundSub;
    document.getElementById("jk-lbl-req").textContent = t.toggleRequest;
    document.getElementById("jk-lbl-req-sub").textContent = t.toggleRequestSub;
    document.getElementById("btn-jk-close").textContent = t.closeTitle;

    // Toggle active classes
    document.getElementById("btn-jk-pl").className = lang === "pl" ? "jk-btn-active" : "";
    document.getElementById("btn-jk-en").className = lang === "en" ? "jk-btn-active" : "";

    // inline style cleanup
    document.getElementById("btn-jk-pl").style.cssText = "background:none;border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:4px;";
    document.getElementById("btn-jk-en").style.cssText = "background:none;border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:4px;";
    if (lang === "pl") {
      document.getElementById("btn-jk-pl").style.borderColor = "#0082C8";
      document.getElementById("btn-jk-pl").style.color = "#e2e8f0";
      document.getElementById("btn-jk-pl").style.background = "rgba(0, 130, 200, 0.15)";
    } else {
      document.getElementById("btn-jk-en").style.borderColor = "#0082C8";
      document.getElementById("btn-jk-en").style.color = "#e2e8f0";
      document.getElementById("btn-jk-en").style.background = "rgba(0, 130, 200, 0.15)";
    }

    if (save) restartApp();
  }

  function showStatus(elemId, isError, message) {
    const el = document.getElementById(elemId);
    el.style.display = "block";
    el.textContent = message;
    el.style.background = isError ? "#7f1d1d" : "#064e3b";
    el.style.color = isError ? "#fca5a5" : "#6ee7b7";
    if (!isError) {
      setTimeout(() => { el.style.display = "none"; }, 4000);
    }
  }

  function badgeTextSync(key, ...args) {
    const lang = getConfig().language || "en";
    const t = i18n[lang] || i18n.en;
    const val = t[key];
    return typeof val === "function" ? val(...args) : val;
  }

  // --- Register Tampermonkey Menu Command ---
  GM_registerMenuCommand("Settings / Ustawienia", openSettings);

  // --- App Bootstrap ---
  async function run(bypassCache = false) {
    console.log("[JK] Loading Userscript Jellyfin Checker v0.9.5...");

    // Auto-clear cache on version upgrade
    const CURRENT_VERSION = "0.9.5";
    const storedVer = GM_getValue("last_installed_version", "");
    if (storedVer !== CURRENT_VERSION) {
      GM_setValue("search_cache_data", {});
      GM_setValue("last_installed_version", CURRENT_VERSION);
      console.log(`[JK] Upgraded to v${CURRENT_VERSION}, cleared search cache.`);
      bypassCache = true;
    }

    const site = detectSite();
    if (!site) return;

    // Don't inject on Jellyfin page itself
    const url = window.location.href;
    if (url.includes("/web/") && (url.includes("#/details") || url.includes("#!/details"))) return;

    if (!site.name.startsWith("tmdb")) {
      await waitForElement("h1", 4000);
    }

    let metadata = null;
    switch (site.name) {
      case "imdb": metadata = extractIMDB(site.id); break;
      case "imdb-person": metadata = extractIMDBPerson(site.id); break;
      case "filmweb": metadata = await extractFilmweb(site.id); break;
      case "filmweb-person": metadata = extractFilmwebPerson(); break;
      case "tmdb": metadata = extractTMDB(site.id, site.type); break;
      case "tmdb-person": metadata = extractTMDBPerson(site.id); break;
    }

    console.log("[JK] Scraped metadata:", metadata);
    if (!metadata || !metadata.title) {
      showBadge(await badgeText("noTitle"), null, "linear-gradient(135deg, #b45309, #78350f)");
      return;
    }

    const config = getConfig();
    if (!config.jellyfin_api_key) {
      showBadge(await badgeText("needConfig"), null, "linear-gradient(135deg, #b45309, #78350f)");
      return;
    }

    // Sprawdzenie pamięci podręcznej (Cache)
    let response = bypassCache ? null : getCachedResult(metadata);
    let isCacheHit = !bypassCache && !!response;
    if (response) {
      console.log("[JK] Cache hit (użyto zapamiętanego wyniku):", response);
    } else {
      isCacheHit = false;
      showBadge(await badgeText("checking"), null, "linear-gradient(135deg, #4338ca, #1e40af)");
      response = await handleSearch(metadata, config);
      console.log("[JK] Search response:", response);

      if (response.configMissing) {
        showBadge(await badgeText("needConfig"), null, "linear-gradient(135deg, #b45309, #78350f)");
        return;
      }
      if (response.error) {
        showBadge(await badgeText("error"), null, "linear-gradient(135deg, #4b5563, #1f2937)");
        return;
      }

      setCachedResult(metadata, response);
    }

    if (response.found) {
      if (response.count !== undefined) {
        showBadge(await badgeText("foundMany", response.count), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)", null, metadata);
      } else {
        showBadge(await badgeText("found"), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)", null, metadata);
      }
      if (config.enable_sound_notifications && !isCacheHit) {
        playBeep();
      }
    } else {
      showBadge(await badgeText("notFound"), null, "linear-gradient(135deg, #1a2f42, #991b1b)", config.enable_request_button, metadata);
    }
  }

  function restartApp() {
    removeExistingBadge();
    run(true);
  }

  // --- SPA Navigation (URL Change) Listener ---
  let lastHandledUrl = window.location.href;
  function handleUrlChange() {
    if (window.location.href !== lastHandledUrl) {
      lastHandledUrl = window.location.href;
      console.log("[JK] SPA navigation detected:", lastHandledUrl);
      restartApp();
    }
  }

  const origPushState = history.pushState;
  if (origPushState) {
    history.pushState = function() {
      origPushState.apply(this, arguments);
      handleUrlChange();
    };
  }

  const origReplaceState = history.replaceState;
  if (origReplaceState) {
    history.replaceState = function() {
      origReplaceState.apply(this, arguments);
      handleUrlChange();
    };
  }

  window.addEventListener("popstate", handleUrlChange);
  setInterval(handleUrlChange, 1500);

  // Initial load
  run();

})();
