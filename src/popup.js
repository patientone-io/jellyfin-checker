// Jellyfin Checker - Popup Script

const TRANSLATIONS = {
  pl: {
    title: "Jellyfin Checker",
    urlLabel: "Jellyfin URL #1",
    urlPlaceholder: "http://localhost:8096",
    keyLabel: "Klucz API",
    keyPlaceholder: "••••••••",
    saveBtn: "Zapisz",
    testBtn: "Test",
    testingBtn: "Testuję...",
    fillFields: "Podaj URL i klucz API",
    saved: "Zapisano!",
    connected: server => `✅ Połączono z ${server.name} (v${server.version})`,
    connectFail: err => `❌ Błąd połączenia: ${err}`,
    howToKeyLabel: "Jak uzyskać klucz API:",
    howToKeyText: "Jellyfin → Dashboard → Ustawienia → Klucze API → Dodaj klucz",
    urlLabelExt: "Jellyfin URL #2",
    hintApi: "Drugi URL opcjonalny — używany gdy pierwszy nie odpowiada",
    settingsLink: "Pełne ustawienia",
    footer: "Jellyfin Checker v0.7.1 • Obsługuje IMDb, Filmweb, TMDb"
  },
  en: {
    urlLabel: "Jellyfin URL #1",
    urlPlaceholder: "http://localhost:8096",
    keyLabel: "API Key",
    keyPlaceholder: "••••••••",
    saveBtn: "Save",
    testBtn: "Test",
    testingBtn: "Testing...",
    fillFields: "Fill in URL and API key",
    saved: "Config saved!",
    connected: server => `✅ Connected to ${server.name} (v${server.version})`,
    connectFail: err => `❌ Connection failed: ${err}`,
    howToKeyLabel: "How to get API key:",
    howToKeyText: "Jellyfin Dashboard → Settings → API Keys → Add API Key",
    urlLabelExt: "Jellyfin URL #2",
    hintApi: "Second URL is optional — used when the first is unreachable",
    settingsLink: "Full settings",
    footer: "Jellyfin Checker v0.7.1 • Supports IMDb, Filmweb, TMDb"
  }
};

let currentLang = "pl";

function setLanguage(lang) {
  currentLang = lang;
  const t = TRANSLATIONS[lang];
  document.querySelector("[data-i18n='urlLabel']").textContent = t.urlLabel;
  document.getElementById("jellyfin-url").placeholder = t.urlPlaceholder;
  document.querySelector("[data-i18n='keyLabel']").textContent = t.keyLabel;
  document.getElementById("jellyfin-api-key").placeholder = t.keyPlaceholder;
  document.getElementById("save-btn").textContent = t.saveBtn;
  document.getElementById("test-btn").textContent = t.testBtn;
  document.getElementById("config-info-label").textContent = t.howToKeyLabel;
  document.getElementById("config-info-text").textContent = t.howToKeyText;
  const extLabel = document.querySelector("[data-i18n='urlLabelExt']");
  if (extLabel) extLabel.textContent = t.urlLabelExt;
  const hintApi = document.getElementById("hint-api");
  if (hintApi) hintApi.textContent = t.hintApi;
  const settingsLink = document.querySelector("[data-i18n='settingsLink']");
  if (settingsLink) settingsLink.textContent = t.settingsLink;
  document.querySelector(".footer").textContent = t.footer;
  // Highlight active lang
  document.getElementById("lang-pl").style.color = lang === "pl" ? "#e2e8f0" : "#94a3b8";
  document.getElementById("lang-en").style.color = lang === "en" ? "#e2e8f0" : "#94a3b8";
  document.getElementById("lang-pl").style.background = lang === "pl" ? "rgba(255,255,255,.1)" : "none";
  document.getElementById("lang-en").style.background = lang === "en" ? "rgba(255,255,255,.1)" : "none";
  // Save to config
  chrome.storage.local.get("config", (result) => {
    const config = result.config || {};
    chrome.storage.local.set({ config: { ...config, language: lang } });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("jellyfin-url");
  const apiKeyInput = document.getElementById("jellyfin-api-key");
  const saveBtn = document.getElementById("save-btn");
  const testBtn = document.getElementById("test-btn");
  const statusDiv = document.getElementById("status");

  // Load saved config
  chrome.storage.local.get("config", (result) => {
    const config = result.config || {};
    urlInput.value = config.jellyfin_urls?.[0] || '';
    const extInput = document.getElementById("jellyfin-url-external");
    if (extInput) extInput.value = config.jellyfin_urls?.[1] || '';
    if (config.jellyfin_api_key) apiKeyInput.value = config.jellyfin_api_key;
    setLanguage(config.language || "en");
  });

  // Language switchers
  document.getElementById("lang-pl").addEventListener("click", () => setLanguage("pl"));
  document.getElementById("lang-en").addEventListener("click", () => setLanguage("en"));

  // Open options page
  document.getElementById("open-options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  saveBtn.addEventListener("click", () => {
    const url1 = urlInput.value.trim();
    const extInput = document.getElementById("jellyfin-url-external");
    const url2 = extInput?.value.trim() || '';
    const urls = [url1, url2];

    if (urls.length === 0 || !apiKeyInput.value.trim()) {
      showStatus(TRANSLATIONS[currentLang].fillFields, "error");
      return;
    }

    chrome.storage.local.get("config", (result) => {
      const existing = result.config || {};
      const config = {
        ...existing,
        jellyfin_urls: urls,
        jellyfin_api_key: apiKeyInput.value.trim()
      };
      chrome.storage.local.set({ config }, () => {
        showStatus(TRANSLATIONS[currentLang].saved, "success");
      });
    });
  });

  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    const url1 = urlInput.value.trim();
    const extInput = document.getElementById("jellyfin-url-external");
    const url2 = extInput?.value.trim() || '';
    const urls = [url1, url2].filter(Boolean);
    const apiKey = apiKeyInput.value.trim();

    let result;
    for (const url of urls) {
      result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "test_connection",
          url,
          apiKey
        }, resolve);
      });
      if (result?.success) break;
    }

    testBtn.disabled = false;
    testBtn.textContent = "Test";

    if (result && result.success) {
      showStatus(TRANSLATIONS[currentLang].connected(result.serverName, result.version), "success");
    } else {
      showStatus(TRANSLATIONS[currentLang].connectFail(result?.error || "No URLs configured"), "error");
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    if (type === "success") {
      setTimeout(() => {
        statusDiv.className = "status";
      }, 3000);
    }
  }
});
