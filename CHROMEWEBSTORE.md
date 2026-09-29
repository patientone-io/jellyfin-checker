# Chrome Web Store Listing — Jellyfin Checker

> Last Updated: 2026-09-29  
> **Live Store Link**: https://chromewebstore.google.com/detail/jellyfin-checker/llbfpbeiiidailfdcbdeilmonlikdoef

## Store Listing

**Extension Name**
Jellyfin Checker

**Short Description**
Browser extension that checks if movies, shows, or people are available on your Jellyfin server

**Detailed Description**
Directly connects your self-hosted Jellyfin media server with movie and TV database pages.

When browsing titles or people on IMDb, Filmweb, or The Movie Database (TMDb), Jellyfin Checker automatically queries your Jellyfin instance in the background and displays a clean, non-intrusive status badge indicating whether the item is already in your library.

Key Features:
• Multi-Platform Support: Works automatically on IMDb (title & name pages), Filmweb (film, serial, person), and TMDb (movie, tv, person).
• Direct Watch Link: Clicking the green badge takes you directly to the media item's detail page inside your Jellyfin web interface.
• Multi-URL Failover: Configure both local LAN and remote/domain URLs. The extension automatically routes through the active server.
• Optional Telegram Requests: If a title is missing from your library, click "Request Movie" to send a structured alert to your Telegram bot.
• Audio Feedback: Optional subtle audio notification when a matching title is discovered in your library.
• Clean & Fast UI: Light, Dark, and System theme support with an all-in-one configuration popup.
• Local-First & BYOK (Bring Your Own Key): All server URLs and API tokens are stored strictly inside your browser's local storage (chrome.storage.local). Zero tracking, no telemetry, no third-party analytics.

How to Use:
1. Click the Jellyfin Checker icon in your browser toolbar.
2. Enter your Jellyfin Server URL (e.g. http://192.168.1.100:8096 or your HTTPS domain).
3. Enter your Jellyfin API Key (generated in Jellyfin Dashboard → Settings → API Keys).
4. Click "Test Connection" to verify.
5. Browse IMDb, Filmweb, or TMDb — the badge will appear automatically on matching pages.

Privacy Policy:
https://patientone.uk/privacy.html

Disclaimer:
Jellyfin Checker is an independent open-source project by patientone and is not affiliated with, endorsed by, or sponsored by the Jellyfin Project, Filmweb, IMDb, or TMDb.

============================================================
🇵🇱 POLSKA WERSJA / POLISH DESCRIPTION:
============================================================

Połącz swój domowy serwer multimediów Jellyfin z serwisami filmowymi.

Podczas przeglądania filmów, seriali lub profili twórców na Filmwebie, IMDb oraz The Movie Database (TMDb), Jellyfin Checker w czasie rzeczywistym sprawdza w tle Twoją bibliotekę Jellyfin i wyświetla estetyczny, dyskretny badge informujący, czy dana pozycja znajduje się już w Twoich zbiorach.

Główne możliwości:
• Pełne wsparcie dla Filmwebu, IMDb i TMDb: automatycznie rozpoznaje podstrony filmów, seriali, konkretnych odcinków oraz profile aktorów i reżyserów.
• Bezpośrednie przejście do oglądania: kliknięcie w zielony badge przenosi Cię prosto do odtwarzacza lub karty tytułu w Twoim webowym interfejsie Jellyfina.
• Obsługa adresu lokalnego i zdalnego (Failover): skonfiguruj adres LAN (np. http://192.168.x.x:8096) oraz domenę zewnętrzną — wtyczka połączy się automatycznie z tym, który w danym momencie odpowiada.
• Prośby o dodanie filmu przez Telegram: jeśli filmu nie ma w bibliotece, jedno kliknięcie w „Poproś o film” wysyła sformatowaną wiadomość z linkiem bezpośrednio do Twojego bota na Telegramie (wygodne dla domowników).
• Subtelne powiadomienia dźwiękowe: opcjonalny krótki sygnał dźwiękowy po znalezieniu filmu w Twojej kolekcji.
• Nowoczesny interfejs: pełna obsługa motywu Ciemnego, Jasnego oraz Systemowego z wygodnym popupem podzielonym na zakładki.
• 100% Prywatności (Local-First): Twoje klucze API i adresy serwerów są zapisywane wyłącznie w pamięci lokalnej Twojej przeglądarki (chrome.storage.local). Wtyczka nie zawiera żadnej telemetrii, analityki ani trackerów.

Jak zacząć:
1. Kliknij ikonę Jellyfin Checker na pasku przeglądarki.
2. Wpisz adres swojego serwera Jellyfin oraz klucz API (wygenerujesz go w: Jellyfin Dashboard → Ustawienia → Klucze API).
3. Kliknij „Test połączenia”.
4. Gotowe! Wejdź na Filmweb, IMDb lub TMDb — informacja o dostępności pojawi się sama.

Polityka prywatności:
https://patientone.uk/privacy.html

Zastrzeżenie prawne:
Jellyfin Checker jest niezależnym projektem open-source stworzonym przez patientone i nie jest oficjalnie powiązany z projektem Jellyfin, serwisem Filmweb, IMDb ani TMDb.

**Category**
Productivity / Tools

**Single Purpose**
Checks and displays availability of movies, shows, and people on the user's private Jellyfin server directly on movie database pages.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon | 128×128 PNG | ✅ Ready | `src/icon128.png` |
| Screenshot 1 | 1280×800 PNG | ✅ Ready | `cws-assets/screenshot-1-popup.png` |
| Screenshot 2 | 1280×800 PNG | ✅ Ready | `cws-assets/screenshot-2-badges.png` |
| Small Promo Tile | 440×280 PNG | ✅ Ready | `cws-assets/promo-small-440x280.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Optional (omitted) | — |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to securely store user-configured Jellyfin server URLs, API keys, Telegram bot settings, and cached search results locally in chrome.storage.local. |
| `http://*/*`, `https://*/*` | host_permissions | Required to communicate with the user's self-hosted Jellyfin server at any user-defined custom domain or local IP address (e.g., http://192.168.x.x:8096 or custom reverse-proxy HTTPS domains), and to optionally send requested additions to the user's Telegram bot via https://api.telegram.org/*. |

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

All server URLs and API tokens are stored strictly inside the browser's local storage (`chrome.storage.local`). Zero telemetry, analytics, or third-party tracking.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy
**Privacy Policy URL**: `https://patientone.uk/privacy.html`

---

## Distribution
- **Visibility**: Public
- **Regions**: All regions
- **Pricing**: Free

---

## Developer Info
- **Publisher Name**: patientone
- **Homepage URL**: `https://github.com/patientone-io/jellyfin-checker`
- **Support URL**: `https://github.com/patientone-io/jellyfin-checker/issues`

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| v1.0.1 | 2026-09-29 | Removed unused `activeTab` permission, added language auto-detect, userscript fix | ✅ **Published** |
| v1.0.0 | 2026-09-22 | Initial Chrome Web Store submission | ❌ Rejected (2026-09-25) |

---

## Review Notes

### Rejection History
| Date | Version | Reason | Fix Applied | Resolution |
|------|---------|--------|-------------|------------|
| 2026-09-25 | v1.0.0 | Violation: "Purple Potassium" — requested `activeTab` permission without actively using it in code. | Removed `activeTab` from `chrome/manifest.json`. Only `storage` is requested now. Bumped to v1.0.1. | Approved & Published (2026-09-29) |
