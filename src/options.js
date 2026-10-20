// Jellyfin Checker - Options Page

const TRANSLATIONS = {
  pl: {
    subtitle: "Konfiguracja rozszerzenia",
    headingServer: "🎬 Jellyfin Server",
    headingTelegram: "📢 Telegram - Prośby o dodanie",
    headingSettings: "🌍 Ustawienia",
    urlLabel: "Jellyfin URL #1",
    urlLabelExt: "Jellyfin URL #2",
    keyLabel: "Klucz API",
    labelBotToken: "Bot Token",
    labelChatId: "Chat ID",
    hintApi: "Drugi URL opcjonalny - używany gdy pierwszy nie odpowiada",
    hintKey: "Jellyfin → Dashboard → Ustawienia → Klucze API → Dodaj klucz",
    hintBot: "Stwórz bota przez @BotFather → /newbot",
    hintChatBefore: "ID Twojego czatu lub grupy (np. ",
    hintChatCode: "-1001234567890",
    hintChatAfter: " dla grupy)",
    saveBtn: "Zapisz",
    saveTgBtn: "Zapisz",
    testBtn: "Test",
    testingBtn: "Testuję...",
    testTgBtn: "Test Telegram",
    noUrls: "Brak skonfigurowanego URL",
    noResponse: "Brak odpowiedzi rozszerzenia",
    toggleSound: "Powiadomienia dźwiękowe",
    toggleSoundSub: "Piszcz przy znalezieniu filmu",
    toggleRequest: 'Przycisk "Poproś o dodanie"',
    toggleRequestSub: 'Pokazuj gdy film nie jest na Jellyfin',
    themeLabel: "Motyw interfejsu",
    themeSub: "Wybierz motyw wyświetlania rozszerzenia",
    saved: "✅ Zapisano konfigurację!",
    savedTg: "✅ Zapisano Telegram!",
    fillFields: "Podaj URL i klucz API",
    saveErr: "Błąd zapisu: {{e}}",
    connected: (name, ver) => `✅ Połączono z ${name} (v${ver})`,
    connectFail: (err) => `❌ Błąd połączenia: ${err}`,
    testSent: "✅ Test wysłany!",
    testFail: (err) => `❌ ${err}`,
  },
  en: {
    subtitle: "Extension settings",
    headingServer: "🎬 Jellyfin Server",
    headingTelegram: "📢 Telegram - Requests",
    headingSettings: "🌍 Settings",
    urlLabel: "Jellyfin URL #1",
    urlLabelExt: "Jellyfin URL #2",
    keyLabel: "API Key",
    labelBotToken: "Bot Token",
    labelChatId: "Chat ID",
    hintApi: "Second URL is optional - used when the first is unreachable",
    hintKey: "Jellyfin → Dashboard → Settings → API Keys → Add API Key",
    hintBot: "Create a bot via @BotFather → /newbot",
    hintChatBefore: "Your chat or group ID (e.g. ",
    hintChatCode: "-1001234567890",
    hintChatAfter: " for groups)",
    saveBtn: "Save",
    saveTgBtn: "Save",
    testBtn: "Test",
    testingBtn: "Testing...",
    testTgBtn: "Test Telegram",
    noUrls: "No URLs configured",
    noResponse: "No response from the extension",
    toggleSound: "Sound notifications",
    toggleSoundSub: "Beep when film is found",
    toggleRequest: '"Request film" button',
    toggleRequestSub: 'Show when film is not on Jellyfin',
    themeLabel: "Interface theme",
    themeSub: "Choose extension display theme",
    saved: "✅ Configuration saved!",
    savedTg: "✅ Telegram saved!",
    fillFields: "Fill in URL and API key",
    saveErr: "Save error: {{e}}",
    connected: (name, ver) => `✅ Connected to ${name} (v${ver})`,
    connectFail: (err) => `❌ Connection failed: ${err}`,
    testSent: "✅ Test message sent!",
    testFail: (err) => `❌ ${err}`,
  }
};

let currentLang = "en";
let currentTheme = "system";

function detectBrowserLang() {
  return (navigator.language || "").toLowerCase().startsWith("pl") ? "pl" : "en";
}

function applyTheme(theme) {
  currentTheme = theme || "system";
  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (currentTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  const btnSys = document.getElementById("theme-system");
  const btnDark = document.getElementById("theme-dark");
  const btnLight = document.getElementById("theme-light");
  if (btnSys) btnSys.classList.toggle("active", currentTheme === "system");
  if (btnDark) btnDark.classList.toggle("active", currentTheme === "dark");
  if (btnLight) btnLight.classList.toggle("active", currentTheme === "light");
}

function saveTheme(theme) {
  applyTheme(theme);
  saveSettings({ theme });
}

function setLanguage(lang, persist = true) {
  lang = Object.hasOwn(TRANSLATIONS, lang) ? lang : detectBrowserLang();
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = TRANSLATIONS[lang];
  document.getElementById("subtitle").textContent = t.subtitle;
  document.querySelector("[data-i18n='headingServer']").textContent = t.headingServer;
  document.querySelector("[data-i18n='headingTelegram']").textContent = t.headingTelegram;
  document.querySelector("[data-i18n='headingSettings']").textContent = t.headingSettings;
  document.querySelector("[data-i18n='urlLabel']").textContent = t.urlLabel;
  document.querySelector("[data-i18n='urlLabelExt']").textContent = t.urlLabelExt;
  document.querySelector("[data-i18n='keyLabel']").textContent = t.keyLabel;
  document.querySelector("[data-i18n='labelBotToken']").textContent = t.labelBotToken;
  document.querySelector("[data-i18n='labelChatId']").textContent = t.labelChatId;
  document.getElementById("hint-api").textContent = t.hintApi;
  document.getElementById("hint-key").textContent = t.hintKey;
  document.getElementById("hint-bot").textContent = t.hintBot;
  document.getElementById("hint-chat-before").textContent = t.hintChatBefore;
  document.getElementById("hint-chat-code").textContent = t.hintChatCode;
  document.getElementById("hint-chat-after").textContent = t.hintChatAfter;
  document.getElementById("save-btn").textContent = t.saveBtn;
  document.getElementById("save-tg-btn").textContent = t.saveTgBtn;
  document.getElementById("test-btn").textContent = t.testBtn;
  document.getElementById("test-tg-btn").textContent = t.testTgBtn;
  document.getElementById("toggle-notif-label").textContent = t.toggleSound;
  document.getElementById("toggle-notif-sub").textContent = t.toggleSoundSub;
  document.getElementById("toggle-request-label").textContent = t.toggleRequest;
  document.getElementById("toggle-request-sub").textContent = t.toggleRequestSub;
  const themeLabelEl = document.getElementById("theme-label");
  if (themeLabelEl) themeLabelEl.textContent = t.themeLabel;
  const themeSubEl = document.getElementById("theme-sub");
  if (themeSubEl) themeSubEl.textContent = t.themeSub;
  // Highlight active lang button
  document.getElementById("lang-pl").classList.toggle("active", lang === "pl");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  document.title = t.subtitle + " - Jellyfin Checker";
  // Save to config
  if (persist) saveSettings({ language: lang });
}

function showStatus(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `status visible ${type}`;
  if (type === "success") {
    setTimeout(() => { el.className = "status"; }, 4000);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("jellyfin-url");
  const urlExtInput = document.getElementById("jellyfin-url-external");
  const apiKeyInput = document.getElementById("jellyfin-api-key");
  const telegramTokenInput = document.getElementById("telegram-bot-token");
  const telegramChatIdInput = document.getElementById("telegram-chat-id");
  const saveBtn = document.getElementById("save-btn");
  const saveTgBtn = document.getElementById("save-tg-btn");
  const testBtn = document.getElementById("test-btn");
  const testTgBtn = document.getElementById("test-tg-btn");

  // Load config
  const result = await chrome.storage.local.get("config");
  const config = result.config || {};
  urlInput.value = config.jellyfin_urls?.[0] || '';
  if (urlExtInput) urlExtInput.value = config.jellyfin_urls?.[1] || '';
  if (config.jellyfin_api_key) apiKeyInput.value = config.jellyfin_api_key;
  if (config.telegram_bot_token) telegramTokenInput.value = config.telegram_bot_token;
  if (config.telegram_chat_id) telegramChatIdInput.value = config.telegram_chat_id;

  currentLang = config.language || detectBrowserLang();
  setLanguage(currentLang, false);
  applyTheme(config.theme || "system");

  // Load toggle states
  const toggleSound = document.getElementById("toggle-sound");
  const toggleRequest = document.getElementById("toggle-request");
  if (toggleSound) toggleSound.checked = config.enable_sound_notifications ?? false;
  if (toggleRequest) toggleRequest.checked = config.enable_request_button ?? false;

  // Toggle change → auto-save
  if (toggleSound) {
    toggleSound.addEventListener("change", () => saveSettings({ enable_sound_notifications: toggleSound.checked }));
  }
  if (toggleRequest) {
    toggleRequest.addEventListener("change", () => saveSettings({ enable_request_button: toggleRequest.checked }));
  }

  // Language buttons
  document.getElementById("lang-pl")?.addEventListener("click", () => setLanguage("pl"));
  document.getElementById("lang-en")?.addEventListener("click", () => setLanguage("en"));

  // Theme buttons
  document.getElementById("theme-system")?.addEventListener("click", () => saveTheme("system"));
  document.getElementById("theme-dark")?.addEventListener("click", () => saveTheme("dark"));
  document.getElementById("theme-light")?.addEventListener("click", () => saveTheme("light"));

  // Auto-save on typing in options as well
  const textFields = [
    [urlInput, "jellyfin_urls", 0],
    [urlExtInput, "jellyfin_urls", 1],
    [apiKeyInput, "jellyfin_api_key"],
    [telegramTokenInput, "telegram_bot_token"],
    [telegramChatIdInput, "telegram_chat_id"]
  ];
  bindSettingsFields(textFields);

  // Save
  saveBtn.addEventListener("click", async () => {
    const urlInput = document.getElementById("jellyfin-url");
    if (!urlInput) return;

    const url1 = urlInput.value.trim();
    const url2 = urlExtInput?.value.trim() || '';
    const apiKey = apiKeyInput.value.trim();
    const urls = [url1, url2].filter(Boolean);

    const config = { jellyfin_urls: [url1, url2], jellyfin_api_key: apiKey };

    if (urls.length === 0 || !apiKey) {
      showStatus("status-jf", TRANSLATIONS[currentLang].fillFields, "error");
      return;
    }

    if (await saveSettings(config, null, 'status-jf')) {
      showStatus("status-jf", TRANSLATIONS[currentLang].saved, "success");
    }
  });

  // Save Telegram
  saveTgBtn.addEventListener("click", async () => {
    if (await saveSettings({ telegram_bot_token: telegramTokenInput.value.trim(),
      telegram_chat_id: telegramChatIdInput.value.trim() }, null, 'status-tg')) {
      showStatus("status-tg", TRANSLATIONS[currentLang].savedTg, "success");
    }
  });

  // Test Jellyfin
  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = TRANSLATIONS[currentLang].testingBtn;
    try {
      const urls = [urlInput.value.trim(), urlExtInput?.value.trim()].filter(Boolean);
      let result;
      for (const url of urls) {
        result = await chrome.runtime.sendMessage({
          action: "test_connection", url, apiKey: apiKeyInput.value.trim()
        });
        if (result?.success) break;
      }
      const t = TRANSLATIONS[currentLang];
      if (result?.success) {
        showStatus("status-jf", t.connected(result.serverName, result.version), "success");
      } else {
        showStatus("status-jf", t.connectFail(result?.error || (urls.length ? t.noResponse : t.noUrls)), "error");
      }
    } catch (error) {
      showStatus("status-jf", TRANSLATIONS[currentLang].connectFail(error.message), "error");
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = TRANSLATIONS[currentLang].testBtn;
    }
  });

  // Test Telegram
  testTgBtn?.addEventListener("click", async () => {
    testTgBtn.disabled = true;
    testTgBtn.textContent = TRANSLATIONS[currentLang].testingBtn;
    try {
      const result = await chrome.runtime.sendMessage({
        action: "test_telegram", botToken: telegramTokenInput.value.trim(), chatId: telegramChatIdInput.value.trim()
      });
      const t = TRANSLATIONS[currentLang];
      if (result?.ok) {
        showStatus("status-tg", t.testSent, "success");
      } else {
        showStatus("status-tg", t.testFail(result?.error || t.noResponse), "error");
      }
    } catch (error) {
      showStatus("status-tg", TRANSLATIONS[currentLang].testFail(error.message), "error");
    } finally {
      testTgBtn.disabled = false;
      testTgBtn.textContent = TRANSLATIONS[currentLang].testTgBtn;
    }
  });
});
