# 📜 Tampermonkey / Violentmonkey Userscripts

Katalog zawiera samodzielne skrypty użytkownika dla osób preferujących rozszerzenia do skryptów (Tampermonkey, Violentmonkey) zamiast instalowania pełnych rozszerzeń przeglądarkowych.

---

## 1. `jellyfin-checker.user.js`
* **Działanie:** Sprawdza dostępność filmów, seriali i osób na Twoim serwerze Jellyfin bezpośrednio podczas przeglądania serwisów **Filmweb**, **IMDb** oraz **The Movie Database (TMDb)**.
* **Gdzie działa:** `filmweb.pl`, `imdb.com`, `themoviedb.org`.
* **Konfiguracja:** Po zainstalowaniu kliknij w ikonę zębatki na badge'u statusu lub edytuj stałe konfiguracyjne w nagłówku skryptu.

---

## 2. `jellyfin-to-filmweb.user.js`
* **Działanie:** Odwrotny mostek integracji — dodaje bezpośredni, stylowy żółty przycisk **„Filmweb”** w webowym interfejsie Jellyfina (obok przycisków odtwarzania i zwiastuna) na podstronie każdego filmu i serialu.
* **Gdzie działa:** Web UI Jellyfina (`http://localhost:8096`, `http://192.168.*:8096`, `https://jellyfin.*/*`).
* **Funkcje:**
  * Automatycznie rozpoznaje tytuł, rok oraz oryginalny tytuł.
  * Wykorzystuje Provider ID Filmwebu lub odpytuje live API Filmwebu, generując bezpośredni link do karty tytułu.
  * Pełna obsługa nawigacji SPA (płynne przechodzenie między filmami w Jellyfinie bez przeładowania strony).

---

## 🚀 Instalacja
1. Zainstaluj w przeglądarce rozszerzenie **Tampermonkey** lub **Violentmonkey**.
2. Otwórz wybrany plik `.user.js` i kliknij **Raw** na GitHubie (lub skopiuj treść i utwórz nowy skrypt w Tampermonkey).
3. Zatwierdź instalację.
