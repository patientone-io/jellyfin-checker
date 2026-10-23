# 📜 Jellyfin Userscripts (Tampermonkey / Violentmonkey)

> *EN:* Standalone userscripts for checking your Jellyfin library on film sites (`jellyfin-checker.user.js`) and opening Filmweb directly from Jellyfin Web (`jellyfin-to-filmweb.user.js`).  
> *PL:* Samodzielne skrypty użytkownika pozwalające sprawdzać bibliotekę Jellyfin na stronach filmowych (`jellyfin-checker.user.js`) oraz przechodzić na Filmweb bezpośrednio z interfejsu Jellyfina (`jellyfin-to-filmweb.user.js`).

[ 🇬🇧 English ](#-english) • [ 🇵🇱 Polski ](#-polski)

---

## 🇬🇧 English

This folder contains two standalone scripts for **Tampermonkey** or **Violentmonkey**:

1. **[`jellyfin-checker.user.js`](jellyfin-checker.user.js) (v1.0.4)** — an alternative to the browser extension for people who prefer userscripts. Checks your Jellyfin library while browsing **Filmweb**, **IMDb**, and **TMDb**.
2. **[`jellyfin-to-filmweb.user.js`](jellyfin-to-filmweb.user.js) (v1.4.1)** — a reverse bridge that adds a yellow **Filmweb** button inside the **Jellyfin Web UI** on movie, series, season, and episode pages.

> **Important:** Install only one Checker variant in a browser (either the browser extension or `jellyfin-checker.user.js`) to avoid duplicate status badges. The `jellyfin-to-filmweb.user.js` Linker can be used alongside either one.

### 🚀 Installation

1. Install **[Tampermonkey](https://www.tampermonkey.net/)** or **[Violentmonkey](https://violentmonkey.github.io/)** in your browser.
2. Open [`jellyfin-checker.user.js`](jellyfin-checker.user.js) or [`jellyfin-to-filmweb.user.js`](jellyfin-to-filmweb.user.js) on GitHub and click the **Raw** button (or copy the file contents into a new script in your manager).
3. Confirm installation in the Tampermonkey / Violentmonkey tab that opens.

---

### 1. `jellyfin-checker.user.js` (v1.0.4)

- **Where it runs:** `filmweb.pl`, `imdb.com` (including `m.imdb.com`), `themoviedb.org`
- **Features:**
  - Supports movies, TV series, seasons, episodes, and people across all three sites
  - Same matching engine as the v1.0.4 extension (media type separation, IMDb/TMDb ID validation, subtitle splitting, Levenshtein + year tolerance, original title fallback)
  - Built-in caching (12 hours for found items, 1 hour for missing items; click **↻** on the badge to force a fresh check)
  - Optional Telegram **"Request"** button and sound notifications
- **Configuration:**
  - Click the **⚙️ gear icon** on the badge or open **Settings / Ustawienia** from the Tampermonkey/Violentmonkey menu on a supported film page.
  - Enter your Jellyfin URL (and optional fallback URL #2) + API Key, click **Save**, and test with **Test Server**.
  - For step-by-step Telegram bot setup (`@BotFather` and `Chat ID`), see the [main README](../README.md#telegram-requests-optional).

---

### 2. `jellyfin-to-filmweb.user.js` (v1.4.1)

- **Where it runs:** Jellyfin Web UI (`localhost:8096`, `192.168.*:8096`, `10.*:8096`, `*://jellyfin.*/*`, `*://*/jellyfin/*`)
- **How it works:**
  - Adds a **Filmweb** button to item detail pages in Jellyfin Web (right next to Play / Trailer).
  - Uses your active Jellyfin Web session (`ApiClient`) — no separate API key needed.
  - **Seasons & episodes:** automatically resolves the parent TV series via `SeriesId` so clicking the button opens the series card on Filmweb.
  - **Direct match or smart search:** uses a saved numeric `Filmweb` provider ID if present; otherwise queries Filmweb's API using title & original title variants and verifies media type (`film` vs `serial`) and release year (±1 year tolerance). If no confident match is found, falls back to Filmweb's search page.
- **Custom domain setup:**
  If your Jellyfin runs on a custom domain that doesn't contain `jellyfin` or port `8096` (e.g. `https://media.example.com`), add your domain to the script's `@match` header or User Matches in Tampermonkey:
  ```javascript
  // @match        https://media.example.com/*
  ```

---

## 🇵🇱 Polski

W tym katalogu znajdują się dwa niezależne skrypty dla menedżerów **Tampermonkey** oraz **Violentmonkey**:

1. **[`jellyfin-checker.user.js`](jellyfin-checker.user.js) (v1.0.4)** — skryptowy odpowiednik rozszerzenia przeglądarkowego. Sprawdza dostępność filmów, seriali, sezonów, odcinków i osób w Twoim Jellyfinie podczas przeglądania **Filmwebu**, **IMDb** oraz **TMDb**.
2. **[`jellyfin-to-filmweb.user.js`](jellyfin-to-filmweb.user.js) (v1.4.1)** — odwrotny mostek integracji: dodaje stylowy przycisk **„Filmweb”** bezpośrednio w webowym interfejsie **Jellyfina** (obok przycisków Odtwórz i Zwiastun) na stronach filmów, seriali, sezonów i odcinków.

> **Ważne:** W jednej przeglądarce używaj tylko jednego wariantu Checkera (albo rozszerzenia z Chrome Web Store / Firefox Add-ons, albo skryptu `jellyfin-checker.user.js`), aby uniknąć podwójnych plakietek statusu. Skrypt `jellyfin-to-filmweb.user.js` działa w interfejsie Jellyfina, więc możesz go używać razem z dowolnym wariantem Checkera.

### 🚀 Instalacja

1. Zainstaluj w przeglądarce dodatek **[Tampermonkey](https://www.tampermonkey.net/)** lub **[Violentmonkey](https://violentmonkey.github.io/)**.
2. Otwórz na GitHubie plik [`jellyfin-checker.user.js`](jellyfin-checker.user.js) lub [`jellyfin-to-filmweb.user.js`](jellyfin-to-filmweb.user.js) i kliknij przycisk **Raw** (albo skopiuj kod i wklej jako nowy skrypt w menedżerze).
3. Potwierdź instalację w otwartym oknie menedżera skryptów.

---

### 1. `jellyfin-checker.user.js` (v1.0.4)

- **Gdzie działa:** `filmweb.pl`, `imdb.com` (w tym `m.imdb.com`), `themoviedb.org`
- **Funkcje:**
  - Obsługuje karty filmów, seriali, sezonów, odcinków oraz osób we wszystkich trzech serwisach
  - Ten sam silnik dopasowywania co w rozszerzeniu v1.0.4 (rozróżnianie filmów i seriali, weryfikacja ID IMDb/TMDb, obsługa podtytułów po `:` i `-`, tolerancja roku premiery, fallback do tytułu oryginalnego)
  - Wbudowany cache (12 godzin dla znalezionych pozycji, 1 godzina dla brakujących; kliknij **↻** na plakietce, aby wymusić ponowne sprawdzenie po dodaniu filmu do biblioteki)
  - Opcjonalny przycisk prośby przez **Telegrama** oraz powiadomienia dźwiękowe
- **Konfiguracja:**
  - Po wejściu na Filmweb, IMDb lub TMDb kliknij ikonę **⚙️ zębatki** na plakietce statusu albo wybierz **Settings / Ustawienia** z menu Tampermonkey/Violentmonkey.
  - Wpisz adres serwera Jellyfin (oraz opcjonalny zapasowy URL #2) i klucz API, kliknij **Zapisz**, a następnie sprawdź połączenie przyciskiem **Testuj Serwer**.
  - Dokładną instrukcję konfiguracji bota Telegram krok po kroku (`@BotFather` i `Chat ID`) znajdziesz w [głównym README](../README.md#prośby-przez-telegrama-opcjonalnie).

---

### 2. `jellyfin-to-filmweb.user.js` (v1.4.1)

- **Gdzie działa:** Web UI Jellyfina (`localhost:8096`, `192.168.*:8096`, `10.*:8096`, `*://jellyfin.*/*`, `*://*/jellyfin/*`)
- **Jak działa:**
  - Dodaje przycisk **Filmweb** na karcie szczegółów pozycji w Jellyfin Web.
  - Korzysta z Twojej aktywnej sesji w przeglądarce (`ApiClient`) — nie wymaga wpisywania klucza API.
  - **Sezony i odcinki:** automatycznie pobiera dane serialu nadrzędnego przez `SeriesId`, dzięki czemu kliknięcie przycisku na karcie sezonu lub odcinka przenosi bezpośrednio na stronę serialu na Filmwebie.
  - **Bezpośredni link lub inteligentne wyszukiwanie:** jeśli pozycja ma zapisane numeryczne ID `Filmweb` w metadanych Jellyfina, używa go od razu; w przeciwnym razie odpytuje API Filmwebu po tytule polskim i oryginalnym, weryfikując typ (`film` vs `serial`) oraz rok premiery (z tolerancją ±1 roku). W razie braku jednoznacznego dopasowania otwiera wyszukiwarkę Filmwebu.
- **Własna domena Jellyfina:**
  Jeśli Twój Jellyfin działa pod własną domeną, która nie zawiera słowa `jellyfin` ani portu `8096` (np. `https://media.twojadomena.pl`), dopisz swój adres do sekcji `@match` w nagłówku skryptu (lub w ustawieniach dopasowań w Tampermonkey):
  ```javascript
  // @match        https://media.twojadomena.pl/*
  ```

---

## 👤 Author & Contact / Autor i kontakt

[patientone](https://github.com/patientone-io) • [patientone.uk](https://patientone.uk) • [contact@patientone.uk](mailto:contact@patientone.uk)

## 📄 License / Licencja

MIT License — see [LICENSE](../LICENSE) / szczegóły w pliku [LICENSE](../LICENSE).
