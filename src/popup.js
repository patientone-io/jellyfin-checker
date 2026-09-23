// Jellyfin Checker - All-in-One Popup Script

const TRANSLATIONS = {
  pl: {
    tabServer: "Serwer",
    tabSettings: "Opcje & Telegram",
    urlLabel: "Jellyfin URL #1",
    urlPlaceholder: "http://localhost:8096",
    urlLabelExt: "Jellyfin URL #2",
    hintApi: "Drugi URL opcjonalny — używany gdy pierwszy nie odpowiada",
    keyLabel: "Klucz API",
    keyPlaceholder: "••••••••",
    hintKey: "Jellyfin → Dashboard → Ustawienia → Klucze API",
    saveBtn: "Zapisz",
    testBtn: "Test połączenia",
    testingBtn: "Testuję...",
    toggleSound: "Powiadomienia dźwiękowe",
    toggleSoundSub: "Piszcz przy znalezieniu pozycji",
    toggleRequest: "Przycisk „Poproś o dodanie”",
    toggleRequestSub: "Pokazuj gdy film nie jest na Jellyfin",
    tgTokenLabel: "Telegram Bot Token",
    tgChatLabel: "Telegram Chat ID",
    hintBot: "Stwórz bota przez @BotFather → /newbot",
    hintChat: "ID czatu lub grupy (np. -1001234567890)",
    saveTgBtn: "Zapisz",
    testTgBtn: "Test Telegram",
    fullOptionsLink: "Pełne okno opcji ↗",
    fillFields: "Podaj URL i klucz API",
    fillTgFields: "Podaj Bot Token i Chat ID",
    saved: "✅ Zapisano!",
    connected: (name, ver) => `✅ Połączono z ${name} (v${ver})`,
    connectFail: (err) => `❌ Błąd połączenia: ${err}`,
    tgSent: "✅ Wiadomość testowa wysłana!",
    tgFail: (err) => `❌ Błąd Telegram: ${err}`
  },
  en: {
    tabServer: "Server",
    tabSettings: "Options & Telegram",
    urlLabel: "Jellyfin URL #1",
    urlPlaceholder: "http://localhost:8096",
    urlLabelExt: "Jellyfin URL #2",
    hintApi: "Second URL is optional — used when the first is unreachable",
    keyLabel: "API Key",
    keyPlaceholder: "••••••••",
    hintKey: "Jellyfin → Dashboard → Settings → API Keys",
    saveBtn: "Save",
    testBtn: "Test Connection",
    testingBtn: "Testing...",
    toggleSound: "Sound Notifications",
    toggleSoundSub: "Beep when item is found on Jellyfin",
    toggleRequest: '"Request item" button',
    toggleRequestSub: "Show when film is not in library",
    tgTokenLabel: "Telegram Bot Token",
    tgChatLabel: "Telegram Chat ID",
    hintBot: "Create a bot via @BotFather → /newbot",
    hintChat: "Chat or group ID (e.g. -1001234567890)",
    saveTgBtn: "Save",
    testTgBtn: "Test Telegram",
    fullOptionsLink: "Full options page ↗",
    fillFields: "Fill in URL and API key",
    fillTgFields: "Fill in Bot Token and Chat ID",
    saved: "✅ Saved!",
    connected: (name, ver) => `✅ Connected to ${name} (v${ver})`,
    connectFail: (err) => `❌ Connection failed: ${err}`,
    tgSent: "✅ Test message sent!",
    tgFail: (err) => `❌ Telegram error: ${err}`
  }
};

let currentLang = "en";
let currentTheme = "system";

function detectBrowserLang() {
  return (navigator.language || "").toLowerCase().startsWith("pl") ? "pl" : "en";
}

function applyTheme(theme) {
  currentTheme = theme || "system";
  const themeBtn = document.getElementById("theme-btn");
  if (!themeBtn) return;
  
  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeBtn.textContent = "🌙";
    themeBtn.title = currentLang === "pl" ? "Motyw: Ciemny" : "Theme: Dark";
  } else if (currentTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    themeBtn.textContent = "☀️";
    themeBtn.title = currentLang === "pl" ? "Motyw: Jasny" : "Theme: Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeBtn.textContent = "🌓";
    themeBtn.title = currentLang === "pl" ? "Motyw: Systemowy" : "Theme: System";
  }
}

function setLanguage(lang) {
  currentLang = lang;
  const t = TRANSLATIONS[lang];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) el.textContent = t[key];
  });

  const urlInput = document.getElementById("jellyfin-url");
  if (urlInput) urlInput.placeholder = t.urlPlaceholder;
  const keyInput = document.getElementById("jellyfin-api-key");
  if (keyInput) keyInput.placeholder = t.keyPlaceholder;
  const hintApi = document.getElementById("hint-api");
  if (hintApi) hintApi.textContent = t.hintApi;
  const hintKey = document.getElementById("hint-key");
  if (hintKey) hintKey.textContent = t.hintKey;
  const hintBot = document.getElementById("hint-bot");
  if (hintBot) hintBot.textContent = t.hintBot;
  const hintChat = document.getElementById("hint-chat");
  if (hintChat) hintChat.textContent = t.hintChat;

  document.getElementById("lang-pl")?.classList.toggle("active", lang === "pl");
  document.getElementById("lang-en")?.classList.toggle("active", lang === "en");

  applyTheme(currentTheme);

  chrome.storage.local.get("config", (result) => {
    const config = result.config || {};
    chrome.storage.local.set({ config: { ...config, language: lang } });
  });
}

function showStatus(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`;
  if (type === "success") {
    setTimeout(() => {
      el.className = "status";
    }, 4000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("jellyfin-url");
  const extInput = document.getElementById("jellyfin-url-external");
  const apiKeyInput = document.getElementById("jellyfin-api-key");
  const tgTokenInput = document.getElementById("telegram-bot-token");
  const tgChatInput = document.getElementById("telegram-chat-id");
  const toggleSound = document.getElementById("toggle-sound");
  const toggleRequest = document.getElementById("toggle-request");

  const saveBtn = document.getElementById("save-btn");
  const testBtn = document.getElementById("test-btn");
  const saveTgBtn = document.getElementById("save-tg-btn");
  const testTgBtn = document.getElementById("test-tg-btn");
  const themeBtn = document.getElementById("theme-btn");

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // Load config
  chrome.storage.local.get("config", (result) => {
    const config = result.config || {};
    urlInput.value = config.jellyfin_urls?.[0] || '';
    if (extInput) extInput.value = config.jellyfin_urls?.[1] || '';
    if (config.jellyfin_api_key) apiKeyInput.value = config.jellyfin_api_key;
    if (config.telegram_bot_token) tgTokenInput.value = config.telegram_bot_token;
    if (config.telegram_chat_id) tgChatInput.value = config.telegram_chat_id;

    if (toggleSound) toggleSound.checked = config.enable_sound_notifications ?? false;
    if (toggleRequest) toggleRequest.checked = config.enable_request_button ?? false;

    currentLang = config.language || detectBrowserLang();
    setLanguage(currentLang);
    applyTheme(config.theme || "system");
  });

  // Theme button cycle: system -> dark -> light -> system
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      let next = "dark";
      if (currentTheme === "system") next = "dark";
      else if (currentTheme === "dark") next = "light";
      else if (currentTheme === "light") next = "system";

      applyTheme(next);
      chrome.storage.local.get("config", (result) => {
        const config = result.config || {};
        chrome.storage.local.set({ config: { ...config, theme: next } });
      });
    });
  }

  // Language buttons
  document.getElementById("lang-pl")?.addEventListener("click", () => setLanguage("pl"));
  document.getElementById("lang-en")?.addEventListener("click", () => setLanguage("en"));

  // Open full options page
  document.getElementById("open-options")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Autosave function for all fields
  function autoSave() {
    const url1 = urlInput.value.trim();
    const url2 = extInput ? extInput.value.trim() : '';
    const key = apiKeyInput.value.trim();
    const bot = tgTokenInput.value.trim();
    const chat = tgChatInput.value.trim();

    chrome.storage.local.get("config", (result) => {
      const existing = result.config || {};
      const config = {
        ...existing,
        jellyfin_urls: [url1, url2].filter(Boolean),
        jellyfin_api_key: key,
        telegram_bot_token: bot,
        telegram_chat_id: chat
      };
      chrome.storage.local.set({ config });
    });
  }

  urlInput.addEventListener("input", autoSave);
  if (extInput) extInput.addEventListener("input", autoSave);
  apiKeyInput.addEventListener("input", autoSave);
  tgTokenInput.addEventListener("input", autoSave);
  tgChatInput.addEventListener("input", autoSave);

  // Toggle checkboxes autosave
  toggleSound?.addEventListener("change", () => {
    chrome.storage.local.get("config", (result) => {
      const config = result.config || {};
      config.enable_sound_notifications = toggleSound.checked;
      chrome.storage.local.set({ config });
    });
  });

  toggleRequest?.addEventListener("change", () => {
    chrome.storage.local.get("config", (result) => {
      const config = result.config || {};
      config.enable_request_button = toggleRequest.checked;
      chrome.storage.local.set({ config });
    });
  });

  // Save server config
  saveBtn.addEventListener("click", () => {
    const url1 = urlInput.value.trim();
    const url2 = extInput ? extInput.value.trim() : '';
    const key = apiKeyInput.value.trim();
    const urls = [url1, url2].filter(Boolean);

    if (urls.length === 0 || !key) {
      showStatus("status", TRANSLATIONS[currentLang].fillFields, "error");
      return;
    }

    chrome.storage.local.get("config", (result) => {
      const config = result.config || {};
      config.jellyfin_urls = urls;
      config.jellyfin_api_key = key;
      chrome.storage.local.set({ config }, () => {
        showStatus("status", TRANSLATIONS[currentLang].saved, "success");
      });
    });
  });

  // Test server connection
  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = TRANSLATIONS[currentLang].testingBtn;

    const urls = [urlInput.value.trim()].filter(Boolean);
    if (extInput && extInput.value.trim()) urls.push(extInput.value.trim());
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
    testBtn.textContent = TRANSLATIONS[currentLang].testBtn;

    if (result && result.success) {
      showStatus("status", TRANSLATIONS[currentLang].connected(result.serverName, result.version), "success");
    } else {
      showStatus("status", TRANSLATIONS[currentLang].connectFail(result?.error || "Brak skonfigurowanego URL"), "error");
    }
  });

  // Save Telegram config
  saveTgBtn?.addEventListener("click", () => {
    const bot = tgTokenInput.value.trim();
    const chat = tgChatInput.value.trim();

    if (!bot || !chat) {
      showStatus("status-tg", TRANSLATIONS[currentLang].fillTgFields, "error");
      return;
    }

    chrome.storage.local.get("config", (result) => {
      const config = result.config || {};
      config.telegram_bot_token = bot;
      config.telegram_chat_id = chat;
      chrome.storage.local.set({ config }, () => {
        showStatus("status-tg", TRANSLATIONS[currentLang].saved, "success");
      });
    });
  });

  // Test Telegram connection
  testTgBtn?.addEventListener("click", async () => {
    testTgBtn.disabled = true;
    testTgBtn.textContent = TRANSLATIONS[currentLang].testingBtn;

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "test_telegram",
        botToken: tgTokenInput.value.trim(),
        chatId: tgChatInput.value.trim()
      }, resolve);
    });

    testTgBtn.disabled = false;
    testTgBtn.textContent = TRANSLATIONS[currentLang].testTgBtn;

    if (result?.ok) {
      showStatus("status-tg", TRANSLATIONS[currentLang].tgSent, "success");
    } else {
      showStatus("status-tg", TRANSLATIONS[currentLang].tgFail(result?.error || "Nieznany błąd"), "error");
    }
  });
});
