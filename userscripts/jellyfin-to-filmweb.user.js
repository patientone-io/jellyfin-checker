// ==UserScript==
// @name         Jellyfin to Filmweb Linker
// @namespace    patientone.io
// @version      1.4.0
// @description  Dodaje przycisk przenieś bezpośrednio do konkretnego filmu/serialu na Filmwebie z poziomu Jellyfina.
// @author       patientone
// @match        http://localhost:8096/*
// @match        http://192.168.*:8096/*
// @match        http://10.*:8096/*
// @match        https://jellyfin.*/*
// @match        http://*/*jellyfin*
// @match        https://*/*jellyfin*
// @include      *://*jellyfin*/*
// @include      *://*:8096/*
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


  const filmwebCache = {};

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
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              reject(e);
            }
          },
          ontimeout: () => reject(new Error('Network timeout')),
          onerror: reject
        });
      } else {
        fetch(url)
          .then(r => r.json())
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

  function tokenOverlap(a, b) {
    if (!a || !b) return 0;
    const sa = new Set(a.split(' '));
    const sb = new Set(b.split(' '));
    let inter = 0;
    sa.forEach(t => { if (sb.has(t)) inter++; });
    return inter / Math.max(sa.size, sb.size);
  }

  // Punktacja kandydata z API. Niezgodny typ (gdy znany) lub rok różniący się o >1 -> odrzucenie (-1000).
  function scoreCandidate(candidate, wanted) {
    const infoNorm = normalizeTitle(candidate.infoTitle || candidate.matchedTitle || '');
    if (!infoNorm) return -1000;
    if (wanted.expectedType && candidate.candidateType && candidate.candidateType !== wanted.expectedType) {
      return -1000;
    }

    let titleScore = -20;
    for (const w of wanted.wantedTitlesNorm) {
      if (!w) continue;
      if (infoNorm === w) {
        titleScore = 60;
        break;
      }
      if (infoNorm.startsWith(w) || w.startsWith(infoNorm)) {
        titleScore = Math.max(titleScore, 30);
      } else if (infoNorm.includes(w) || w.includes(infoNorm)) {
        titleScore = Math.max(titleScore, 20);
      } else {
        const ov = tokenOverlap(infoNorm, w);
        if (ov >= 0.66) titleScore = Math.max(titleScore, 20);
        else if (ov >= 0.4) titleScore = Math.max(titleScore, 10);
      }
    }

    let yearScore = 0;
    if (wanted.wantedYearNum && candidate.infoYear) {
      const d = Math.abs(Number(candidate.infoYear) - wanted.wantedYearNum);
      if (d === 0) yearScore = 50;
      else if (d === 1) yearScore = 25;
      else return -1000;
    }

    let typeScore = 0;
    if (wanted.expectedType && candidate.candidateType === wanted.expectedType) typeScore = 10;

    return titleScore + yearScore + typeScore;
  }

  // Slug dla routera Filmwebu: zachowaj wielkość liter, spacje jako "+", usuń interpunkcję (np. ":").
  function buildFilmwebSlug(titleText) {
    if (!titleText) return '-';
    const cleaned = titleText.trim().replace(/[^\p{L}\p{N}\s\-+]/gu, '').trim().replace(/\s+/g, '+');
    return cleaned || '-';
  }

  // Wyszukiwanie dokładnego adresu URL filmu/serialu na Filmwebie
  async function getDirectFilmwebUrl(title, year, originalTitle, jellyfinType) {
    const expectedType = jellyfinTypeToFilmweb(jellyfinType);
    const cacheKey = `${title}_${originalTitle || ''}_${year || ''}_${expectedType || ''}`;
    if (filmwebCache[cacheKey]) {
      return filmwebCache[cacheKey];
    }

    const wantedTitlesNorm = [...titleBaseForms(title), ...titleBaseForms(originalTitle)]
      .map(normalizeTitle)
      .filter(Boolean);
    const wantedYearNum = year ? Number(year) : null;
    const queries = buildSearchQueries(title, year, originalTitle);
    const SCORE_THRESHOLD = 60;

    for (const q of queries) {
      const apiUrl = `https://www.filmweb.pl/api/v1/live/search?query=${encodeURIComponent(q)}`;

      let data = null;
      try {
        data = await fetchFilmwebApi(apiUrl);
      } catch (err) {
        console.debug('[Jellyfin-Filmweb] Błąd API dla query:', q, err);
        continue;
      }

      const hits = (data && data.searchHits ? data.searchHits : [])
        .filter(h => h && (h.type === 'film' || h.type === 'serial'))
        .slice(0, 8);
      if (!hits.length) continue;

      let best = null;
      for (const hit of hits) {
        const candidateType = hit.type === 'serial' ? 'serial' : 'film';
        // Ścisły typ: Movie nigdy nie idzie w serial i odwrotnie (gdy typ znany z Jellyfina)
        if (expectedType && candidateType !== expectedType) continue;

        let infoTitle = hit.matchedTitle || '';
        let infoYear = null;

        // Pobierz dokładny rok i tytuł z encji Filmweba
        try {
          const infoUrl = `https://www.filmweb.pl/api/v1/${candidateType}/${hit.id}/info`;
          const infoData = await fetchFilmwebApi(infoUrl);
          if (infoData) {
            if (infoData.title) infoTitle = infoData.title;
            if (infoData.year) infoYear = infoData.year;
          }
        } catch (e) {
          console.debug('[Jellyfin-Filmweb] Błąd info API:', e);
        }

        const score = scoreCandidate(
          { infoTitle, infoYear, candidateType, matchedTitle: hit.matchedTitle },
          { wantedTitlesNorm, wantedYearNum, expectedType }
        );
        if (score < SCORE_THRESHOLD) continue;

        if (!best || score > best.score) {
          best = { score, id: hit.id, type: candidateType, title: infoTitle, year: infoYear || wantedYearNum };
        }
        if (score >= 100) break;
      }

      if (best) {
        const cleanSlug = buildFilmwebSlug(best.title || title || originalTitle);

        let directUrl = "";
        if (best.year) {
          directUrl = `https://www.filmweb.pl/${best.type}/${cleanSlug}-${best.year}-${best.id}`;
        } else {
          directUrl = `https://www.filmweb.pl/${best.type}/${cleanSlug}-${best.id}`;
        }

        filmwebCache[cacheKey] = directUrl;
        return directUrl;
      }
    }

    // Fallback w razie braku pewnego dopasowania: strona wyników wyszukiwania (użytkownik wybiera ręcznie)
    const fallbackTitle = originalTitle || title;
    const fallbackUrl = `https://www.filmweb.pl/search?q=${encodeURIComponent(year ? `${fallbackTitle} ${year}` : fallbackTitle)}`;
    filmwebCache[cacheKey] = fallbackUrl;
    return fallbackUrl;
  }

  // Funkcja pomocnicza sprawdzająca, czy aktualny ID w URL zgadza się z oczekiwanym
  function getActiveItemId() {
    const match = window.location.href.match(/id=([a-f0-9-]+)/i);
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
          if (item.Type === 'Episode' && item.SeriesName) {
            title = item.SeriesName;
            originalTitle = item.SeriesOriginalTitle || item.SeriesName;
            year = item.SeriesProductionYear || item.ProductionYear || "";
          } else {
            title = item.Name || "";
            originalTitle = item.OriginalTitle || "";
            year = item.ProductionYear || "";
          }

          if (item.ProviderIds && (item.ProviderIds.Filmweb || item.ProviderIds.FilmwebId)) {
            const fId = item.ProviderIds.Filmweb || item.ProviderIds.FilmwebId;
            const itemType = (item.Type === 'Series' || item.Type === 'TvProgram') ? 'serial' : 'film';
            directFilmwebUrl = `https://www.filmweb.pl/${itemType}/-${fId}`;
          }
        }
      } catch (err) {
        console.debug('[Jellyfin-Filmweb] Błąd ApiClient:', err);
      }
    }

    // Ponowne sprawdzenie nawigacji SPA po await
    if (getActiveItemId() !== itemId) return;

    // Fallback: pobieranie z DOM tylko jeśli ApiClient nie zwrócił tytułu
    if (!title) {
      const titleEl = document.querySelector('.itemName, .detailName, h1.name');
      if (titleEl) title = titleEl.textContent.trim();
    }

    if (!year) {
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

    buttonContainers.forEach(container => {
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
      } else if (!btn.getAttribute('data-resolved-url')) {
        getDirectFilmwebUrl(title, year, originalTitle, jellyfinType).then(resolvedUrl => {
          if (resolvedUrl && btn && btn.isConnected && getActiveItemId() === itemId && btn.getAttribute('data-itemid') === itemId) {
            btn.href = resolvedUrl;
            btn.setAttribute('data-resolved-url', resolvedUrl);
            btn.title = resolvedUrl.includes('/search?q=')
              ? 'Nie znaleziono pewnego dopasowania – otwórz wyniki wyszukiwania na Filmwebie'
              : 'Otwórz na Filmwebie';
          }
        });
      }
    });
  }

  let lastUrl = window.location.href;
  let debounceTimeout = null;

  const checkAndInject = () => {
    if (window.location.href.includes('details?id=')) {
      injectFilmwebButton();
    }
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

