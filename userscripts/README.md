[ 🇬🇧 English ](#-english) • [ 🇵🇱 Polski ](#-polski)

# Jellyfin userscripts

> Two standalone scripts: check your library on film sites or open Filmweb from Jellyfin.
>
> Dwa samodzielne skrypty: sprawdzanie biblioteki na stronach filmowych i link do Filmwebu z Jellyfina.

## 🇵🇱 Polski

Użyj tych skryptów, jeśli wolisz Tampermonkey lub Violentmonkey zamiast [rozszerzenia Jellyfin Checker](../README.md).

### Wybierz skrypt

- **[Jellyfin Checker](jellyfin-checker.user.js)** - pokazuje dostępność filmów, seriali i pozycji z udziałem danej osoby na Filmwebie, IMDb i TMDb. Wymaga adresu serwera Jellyfin i klucza API.
- **[Jellyfin to Filmweb Linker](jellyfin-to-filmweb.user.js)** - dodaje przycisk Filmweb na stronach filmów i seriali w interfejsie webowym Jellyfina. Korzysta z ID Filmwebu lub szuka tytułu przez API Filmwebu.

### Instalacja

1. Zainstaluj Tampermonkey lub Violentmonkey w przeglądarce.
2. Otwórz wybrany plik `.user.js` i kliknij **Raw** na GitHubie. Możesz też wkleić jego treść jako nowy skrypt w menedżerze.
3. Zatwierdź instalację i otwórz obsługiwaną stronę.

W Checkerze otwórz **Settings / Ustawienia** z menu menedżera skryptów lub kliknij zębatkę na statusie. Podaj adres Jellyfina i klucz API; Telegram jest opcjonalny. Konfiguracja jest zapisywana w magazynie menedżera skryptów.

Linker działa m.in. pod `localhost:8096`, lokalnymi adresami `192.168.*:8096` i `10.*:8096` oraz domenami `jellyfin.*`. Jeśli używasz innego adresu, dopasuj reguły `@match`/`@include` w nagłówku skryptu. Obsługuje przechodzenie między tytułami bez przeładowania strony.

### Połączenia i klucze

Checker łączy się z Twoim Jellyfinem i API Filmwebu, a po skonfigurowaniu próśb także z Telegramem. Linker odpytuje Filmweb. Nie wysyłają telemetrii do autora. Nie udostępniaj kopii skryptów ani eksportów ustawień zawierających własne klucze.

## 🇬🇧 English

Use these scripts if you prefer Tampermonkey or Violentmonkey to the [Jellyfin Checker extension](../README.md).

### Choose a script

- **[Jellyfin Checker](jellyfin-checker.user.js)** - shows library availability on Filmweb, IMDb and TMDb, including matching items on person pages. Requires your Jellyfin server URL and an API key.
- **[Jellyfin to Filmweb Linker](jellyfin-to-filmweb.user.js)** - adds a Filmweb button to movie and series pages in Jellyfin’s web interface. Uses the Filmweb provider ID or searches by title through Filmweb’s API.

### Install

1. Install Tampermonkey or Violentmonkey in your browser.
2. Open the chosen `.user.js` file and click **Raw** on GitHub. You can also paste its contents into a new script in your userscript manager.
3. Confirm installation and open a supported page.

For Checker, open **Settings / Ustawienia** from the userscript manager’s menu or click the gear on the status badge. Enter your Jellyfin URL and API key; Telegram is optional. Configuration is saved in the userscript manager’s storage.

Linker matches addresses including `localhost:8096`, local `192.168.*:8096` and `10.*:8096` addresses, and `jellyfin.*` domains. If your address differs, adjust the `@match`/`@include` rules in the script header. It handles navigation between titles without a page reload.

### Connections and credentials

Checker contacts your Jellyfin server and Filmweb’s API, plus Telegram when requests are configured. Linker queries Filmweb. Neither sends developer telemetry. Do not share script copies or settings exports containing your credentials.

## 👤 Author & Contact / Autor i kontakt

[patientone](https://github.com/patientone-io) • [patientone.uk](https://patientone.uk) • [contact@patientone.uk](mailto:contact@patientone.uk)

Ideas and bug reports: open an issue in this repository. Include the steps to reproduce and your setup; remove API keys and tokens from logs.

Pomysły i błędy zgłoś w Issues tego repozytorium. Podaj kroki odtworzenia i swoją konfigurację; usuń klucze API i tokeny z logów.

## 📄 License / Licencja

- **EN:** [MIT License](../LICENSE).
- **PL:** [Licencja MIT](../LICENSE).
