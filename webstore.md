# 🚀 Chrome Web Store — Gotowa ściągawka do wklejenia

Wszystkie pola formularza przygotowane do szybkiego skopiowania do **Chrome Web Store Developer Console**.

---

## 1. Szczegóły produktu (*Product details*)

### Tytuł z pakietu:
*(Wypełnione automatycznie)* `Jellyfin Checker`

### Podsumowanie z pakietu:
*(Wypełnione automatycznie)* `Browser extension that checks if movies, shows, or people are available on your Jellyfin server`

### Kategoria (*Category*):
`Narzędzia` (lub w wersji angielskiej: `Productivity`)

### Język (*Language*):
`angielski` (lub `English`)

---

## 2. Opis (*Description*) — Pełna wersja dwujęzyczna (Kopiuj całość poniżej)

```text
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
```

---

## 3. Zasoby graficzne (*Graphic assets*)

Wszystkie pliki są przygotowane, spełniają wymiary i nie posiadają kanału alfa:

| Pole w formularzu | Ścieżka do pliku na dysku | Wymiary |
|---|---|---|
| **Ikona sklepu** | `src/icon128.png` | 128 × 128 px |
| **Zrzut ekranu #1** | `cws-assets/screenshot-1-popup.png` | 1280 × 800 px |
| **Zrzut ekranu #2** | `cws-assets/screenshot-2-badges.png` | 1280 × 800 px |
| **Mały obraz promocji** | `cws-assets/promo-small-440x280.png` | 440 × 280 px |
| **Transparent promocyjny** | *(pozostaw puste — jest opcjonalny)* | — |
| **Film promocyjny YouTube** | *(pozostaw puste — jest opcjonalny)* | — |

---

## 4. Dodatkowe pola (*Additional fields*)

* **Oficjalny adres URL:**  
  `Brak`
* **Adres URL strony głównej (*Homepage URL*):**  
  `https://github.com/patientone-io/jellyfin-checker`
* **Adres URL pomocy (*Support URL*):**  
  `https://github.com/patientone-io/jellyfin-checker/issues`
* **Treści dla dorosłych (*Mature content*):**  
  `Nie` *(odznaczone)*
* **Pomoc dotycząca produktu:**  
  `Włączone` *(domyślne)*

---

## 5. Zakładka „Prywatność” (*Privacy tab*)

### Adres URL polityki prywatności (*Privacy policy URL*):
`https://patientone.uk/privacy.html`

### Jedyny cel wtyczki (*Single purpose*):
```text
Checks and displays availability of movies, shows, and people on the user's private Jellyfin server directly on movie database pages.
```

### Uzasadnienia uprawnień (*Permission justifications*):

* Dla **`storage`**:
```text
Used to securely store user-configured Jellyfin server URLs, API keys, Telegram bot settings, and cached search results locally in chrome.storage.local.
```

* Dla **`host_permissions` (`http://*/*`, `https://*/*`)**:
```text
Required to communicate with the user's self-hosted Jellyfin server at any user-defined custom domain or local IP address (e.g., http://192.168.x.x:8096 or custom reverse-proxy HTTPS domains), and to optionally send requested additions to the user's Telegram bot via https://api.telegram.org/*.
```

### Zbieranie danych (*Data usage / collection*):
Zaznacz: **Nie (No)** — brak zbierania danych osobowych, finansowych, zdrowotnych czy historii przeglądania.
