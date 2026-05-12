// Jellyfin Checker - Options Page

const TRANSLATIONS = {
  pl: {
    subtitle: "Konfiguracja rozszerzenia",
    headingServer: "Jellyfin Server",
    headingTelegram: "Telegram — Prośby o dodanie",
    headingSettings: "Ustawienia",
    urlLabel: "Jellyfin URL #1",
    urlLabelExt: "Jellyfin URL #2",
    keyLabel: "Klucz API",
    labelBotToken: "Bot Token",
    labelChatId: "Chat ID",
    hintApi: "Drugi URL opcjonalny — używany gdy pierwszy nie odpowiada",
    hintKey: "Jellyfin → Dashboard → Ustawienia → Klucze API → Dodaj klucz",
    hintBot: "Stwórz bota przez @BotFather → /newbot",
    hintChatBefore: "ID Twojego czatu lub grupy (np. ",
    hintChatCode: "-1001234567890",
    hintChatAfter: " dla grupy)",
    saveBtn: "Zapisz",
    saveTgBtn: "Zapisz",
    testBtn: "Test",
    testTgBtn: "Test Telegram",
    toggleSound: "Powiadomienia dźwiękowe",
    toggleSoundSub: "Piszcz przy znalezieniu filmu",
    toggleRequest: 'Przycisk "Poproś o dodanie"',
    toggleRequestSub: 'Pokazuj gdy film nie jest na Jellyfin',
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
    headingServer: "Jellyfin Server",
    headingTelegram: "Telegram — Requests",
    headingSettings: "Settings",
    urlLabel: "Jellyfin URL #1",
    urlLabelExt: "Jellyfin URL #2",
    keyLabel: "API Key",
    labelBotToken: "Bot Token",
    labelChatId: "Chat ID",
    hintApi: "Second URL is optional — used when the first is unreachable",
    hintKey: "Jellyfin → Dashboard → Settings → API Keys → Add API Key",
    hintBot: "Create a bot via @BotFather → /newbot",
    hintChatBefore: "Your chat or group ID (e.g. ",
    hintChatCode: "-1001234567890",
    hintChatAfter: " for groups)",
    saveBtn: "Save",
    saveTgBtn: "Save",
    testBtn: "Test",
    testTgBtn: "Test Telegram",
    toggleSound: "Sound notifications",
    toggleSoundSub: "Beep when film is found",
    toggleRequest: '"Request film" button',
    toggleRequestSub: 'Show when film is not on Jellyfin',
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

let currentLang = "pl";

function setLanguage(lang) {
  currentLang = lang;
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
  // Highlight active lang button
  document.getElementById("lang-pl").classList.toggle("active", lang === "pl");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  document.title = t.subtitle + " — Jellyfin Checker";
  // Save to config
  chrome.storage.local.get("config", (result) => {
    const config = result.config || {};
    chrome.storage.local.set({ config: { ...config, language: lang } });
  });
}

function showStatus(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `status visible ${type}`;
  if (type === "success") {
    setTimeout(() => { el.className = "status"; }, 4000);
  }
}

function statusEl(id) {
  const el = document.getElementById(id);
  el.className = "status";
  return el;
}

function getLang() {
  return currentLang;
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

  currentLang = config.language || "en";
  setLanguage(currentLang);

  // Load toggle states
  const toggleSound = document.getElementById("toggle-sound");
  const toggleRequest = document.getElementById("toggle-request");
  if (toggleSound) toggleSound.checked = config.enable_sound_notifications ?? false;
  if (toggleRequest) toggleRequest.checked = config.enable_request_button ?? false;

  // Toggle change → auto-save
  if (toggleSound) {
    toggleSound.addEventListener("change", async () => {
      const cfg = (await chrome.storage.local.get("config")).config || {};
      cfg.enable_sound_notifications = toggleSound.checked;
      await chrome.storage.local.set({ config: cfg });
    });
  }
  if (toggleRequest) {
    toggleRequest.addEventListener("change", async () => {
      const cfg = (await chrome.storage.local.get("config")).config || {};
      cfg.enable_request_button = toggleRequest.checked;
      await chrome.storage.local.set({ config: cfg });
    });
  }

  // Language buttons
  document.getElementById("lang-pl").addEventListener("click", () => setLanguage("pl"));
  document.getElementById("lang-en").addEventListener("click", () => setLanguage("en"));

  // Save
  saveBtn.addEventListener("click", async () => {
    const urlInput = document.getElementById("jellyfin-url");
    if (!urlInput) return;

    const url1 = urlInput.value.trim();
    const url2 = urlExtInput?.value.trim() || '';
    const urls = [url1, url2];

    const config = {
      jellyfin_urls: urls,
      jellyfin_api_key: urls.length > 0 ? apiKeyInput.value.trim() : "",
      telegram_bot_token: telegramTokenInput.value.trim(),
      telegram_chat_id: telegramChatIdInput.value.trim(),
      language: currentLang || "en",
      enable_request_button: document.getElementById("toggle-request")?.checked ?? false,
      enable_sound_notifications: document.getElementById("toggle-sound")?.checked ?? false
    };

    if (urls.length === 0 || !apiKeyInput.value.trim()) {
      showStatus("status-jf", TRANSLATIONS[currentLang].fillFields, "error");
      return;
    }

    try {
      await chrome.storage.local.set({ config });
      showStatus("status-jf", TRANSLATIONS[currentLang].saved, "success");
    } catch (e) {
      showStatus("status-jf", TRANSLATIONS[currentLang].saveErr.replace("{{e}}", e.message), "error");
    }
  });

  // Save Telegram
  saveTgBtn.addEventListener("click", async () => {
    const cfg = (await chrome.storage.local.get("config")).config || {};
    cfg.telegram_bot_token = telegramTokenInput.value.trim();
    cfg.telegram_chat_id = telegramChatIdInput.value.trim();
    try {
      await chrome.storage.local.set({ config: cfg });
      showStatus("status-tg", TRANSLATIONS[currentLang].savedTg, "success");
    } catch (e) {
      showStatus("status-tg", TRANSLATIONS[currentLang].saveErr.replace("{{e}}", e.message), "error");
    }
  });

  // Test Jellyfin
  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    const urls = [urlInput.value.trim()].filter(Boolean);
    if (urlExtInput && urlExtInput.value.trim()) urls.push(urlExtInput.value.trim());
    const apiKey = apiKeyInput.value.trim();

    let result;
    for (const url of urls) {
      result = await chrome.runtime.sendMessage({
        action: "test_connection",
        url,
        apiKey
      });
      if (result?.success) break;
    }

    testBtn.disabled = false;
    testBtn.textContent = TRANSLATIONS[currentLang].testBtn;

    if (result && result.success) {
      showStatus("status-jf", TRANSLATIONS[currentLang].connected(result.serverName, result.version), "success");
    } else {
      showStatus("status-jf", TRANSLATIONS[currentLang].connectFail(result?.error || "No URLs configured"), "error");
    }
  });

  // Test Telegram
  testTgBtn.addEventListener("click", async () => {
    testTgBtn.disabled = true;
    testTgBtn.textContent = "Sending...";

    const result = await chrome.runtime.sendMessage({
      action: "test_telegram",
      botToken: telegramTokenInput.value.trim(),
      chatId: telegramChatIdInput.value.trim()
    });

    testTgBtn.disabled = false;
    testTgBtn.textContent = TRANSLATIONS[currentLang].testTgBtn;

    if (result.ok) {
      showStatus("status-tg", TRANSLATIONS[currentLang].testSent, "success");
    } else {
      showStatus("status-tg", TRANSLATIONS[currentLang].testFail(result.error), "error");
    }
  });
});
