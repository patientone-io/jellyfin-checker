// ==UserScript==
// @name         Jellyfin to Filmweb Linker
// @namespace    patientone.io
// @version      1.4.1
// @description  Dodaje przycisk przenieś bezpośrednio do konkretnego filmu/serialu na Filmwebie z poziomu Jellyfina.
// @author       patientone
// @include      /^https?:\/\/(?:[^/?#]*jellyfin[^/?#]*|[^/?#]+:8096)\/.*$/
// @include      /^https?:\/\/[^/?#]+\/jellyfin(?:[/?#].*)?$/
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      filmweb.pl
// @connect      www.filmweb.pl
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const FILMWEB_SVG = `<svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
    <path d="M256,0 C397.384896,0 512,114.615104 512,256 C512,397.384896 397.384896,512 256,512 C114.615104,512 0,397.384896 0,256 C0,114.615104 114.615104,0 256,0 Z M184.081527,328.189391 C170.350434,328.209423 158.638171,332.943086 148.874971,342.418286 L148.4215,342.877908 C138.973309,352.562843 134.231771,364.319543 134.231771,378.287543 L134.227844,378.944233 C134.221284,392.701248 138.996571,404.350286 148.414171,414.149486 L148.867686,414.603706 C158.574481,424.218177 170.319219,428.997486 184.283429,428.997486 L184.897829,428.997486 L185.545735,428.993876 C198.908425,428.844678 210.570971,424.071024 220.094171,414.756571 L220.551688,414.288881 C230.083423,404.437855 234.820686,392.725143 235.000686,378.850743 L235.004855,378.194728 C235.01438,364.451673 230.109943,352.803086 220.591543,343.032686 L220.139369,342.577162 C210.46093,332.935854 198.729931,328.192 184.736914,328.192 Z M330.1888,94.3835429 L308.041143,138.210743 C317.198629,142.789486 325.844114,148.618971 334.145829,155.765029 C336.917943,158.200686 339.646171,160.8192 342.3744,163.569371 C344.049371,165.397943 345.914514,167.387429 347.530971,169.391543 C351.970743,174.445714 356.103314,179.6096 359.760457,185.248914 C361.1648,187.530971 362.664229,189.8496 364.046629,192.1536 C367.301486,198.085486 370.197943,204.178286 372.4288,210.614857 C377.358629,223.875657 379.743086,238.416457 379.743086,253.7984 C379.743086,269.853257 377.1904,284.810971 371.858286,298.678857 C369.92,303.747657 367.550171,308.626286 364.982857,313.504914 C363.3152,316.423314 361.6256,319.136914 359.760457,321.923657 C356.000914,327.870171 351.875657,333.685029 347.121371,339.309714 C345.6,340.992 344.049371,342.8352 342.3744,344.685714 L342.3744,344.685714 L342.3744,345.124571 C340.955429,346.353371 339.492571,347.5968 338.102857,348.832914 C328.821029,357.024914 318.712686,363.739429 308.041143,368.910629 L308.041143,368.910629 L330.773943,412.613486 C344.9856,405.7088 358.414629,396.873143 370.746514,385.762743 C377.263158,379.508772 371.649123,385.122807 377.1904,379.472457 L377.1904,379.472457 L378.3168,378.426514 C397.443657,359.0144 411.377371,337.378743 419.949714,313.504914 C421.632,308.341029 422.999771,302.965029 424.206629,297.610971 C427.446857,283.7504 428.990171,269.099886 428.990171,253.7984 C429.092571,239.1552 427.600457,225.236114 424.704,212.150857 C423.277714,205.268114 421.449143,198.509714 419.474286,192.1536 C412.6208,174.109257 402.688,157.447314 389.7344,142.123886 C386.018743,137.8816 382.222629,133.763657 378.3168,129.806629 C377.848686,129.345829 377.4464,129.031314 377.1904,128.7168 L377.1904,128.7168 L374.557257,125.052343 C374.030629,124.884114 373.4016,124.6208 372.933486,124.481829 C362.832457,114.819657 352.087771,106.715429 340.677486,100.154514 C340.406857,99.7376 340.092343,99.4011429 339.770514,99.1085714 C336.5888,97.4262857 333.377829,95.7659429 330.1888,94.3835429 Z"/>
  </svg>`;


  const filmwebCache = new Map();
  const pendingSearches = new Map();
  const pendingInjections = new Map();

  // Pomocnicza funkcja do zapytania API Filmwebu z ominięciem CORS (GM_xmlhttpRequest)
  function fetchFilmwebApi(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 5000,
          onload: (res) => {
            try {
              if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              reject(e);
            }
          },
          ontimeout: () => reject(new Error('Network timeout')),
          onerror: reject
        });
      } else {
        fetch(url, { signal: AbortSignal.timeout(5000) })
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  // Normalizacja tytułu do porównań (lowercase, bez diakrytyków i interpunkcji)
  function normalizeTitle(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Warianty tytułu: pełny + okrojony przed ": Shoot", " - ", " (..." (np. "Last Stop Larrimah: Murder Down Under" -> "Last Stop Larrimah")
  function titleBaseForms(t) {
    if (!t) return [];
    const full = t.trim();
    if (!full) return [];
    const out = [full];
    const candidates = [
      full.split(':')[0],
      full.split('–')[0].split('—')[0],
      full.split(' - ')[0],
      full.split(' (')[0]
    ];
    for (const c of candidates) {
      const v = (c || '').trim();
      if (v && v.length >= 3 && !out.includes(v)) out.push(v);
    }
    return out;
  }

  // Kolejność zapytań: warianty z rokiem (pełne i okrojone), potem bez roku. Max 8, bez duplikatów.
  function buildSearchQueries(title, year, originalTitle) {
    const ordered = [];
    const seen = new Set();
    const push = (q) => {
      if (q && !seen.has(q)) {
        seen.add(q);
        ordered.push(q);
      }
    };
    const groups = [...titleBaseForms(title)];
    for (const b of titleBaseForms(originalTitle)) {
      if (!groups.includes(b)) groups.push(b);
    }
    if (year) {
      for (const g of groups) push(`${g} ${year}`);
    }
    for (const g of groups) push(g);
    return ordered.slice(0, 8);
  }

  // Oczekiwany typ na Filmwebie na podstawie typu z Jellyfina. Movie -> film (ściśle), Series/Season/Episode -> serial.
  function jellyfinTypeToFilmweb(jellyfinType) {
    if (!jellyfinType) return null;
    if (jellyfinType === 'Movie') return 'film';
    if (jellyfinType === 'Series' || jellyfinType === 'Season' || jellyfinType === 'Episode') return 'serial';
    return null;
  }

  // Require an exact full title/alias. Shortened forms are search queries only.
  function scoreCandidate(candidate, wanted) {
    if (wanted.expectedType && candidate.candidateType !== wanted.expectedType) return -1000;
    const titles = [candidate.infoTitle, candidate.originalTitle, candidate.matchedTitle]
      .map(normalizeTitle).filter(Boolean);
    if (!titles.some(title => wanted.wantedTitlesNorm.includes(title))) return -1000;
    let score = 60;
    if (wanted.wantedYearNum) {
      if (!candidate.infoYear) return -1000;
      const difference = Math.abs(Number(candidate.infoYear) - wanted.wantedYearNum);
      if (!Number.isFinite(difference) || difference > 1) return -1000;
      score += difference === 0 ? 50 : 25;
    }
    return score;
  }

  // Slug dla routera Filmwebu: zachowaj wielkość liter, spacje jako "+", usuń interpunkcję (np. ":").
  function buildFilmwebSlug(titleText) {
    if (!titleText) return '-';
    const cleaned = titleText.trim().replace(/[^\p{L}\p{N}\s\-+]/gu, '').trim().replace(/\s+/g, '+');
    return cleaned || '-';
  }

  // Wyszukiwanie dokładnego adresu URL filmu/serialu na Filmwebie
  async function getDirectFilmwebUrl(title, year, originalTitle, jellyfinType) {
    const key = JSON.stringify([title, year, originalTitle, jellyfinType]);
    const cached = filmwebCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.url;
    filmwebCache.delete(key);
    if (pendingSearches.has(key)) return pendingSearches.get(key);
    const pending = resolveFilmwebUrl(title, year, originalTitle, jellyfinType).then(url => {
      const ttl = url.includes('/search?') ? 60000 : 3600000;
      if (filmwebCache.size >= 200) filmwebCache.delete(filmwebCache.keys().next().value);
      filmwebCache.set(key, { url, expires: Date.now() + ttl });
      return url;
    }).finally(() => pendingSearches.delete(key));
    pendingSearches.set(key, pending);
    return pending;
  }

  async function resolveFilmwebUrl(title, year, originalTitle, jellyfinType) {
    const expectedType = jellyfinTypeToFilmweb(jellyfinType);
    const wanted = {
      expectedType,
      wantedTitlesNorm: [title, originalTitle].map(normalizeTitle).filter(Boolean),
      wantedYearNum: year ? Number(year) : null
    };
    const candidates = new Map();
    const details = new Map();
    for (const query of buildSearchQueries(title, year, originalTitle)) {
      const data = await fetchFilmwebApi(`https://www.filmweb.pl/api/v1/live/search?query=${encodeURIComponent(query)}`);
      if (!Array.isArray(data?.searchHits)) throw new Error('Invalid Filmweb search response');
      const hits = data.searchHits.filter(hit => hit && /^\d+$/.test(String(hit.id)) &&
        (hit.type === 'film' || hit.type === 'serial') && (!expectedType || hit.type === expectedType)).slice(0, 8);
      for (const hit of hits) {
        const key = `${hit.type}:${hit.id}`;
        if (!details.has(key)) {
          const info = await fetchFilmwebApi(`https://www.filmweb.pl/api/v1/${hit.type}/${hit.id}/info`);
          if (!info || typeof info !== 'object' || (!info.title && !info.originalTitle)) {
            throw new Error('Invalid Filmweb info response');
          }
          details.set(key, info);
        }
        const info = details.get(key);
        const score = scoreCandidate({ infoTitle: info.title, originalTitle: info.originalTitle,
          matchedTitle: hit.matchedTitle, infoYear: info.year, candidateType: hit.type }, wanted);
        if (score < 60) continue;
        const previous = candidates.get(key);
        if (!previous || score > previous.score) {
          candidates.set(key, { score, id: hit.id, type: hit.type, title: info.title || info.originalTitle, year: info.year });
        }
      }
    }
    const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
    if (ranked.length && (ranked.length === 1 || ranked[0].score > ranked[1].score)) {
      const best = ranked[0];
      return `https://www.filmweb.pl/${best.type}/${buildFilmwebSlug(best.title)}${best.year ? `-${best.year}` : ''}-${best.id}`;
    }
    const query = originalTitle || title;
    return `https://www.filmweb.pl/search?q=${encodeURIComponent(year ? `${query} ${year}` : query)}`;
  }

  // Funkcja pomocnicza sprawdzająca, czy aktualny ID w URL zgadza się z oczekiwanym
  function getActiveItemId() {
    const match = window.location.href.match(/(?:#\/?|#!\/)details\?[^#]*?\bid=([a-f0-9-]+)(?:&|$)/i);
    return match ? match[1] : null;
  }

  // Bezpieczne pobieranie ApiClient (także z unsafeWindow w środowisku piaskownicy Tampermonkey/Violentmonkey)
  function getApiClient() {
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow.ApiClient) {
        return unsafeWindow.ApiClient;
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.ApiClient) {
        return window.ApiClient;
      }
    } catch (e) {}
    return null;
  }

  async function injectFilmwebButton() {
    const key = window.location.href;
    if (pendingInjections.has(key)) return pendingInjections.get(key);
    const pending = updateFilmwebButton().finally(() => pendingInjections.delete(key));
    pendingInjections.set(key, pending);
    return pending;
  }

  async function updateFilmwebButton() {
    const itemId = getActiveItemId();
    if (!itemId) {
      document.querySelectorAll('.btn-filmweb-linker').forEach(b => b.remove());
      return;
    }

    // Czyszczenie starych przycisków z poprzednich podstron (SPA Navigation Fix)
    document.querySelectorAll('.btn-filmweb-linker').forEach(btn => {
      if (btn.getAttribute('data-itemid') !== itemId) {
        btn.remove();
      }
    });

    const buttonContainers = document.querySelectorAll('.mainDetailButtons, .detailButtons');
    if (!buttonContainers.length) return;
    if ([...buttonContainers].every(container => {
      const btn = container.querySelector(`.btn-filmweb-linker[data-itemid="${itemId}"]`);
      return btn && Number(btn.getAttribute('data-retry-after')) > Date.now();
    })) return;

    let title = "";
    let originalTitle = "";
    let year = "";
    let jellyfinType = "";
    let directFilmwebUrl = "";

    const apiClient = getApiClient();
    if (apiClient) {
      try {
        const userId = apiClient.getCurrentUserId ? apiClient.getCurrentUserId() : null;
        let item = null;
        if (userId) {
          item = await apiClient.getItem(userId, itemId);
        } else if (apiClient.getItem) {
          item = await apiClient.getItem(itemId);
        }

        // Anuluj, jeśli użytkownik zmienił stronę podczas pobierania danych z API
        if (getActiveItemId() !== itemId) return;

        if (item) {
          jellyfinType = item.Type || "";
          if (item.Type === 'Episode' || item.Type === 'Season') {
            // Provider IDs and dates on an episode/season do not describe the series.
            if (!item.SeriesId) return;
            item = userId ? await apiClient.getItem(userId, item.SeriesId) : await apiClient.getItem(item.SeriesId);
            if (getActiveItemId() !== itemId || !item || item.Type !== 'Series') return;
          }
          jellyfinType = item.Type || '';
          if (!jellyfinTypeToFilmweb(jellyfinType)) return;
          title = item.Name || '';
          originalTitle = item.OriginalTitle || '';
          year = item.ProductionYear || '';
          const fId = item.ProviderIds?.Filmweb || item.ProviderIds?.FilmwebId;
          if (fId && /^\d+$/.test(String(fId))) {
            directFilmwebUrl = `https://www.filmweb.pl/${jellyfinTypeToFilmweb(jellyfinType)}/-${fId}`;
          }
        }
      } catch (err) {
        console.debug('[Jellyfin-Filmweb] Błąd ApiClient:', err);
        if (jellyfinType === 'Episode' || jellyfinType === 'Season') return;
      }
    }

    // Ponowne sprawdzenie nawigacji SPA po await
    if (getActiveItemId() !== itemId) return;

    // Fallback: pobieranie z DOM tylko jeśli ApiClient nie zwrócił tytułu
    if (!title) {
      const titleEl = document.querySelector('.itemName, .detailName, h1.name');
      if (titleEl) title = titleEl.textContent.trim();
    }

    if (!year && !jellyfinType) {
      const yearEl = document.querySelector('.itemYear, .detailYear, .mediaInfoItem-year, .mediaInfoItem, .itemMiscInfo-primary, .itemMiscInfo');
      if (yearEl) {
        const m = yearEl.textContent.match(/\b(19\d\d|20\d\d)\b/);
        if (m) year = m[1];
      }
    }

    if (!title && !originalTitle) return;

    const mainTitle = originalTitle || title;
    const initialSearchUrl = `https://www.filmweb.pl/search?q=${encodeURIComponent(year ? `${mainTitle} ${year}` : mainTitle)}`;
    const defaultUrl = directFilmwebUrl || initialSearchUrl;

    await Promise.all([...buttonContainers].map(async container => {
      let btn = container.querySelector(`.btn-filmweb-linker[data-itemid="${itemId}"]`);

      if (!btn) {
        btn = document.createElement('a');
        btn.className = 'btn-filmweb-linker detailButton emby-button';
        btn.setAttribute('data-itemid', itemId);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.title = 'Otwórz na Filmwebie';

        btn.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #f5b400;
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 0.5em 0.9em;
          margin: 4px;
          text-decoration: none;
          font-size: 0.92em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        `;

        btn.innerHTML = `${FILMWEB_SVG}<span>Filmweb</span>`;

        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(245, 180, 0, 0.15)';
          btn.style.borderColor = 'rgba(245, 180, 0, 0.4)';
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'transparent';
          btn.style.borderColor = 'transparent';
        });

        container.appendChild(btn);
      }

      // Aktualizacja href jeśli przycisk istniał, ale nie jest jeszcze rozwiązany
      if (!btn.getAttribute('data-resolved-url')) {
        btn.href = defaultUrl;
      }

      if (directFilmwebUrl) {
        btn.href = directFilmwebUrl;
        btn.setAttribute('data-resolved-url', directFilmwebUrl);
        btn.setAttribute('data-retry-after', Date.now() + 3600000);
      } else {
        try {
          const resolvedUrl = await getDirectFilmwebUrl(title, year, originalTitle, jellyfinType);
          if (resolvedUrl && btn && btn.isConnected && getActiveItemId() === itemId && btn.getAttribute('data-itemid') === itemId) {
            btn.href = resolvedUrl;
            btn.setAttribute('data-resolved-url', resolvedUrl);
            btn.setAttribute('data-retry-after', Date.now() + (resolvedUrl.includes('/search?') ? 60000 : 3600000));
            btn.title = resolvedUrl.includes('/search?q=')
              ? 'Nie znaleziono pewnego dopasowania - otwórz wyniki wyszukiwania na Filmwebie'
              : 'Otwórz na Filmwebie';
          }
        } catch (error) {
          if (btn.isConnected && getActiveItemId() === itemId) {
            btn.href = initialSearchUrl;
            btn.title = 'Filmweb chwilowo niedostępny - otwórz wyszukiwarkę';
            btn.setAttribute('data-retry-after', Date.now() + 30000);
          }
          console.debug('[Jellyfin-Filmweb] Błąd wyszukiwania:', error);
        }
      }
    }));
  }

  let lastUrl = window.location.href;
  let debounceTimeout = null;

  const checkAndInject = () => {
    injectFilmwebButton().catch(error => console.debug('[Jellyfin-Filmweb] Błąd przycisku:', error));
  };

  const debouncedCheckAndInject = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      checkAndInject();
    }, 150);
  };

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkAndInject();
    } else {
      debouncedCheckAndInject();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', checkAndInject);
  window.addEventListener('hashchange', checkAndInject);

  checkAndInject();

})();

