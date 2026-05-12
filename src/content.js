// Jellyfin Checker - Content Script

const JELLYFIN_ICON = chrome.runtime.getURL("icon96.png");

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

/* ─── Metadata extraction ─── */
function extractIMDB(imdbId) {
  const t = document.querySelector("h1[data-testid='hero__pageTitle']");
  const y = document.querySelector("[data-testid='release_year'] a");
  let type = "movie";
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent);
      const t = data['@type'];
      if (t && (t === 'TVSeries' || t === 'TVEpisode' || t === 'TVSeason')) type = "tv";
    } catch (e) {}
  }
  return {
    imdbId,
    title: t ? t.textContent.trim() : null,
    year: y ? parseInt(y.textContent.trim()) : null,
    type
  };
}

function stripRomanSuffix(name) {
  return name.replace(/\s*\([IVXLCDM]+\)\s*$/, '').replace(/\s+[IVXLCDM]+\s*$/, '').trim();
}

function extractIMDBPerson(imdbId) {
  const el = document.querySelector("h1");
  const title = el ? stripRomanSuffix(el.textContent.trim()) : null;
  return title ? { imdbId, title, type: "person" } : null;
}

function extractFilmweb(filmwebId) {
  const t = document.querySelector("h1");
  const y = document.querySelector("h2");
  let year = null;
  let originalTitle = null;
  let imdbId = null;
  if (y) {
    const m = y.textContent.match(/(\d{4})/);
    if (m) year = parseInt(m[1]);
    const origMatch = y.textContent.match(/^([\s\S]+?)[\s(]*(\d{4})/);
    if (origMatch) {
      originalTitle = origMatch[1].trim();
      if (t && originalTitle === t.textContent.trim()) originalTitle = null;
    }
  }
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent);
      if (data.sameAs) {
        const im = data.sameAs.match(/title\/(tt\d+)/);
        if (im) imdbId = im[1];
      }
    } catch (e) {}
  }
  return t ? {
    title: t.textContent.trim(),
    originalTitle,
    year,
    filmwebId,
    imdbId,
    type: window.location.href.includes("/serial/") ? "tv" : "movie"
  } : null;
}

function extractFilmwebPerson() {
  let imdbId = null;
  let title = null;

  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent);
      if (data.name) title = data.name;
      if (data.sameAs) {
        const m = data.sameAs.match(/name\/(nm\d+)/);
        if (m) imdbId = m[1];
      }
    } catch (e) {}
  }

  if (!title) {
    const el = document.querySelector("h1");
    if (el) title = stripRomanSuffix(el.textContent.trim());
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

async function extractJellyfinInfo() {
  // Prefer ApiClient (most reliable)
  if (window.ApiClient) {
    const itemId = window.location.href.match(/id=([^&#]+)/)?.[1];
    if (itemId) {
      try {
        const item = await window.ApiClient.getJSON(window.ApiClient.getUrl(`Items/${itemId}`));
        return { title: item.Name, year: item.ProductionYear };
      } catch (e) { console.warn("Jellyfin API error:", e); }
    }
  }
  // Fallback: DOM extraction
  const h1 = document.querySelector("h1,h2,.pageTitle,[data-testid='DetailPage'] h2");
  if (!h1) return null;
  const title = h1.textContent.trim();
  const yearMatch = document.body.textContent.match(/(19|20)(\d{2})/g);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  return { title, year };
}

/* ─── Main ─── */
(async function() {
  console.log("[JK] Loading Jellyfin Checker...");
  const site = detectSite();
  console.log("[JK] Detected site:", site);
  if (!site) return;

  if (site.name === "jellyfin") return; // No reverse direction

  // IMDb/Filmweb/TMDb → check Jellyfin
  if (!site.name.startsWith("tmdb")) {
    await waitForElement("h1", 4000);
  }

  let metadata = null;
  switch (site.name) {
    case "imdb": metadata = extractIMDB(site.id); break;
    case "imdb-person": metadata = extractIMDBPerson(site.id); break;
    case "filmweb": metadata = extractFilmweb(site.id); break;
    case "filmweb-person": metadata = extractFilmwebPerson(); break;
    case "tmdb": metadata = extractTMDB(site.id, site.type); break;
    case "tmdb-person": metadata = extractTMDBPerson(site.id); break;
  }
  console.log("[JK] Metadata:", metadata);
  if (!metadata?.title) { showBadge(await badgeText("noTitle"), null, "linear-gradient(135deg, #b45309, #78350f)"); return; }

  showBadge(await badgeText("checking"), null, "linear-gradient(135deg, #4338ca, #1e40af)");

  chrome.runtime.sendMessage({ action: "search_jellyfin", params: metadata }, async (response) => {
    const lang = await getLang();
    console.log("[JK] Jellyfin response:", response);
    if (!response) { showBadge(await badgeText("error"), null, "linear-gradient(135deg, #4b5563, #1f2937)"); return; }
    if (response.configMissing) { showBadge(await badgeText("needConfig"), null, "linear-gradient(135deg, #b45309, #78350f)"); return; }
    if (response.error) { showBadge(await badgeText("error"), null, "linear-gradient(135deg, #4b5563, #1f2937)"); return; }

    if (response.found) {
      if (response.count !== undefined) {
        showBadge(await badgeText("foundMany", response.count), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)");
      } else {
        showBadge(await badgeText("found"), response.jellyfinURL, "linear-gradient(135deg, #1a2f42, #15803d)");
      }
    } else {
      const cfg = await new Promise(r => chrome.storage.local.get("config", r));
      const enableRequest = (cfg.config?.enable_request_button) ?? false;
      showBadge(await badgeText("notFound"), null, "linear-gradient(135deg, #1a2f42, #991b1b)", enableRequest, metadata, lang);
    }
  });
})();