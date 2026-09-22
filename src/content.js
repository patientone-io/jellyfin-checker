// Jellyfin Checker - Content Script

const JELLYFIN_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='lg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2300D2FF'/><stop offset='50%25' stop-color='%230082C8'/><stop offset='100%25' stop-color='%237928CA'/></linearGradient><linearGradient id='cg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%234EFA8A'/><stop offset='100%25' stop-color='%2300D084'/></linearGradient></defs><circle cx='50' cy='50' r='34' fill='none' stroke='url(%23lg)' stroke-width='12'/><path d='M75 75 L106 106' stroke='url(%23lg)' stroke-width='14' stroke-linecap='round'/><path d='M36 50 L47 62 L67 36' fill='none' stroke='url(%23cg)' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/></svg>";

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
    closeTitle: "Zamknij"
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
    closeTitle: "Close"
  }
};

async function getLang() {
  return new Promise((resolve) => {
    chrome.storage.local.get("config", (r) => {
      resolve((r.config && r.config.language) || "en");
    });
  });
}

async function badgeText(key, ...args) {
  const lang = await getLang();
  const t = i18n[lang] || i18n.pl;
  const val = t[key];
  return typeof val === "function" ? val(...args) : val;
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

function showBadge(text, url, gradient, requestable = null, metadata = null, lang = "en") {
  removeExistingBadge();
  const wrapper = document.createElement("div");
  wrapper.id = "jellyfin-keeper-wrapper";
  wrapper.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

  const container = document.createElement("div");
  container.id = "jellyfin-keeper-badge";
  container.style.cssText = `display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.25);background:${gradient};cursor:${url && url !== "#" ? "pointer" : "default"};`;

  // Icon area
  const iconWrap = document.createElement("span");
  iconWrap.style.cssText = `padding:0 10px 0 10px;display:flex;align-items:center;flex-shrink:0;`;
  const icon = document.createElement("img");
  icon.src = JELLYFIN_ICON;
  icon.alt = "J";
  icon.style.cssText = "width:24px;height:24px;";
  icon.onerror = () => { icon.outerHTML = "🎬"; };
  iconWrap.appendChild(icon);
  container.appendChild(iconWrap);

  // Text area
  const inner = document.createElement("span");
  inner.textContent = text;
  inner.style.cssText = `color:white;padding:10px 16px 10px 0;display:flex;align-items:center;font-size:15px;font-weight:600;white-space:nowrap;`;
  container.appendChild(inner);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u00D7";
  closeBtn.title = (i18n[lang] || i18n.pl).closeTitle;
  closeBtn.style.cssText = "background:rgba(0,0,0,.15);color:rgba(255,255,255,.7);border:none;font-size:20px;padding:0 10px;cursor:pointer;line-height:1;flex-shrink:0;position:relative;z-index:1;";
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); container.remove(); });
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#fff"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "rgba(255,255,255,.7)"; });
  container.appendChild(closeBtn);

  // Whole badge clickable
  if (url && url !== "#") {
    container.addEventListener("click", (e) => { if (e.target === closeBtn) return; window.open(url, "_blank"); });
    container.addEventListener("mouseenter", () => { container.style.filter = "brightness(1.15)"; });
    container.addEventListener("mouseleave", () => { container.style.filter = "none"; });
  }

  // Position: badge first, then request button below
  wrapper.appendChild(container);

  // ─── Request button (when film not on Jellyfin)
  if (requestable && metadata?.title) {
    const t = i18n[lang] || i18n.pl;
    const reqBtn = document.createElement("button");
    reqBtn.textContent = t.reqBtn;
    reqBtn.style.cssText = "background:#1e293b;border:1px solid #475569;color:#e2e8f0;padding:6px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s;font-family:inherit;";
    reqBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      reqBtn.style.pointerEvents = "none";
      reqBtn.style.opacity = "0.6";
      reqBtn.textContent = t.reqSending;
      chrome.runtime.sendMessage({
        action: "request_add",
        meta: metadata,
        sourceURL: window.location.href
      }, (resp) => {
        if (resp && resp.ok) {
          reqBtn.style.background = "#064e3b";
          reqBtn.style.borderColor = "#15803d";
          reqBtn.style.color = "#6ee7b7";
          reqBtn.textContent = t.reqSent;
          reqBtn.style.cursor = "default";
          setTimeout(() => reqBtn.remove(), 5000);
        } else {
          const msg = resp && resp.error ? resp.error : t.reqErrFallback;
          reqBtn.style.background = "#7f1d1d";
          reqBtn.style.borderColor = "#991b1b";
          reqBtn.style.color = "#fca5a5";
          reqBtn.textContent = t.reqFail(msg);
          reqBtn.style.cursor = "default";
        }
        reqBtn.style.pointerEvents = "auto";
        reqBtn.style.opacity = "1";
      });
    });
    reqBtn.addEventListener("mouseenter", () => {
      reqBtn.style.background = "#334155";
    });
    reqBtn.addEventListener("mouseleave", () => {
      reqBtn.style.background = "rgba(30,41,59,.9)";
    });
    wrapper.appendChild(reqBtn);
  }

  document.body.appendChild(wrapper);
}

function removeExistingBadge() {
  document.getElementById("jellyfin-keeper-wrapper")?.remove();
  document.getElementById("jellyfin-keeper-badge")?.remove();
}

/* ─── Site detection ─── */
function detectSite() {
  const url = window.location.href;

  // Jellyfin — supports both old (#!/) and new (/#/) routing
  if (url.includes("/web/") && (url.includes("#/details") || url.includes("#!/details"))) {
    return { name: "jellyfin" };
  }

  if (url.includes("imdb.com/title/")) {
    const match = url.match(/title\/(tt[\d]+)/);
    return match ? { name: "imdb", id: match[1] } : { name: "imdb" };
  }
  if (url.includes("imdb.com/name/")) {
    const match = url.match(/name\/(nm[\d]+)/);
    return match ? { name: "imdb-person", id: match[1] } : { name: "imdb-person" };
  }
  if (url.includes("filmweb.pl/film/") || url.includes("filmweb.pl/serial/")) {
    const path = url.split(/[?#]/)[0];
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

/* ─── Metadata extraction helpers ─── */
function cleanText(str) {
  if (!str) return "";
  return str.replace(/[\u00A0\s]+/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

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

function stripRomanSuffix(name) {
  return name.replace(/\s*\([IVXLCDM]+\)\s*$/, '').replace(/\s+[IVXLCDM]+\s*$/, '').trim();
}

function extractIMDB(imdbId) {
  let title = null;
  let year = null;
  let type = "movie";

  // 1. Check all ld+json objects
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

  // 2. DOM selector with hero__primary-text or data-testid
  if (!title) {
    const h1 = document.querySelector("h1[data-testid='hero__pageTitle'] span.hero__primary-text, h1[data-testid='hero__pageTitle'], h1");
    if (h1) title = cleanText(h1.textContent);
  }

  // 3. og:title meta (e.g. "MobLand (TV Series 2025– ) ⭐ 8.1" or "Matrix (1999)")
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

  // 4. og:type meta
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType && ogType.content && (ogType.content.includes("tv_show") || ogType.content.includes("tv_series"))) {
    type = "tv";
  }

  // 5. Look for TV badges in hero subnav bar
  if (type !== "tv") {
    const subnav = document.querySelector("[data-testid='hero-subnav-bar-left']");
    if (subnav && (subnav.textContent.includes("TV Series") || subnav.textContent.includes("TV Mini Series"))) {
      type = "tv";
    }
  }

  return title ? { imdbId, title, year, type } : null;
}

function extractIMDBPerson(imdbId) {
  let title = null;
  const ldObjects = getLdJsonObjects();
  for (const data of ldObjects) {
    if (data['@type'] === 'Person' && data.name) {
      title = stripRomanSuffix(cleanText(data.name));
      break;
    }
  }
  if (!title) {
    const el = document.querySelector("h1");
    if (el) title = stripRomanSuffix(cleanText(el.textContent));
  }
  return title ? { imdbId, title, type: "person" } : null;
}

function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
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

  // 2. Fetch Filmweb internal API (fast, authoritative metadata, same-origin)
  if (filmwebId) {
    try {
      const itemType = isTv ? "serial" : "film";
      const infoResp = await fetch(`https://www.filmweb.pl/api/v1/${itemType}/${filmwebId}/info`, {
        headers: { "accept": "application/json" },
        signal: AbortSignal.timeout(4000)
      });
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

  // 3. Parse ALL ld+json tags on page
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

  // 5. Fallback DOM selectors for year
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
    if (data['@type'] === 'Person' && data.name) {
      title = cleanText(data.name);
      if (data.sameAs) {
        const sameAsArr = Array.isArray(data.sameAs) ? data.sameAs : [data.sameAs];
        for (const s of sameAsArr) {
          if (typeof s === 'string') {
            const m = s.match(/name\/(nm\d+)/);
            if (m) { imdbId = m[1]; break; }
          }
        }
      }
      break;
    }
  }

  if (!title) {
    const el = document.querySelector("h1");
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
        if (title) return { tmdbId, imdbId, title: cleanText(title), year, type };
      }
    } catch (e) {}
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    return { tmdbId, title: cleanText(ogTitle.content), year: null, type };
  }
  const h1 = document.querySelector("h1");
  return h1 ? { tmdbId, title: cleanText(h1.textContent), year: null, type } : null;
}

function extractTMDBPerson(personId) {
  const nextData = document.getElementById("__NEXT_DATA__");
  if (nextData) {
    try {
      const data = JSON.parse(nextData.textContent);
      const details = data.props?.pageProps?.person || data.props?.pageProps?.media;
      const name = details?.name || details?.title;
      if (name) return { tmdbId: personId, title: cleanText(name), type: "person" };
    } catch (e) {}
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) return { tmdbId: personId, title: cleanText(ogTitle.content), type: "person" };
  const h1 = document.querySelector("h1");
  return h1 ? { tmdbId: personId, title: cleanText(h1.textContent), type: "person" } : null;
}

/* ─── Main Execution & SPA Handler ─── */
async function runCheck() {
  const site = detectSite();
  if (!site) return;
  if (site.name === "jellyfin") return;

  if (!site.name.startsWith("tmdb")) {
    await waitForElement("h1", 3500);
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

  console.log("[JK] Metadata extracted:", metadata);
  if (!metadata?.title) {
    showBadge(await badgeText("noTitle"), null, "linear-gradient(135deg, #b45309, #78350f)");
    return;
  }

  showBadge(await badgeText("checking"), null, "linear-gradient(135deg, #4338ca, #1e40af)");

  chrome.runtime.sendMessage({ action: "search_jellyfin", params: metadata }, async (response) => {
    const lang = await getLang();
    console.log("[JK] Jellyfin response:", response);
    if (!response) { showBadge(await badgeText("error"), null, "linear-gradient(135deg, #4b5563, #1f2937)"); return; }
    if (response.configMissing) { showBadge(await badgeText("needConfig"), null, "linear-gradient(135deg, #b45309, #78350f)"); return; }
    if (response.error) { showBadge(await badgeText("error"), null, "linear-gradient(135deg, #4b5563, #1f2937)"); return; }

    const cfg = await new Promise(r => chrome.storage.local.get("config", r));
    const config = cfg.config || {};

    if (response.found) {
      if (response.count !== undefined) {
        showBadge(await badgeText("foundMany", response.count), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)");
      } else {
        showBadge(await badgeText("found"), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)");
      }
      if (config.enable_sound_notifications) {
        playBeep();
      }
    } else {
      const enableRequest = config.enable_request_button ?? false;
      showBadge(await badgeText("notFound"), null, "linear-gradient(135deg, #1a2f42, #991b1b)", enableRequest, metadata, lang);
    }
  });
}

// SPA Navigation listener
let lastCheckedUrl = window.location.href;
function handleUrlChange() {
  if (window.location.href !== lastCheckedUrl) {
    lastCheckedUrl = window.location.href;
    console.log("[JK] SPA navigation detected:", lastCheckedUrl);
    removeExistingBadge();
    runCheck();
  }
}

window.addEventListener("popstate", handleUrlChange);
setInterval(handleUrlChange, 1500);

// Initial run
runCheck();