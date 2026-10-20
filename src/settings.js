// Both extension forms send small patches to the background write queue.
async function saveSettings(patch = {}, urlEdit = null, statusId = null) {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'update_config', patch, urlEdit });
    if (!result?.ok) throw new Error(result?.error || 'No response from the extension');
    return true;
  } catch (error) {
    const message = currentLang === 'pl' ? `Błąd zapisu: ${error.message}` : `Save failed: ${error.message}`;
    showStatus(statusId || (document.getElementById('status-jf') ? 'status-jf' : 'status'), message, 'error');
    return false;
  }
}

function bindSettingsFields(fields) {
  const pending = new Map();
  for (const [input, key, index] of fields) {
    if (!input) continue;
    const save = async () => {
      const sequence = (pending.get(input) || 0) + 1;
      pending.set(input, sequence);
      try {
        const value = input.value.trim();
        return await saveSettings(index === undefined ? { [key]: value } : {},
          index === undefined ? null : { index, value });
      } finally {
        if (pending.get(input) === sequence) pending.delete(input);
      }
    };
    input.addEventListener('input', save);
    input.addEventListener('change', save);
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.config) return;
    const before = changes.config.oldValue || {};
    const after = changes.config.newValue || {};
    for (const [input, key, index] of fields) {
      const oldValue = index === undefined ? before[key] : before[key]?.[index];
      const newValue = index === undefined ? after[key] : after[key]?.[index];
      if (input && !pending.has(input) && document.activeElement !== input && oldValue !== newValue) {
        input.value = newValue || '';
      }
    }
    if (before.language !== after.language) setLanguage(after.language || detectBrowserLang(), false);
    if (before.theme !== after.theme) applyTheme(after.theme || 'system');
    for (const [id, key] of [['toggle-sound', 'enable_sound_notifications'], ['toggle-request', 'enable_request_button']]) {
      const input = document.getElementById(id);
      if (input && before[key] !== after[key]) input.checked = after[key] ?? false;
    }
  });
}
