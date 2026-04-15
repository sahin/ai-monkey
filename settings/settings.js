/**
 * settings.js - AI Monkey settings page
 *
 * Manages API configuration, defaults, and data operations.
 */

import {
  getSettings,
  saveSettings,
  getScripts,
  saveScript,
  getLogs,
  clearLogs,
  clearCache,
  DEFAULT_SETTINGS
} from '../lib/storage.js';
import { formatCount, initI18n, localizePage, t } from '../lib/i18n.js';

// ---------------------------------------------------------------------------
// Provider & model configuration
// ---------------------------------------------------------------------------

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', descKey: 'settingsModelDescBestValue', default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', descKey: 'settingsModelDescFastestCheapest' },
      { id: 'gpt-4.1', name: 'GPT-4.1', descKey: 'settingsModelDescLatestFlagship' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', descKey: 'settingsModelDescCompactLatest' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', descKey: 'settingsModelDescSmallestFastest' },
      { id: 'o3', name: 'o3', descKey: 'settingsModelDescReasoning' },
      { id: 'o4-mini', name: 'o4-mini', descKey: 'settingsModelDescFastReasoning' },
    ]
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', descKey: 'settingsModelDescBestBalance', default: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', descKey: 'settingsModelDescMostCapable' },
      { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', descKey: 'settingsModelDescFastestCheapest' },
    ]
  },
  google: {
    name: 'Google',
    models: [
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', descKey: 'settingsModelDescMostCapable', default: true },
      { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', descKey: 'settingsModelDescGoogleFastEfficient' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', descKey: 'settingsModelDescPreviousGenFast' },
    ]
  },
  groq: {
    name: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', descKey: 'settingsModelDescBestOpenModel', default: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', descKey: 'settingsModelDescUltraFast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', descKey: 'settingsModelDescFastMoe' },
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', descKey: 'settingsModelDescRoutesToOpenAI', default: true },
      { id: 'anthropic/claude-sonnet-4-20250514', name: 'Sonnet 4 (via OR)', descKey: 'settingsModelDescRoutesToAnthropic' },
      { id: 'google/gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro (via OR)', descKey: 'settingsModelDescRoutesToGoogle' },
    ]
  },
};

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const localeEl = document.getElementById('locale');
const providerEl = document.getElementById('provider');
const modelEl = document.getElementById('model');
const customModelGroup = document.getElementById('custom-model-group');
const customModelEl = document.getElementById('custom-model');
const apiKeyEl = document.getElementById('api-key');
const toggleKeyBtn = document.getElementById('toggle-key');
const eyeOpen = document.getElementById('eye-open');
const eyeClosed = document.getElementById('eye-closed');
const testBtn = document.getElementById('test-btn');
const testResult = document.getElementById('test-result');
const defaultRunAtEl = document.getElementById('default-runat');
const cacheEnabledEl = document.getElementById('cache-enabled');
const cacheLabel = document.getElementById('cache-label');
const cacheCountEl = document.getElementById('cache-count');
const logCountEl = document.getElementById('log-count');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const exportBtn = document.getElementById('export-btn');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');
const toastEl = document.getElementById('toast');
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmBody = document.getElementById('confirm-body');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');
let refreshGdriveUI = null;

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = null;

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.hidden = false;
  void toastEl.offsetWidth;
  toastEl.classList.add('visible');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('visible');
    setTimeout(() => { toastEl.hidden = true; }, 200);
  }, 2500);
}

// ---------------------------------------------------------------------------
// Confirmation modal helper
// ---------------------------------------------------------------------------

let confirmResolve = null;

function showConfirm(title, body) {
  confirmTitle.textContent = title;
  confirmBody.textContent = body;
  confirmModal.hidden = false;
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

confirmCancel.addEventListener('click', () => {
  confirmModal.hidden = true;
  if (confirmResolve) confirmResolve(false);
});

confirmOk.addEventListener('click', () => {
  confirmModal.hidden = true;
  if (confirmResolve) confirmResolve(true);
});

confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    confirmModal.hidden = true;
    if (confirmResolve) confirmResolve(false);
  }
});

// ---------------------------------------------------------------------------
// Provider & model population
// ---------------------------------------------------------------------------

function populateProviders(selectedProvider) {
  providerEl.innerHTML = '';
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = provider.name;
    if (key === selectedProvider) opt.selected = true;
    providerEl.appendChild(opt);
  }
}

function populateLocaleOptions(selectedLocale) {
  const options = [
    { value: 'auto', label: t('commonLanguageAuto') },
    { value: 'en', label: t('commonLanguageEnglish') },
    { value: 'tr', label: t('commonLanguageTurkish') }
  ];

  localeEl.innerHTML = '';
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.selected = option.value === selectedLocale;
    localeEl.appendChild(opt);
  }
}

function populateModels(providerKey, selectedModelId) {
  const provider = PROVIDERS[providerKey];
  if (!provider) return;

  modelEl.innerHTML = '';

  let hasMatch = false;

  for (const model of provider.models) {
    const opt = document.createElement('option');
    opt.value = model.id;
    opt.textContent = `${model.name}  \u2014  ${t(model.descKey)}`;
    if (model.id === selectedModelId) {
      opt.selected = true;
      hasMatch = true;
    }
    modelEl.appendChild(opt);
  }

  // Add custom option
  const customOpt = document.createElement('option');
  customOpt.value = '__custom__';
  customOpt.textContent = t('settingsCustomModelOption');
  modelEl.appendChild(customOpt);

  // If the saved model doesn't match any known model, select custom
  if (selectedModelId && !hasMatch && selectedModelId !== '__custom__') {
    customOpt.selected = true;
    customModelEl.value = selectedModelId;
    customModelGroup.hidden = false;
  } else {
    customModelGroup.hidden = true;
  }

  // If nothing selected, select the default
  if (!selectedModelId && !hasMatch) {
    const defaultModel = provider.models.find(m => m.default) || provider.models[0];
    if (defaultModel) {
      modelEl.value = defaultModel.id;
    }
  }
}

function getSelectedModelId() {
  const val = modelEl.value;
  if (val === '__custom__') {
    return customModelEl.value.trim();
  }
  return val;
}

function getDefaultModelForProvider(providerKey) {
  const provider = PROVIDERS[providerKey];
  if (!provider) return 'gpt-4o';
  const def = provider.models.find(m => m.default);
  return def ? def.id : provider.models[0]?.id || 'gpt-4o';
}

// ---------------------------------------------------------------------------
// Event: provider change
// ---------------------------------------------------------------------------

providerEl.addEventListener('change', () => {
  const provider = providerEl.value;
  const defaultModel = getDefaultModelForProvider(provider);
  populateModels(provider, defaultModel);
  customModelGroup.hidden = true;
  customModelEl.value = '';
});

localeEl.addEventListener('change', async () => {
  const locale = localeEl.value;
  await saveSettings({ locale });
  await applyLocale(locale, { showToastMessage: true });
});

// ---------------------------------------------------------------------------
// Event: model change
// ---------------------------------------------------------------------------

modelEl.addEventListener('change', () => {
  if (modelEl.value === '__custom__') {
    customModelGroup.hidden = false;
    customModelEl.focus();
  } else {
    customModelGroup.hidden = true;
    customModelEl.value = '';
  }
});

// ---------------------------------------------------------------------------
// Load & populate form
// ---------------------------------------------------------------------------

async function loadForm() {
  const settings = await getSettings();

  populateLocaleOptions(settings.locale || 'auto');
  populateProviders(settings.provider || 'openai');
  populateModels(settings.provider || 'openai', settings.model);

  apiKeyEl.value = settings.apiKey || '';
  defaultRunAtEl.value = settings.defaultRunAt || 'document-idle';
  cacheEnabledEl.checked = settings.cacheEnabled !== false;
  localeEl.value = settings.locale || 'auto';
  updateCacheLabel();

  await updateCounts();
}

function updateCacheLabel() {
  cacheLabel.textContent = cacheEnabledEl.checked ? t('settingsCacheEnabledOn') : t('settingsCacheEnabledOff');
}

async function updateCounts() {
  const result = await chrome.storage.local.get('cache');
  const cache = result.cache || {};
  const cacheCount = Object.keys(cache).length;
  cacheCountEl.textContent = formatCount(cacheCount, 'commonEntryCountOne', 'commonEntryCountOther');

  const logs = await getLogs();
  logCountEl.textContent = formatCount(logs.length, 'commonEntryCountOne', 'commonEntryCountOther');
}

function setButtonLabel(button, key) {
  const label = button.querySelector('span');
  if (label) {
    label.dataset.i18n = key;
    label.textContent = t(key);
  } else {
    button.textContent = t(key);
  }
}

async function applyLocale(localePreference, { showToastMessage = false } = {}) {
  const selectedModelId = getSelectedModelId();
  await initI18n(localePreference);
  localizePage();
  populateLocaleOptions(localePreference);
  populateModels(providerEl.value, selectedModelId);
  updateCacheLabel();
  if (refreshGdriveUI) {
    await refreshGdriveUI();
  }
  if (showToastMessage) {
    showToast(t('commonLanguageChanged'));
  }
}

// ---------------------------------------------------------------------------
// API key show/hide toggle
// ---------------------------------------------------------------------------

toggleKeyBtn.addEventListener('click', () => {
  const isPassword = apiKeyEl.type === 'password';
  apiKeyEl.type = isPassword ? 'text' : 'password';
  eyeOpen.hidden = !isPassword;
  eyeClosed.hidden = isPassword;
});

// ---------------------------------------------------------------------------
// Cache toggle label
// ---------------------------------------------------------------------------

cacheEnabledEl.addEventListener('change', updateCacheLabel);

// ---------------------------------------------------------------------------
// Test Connection
// ---------------------------------------------------------------------------

testBtn.addEventListener('click', async () => {
  const provider = providerEl.value;
  const apiKey = apiKeyEl.value.trim();
  const model = getSelectedModelId() || getDefaultModelForProvider(provider);

  if (!apiKey) {
    testResult.className = 'test-result error';
    testResult.innerHTML = `<span class="result-icon">&#x2717;</span> ${t('settingsApiKeyRequired')}`;
    return;
  }

  testBtn.disabled = true;
  testResult.className = 'test-result';
  testResult.textContent = t('settingsTesting');

  try {
    switch (provider) {
      case 'openai': {
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error?.message || `HTTP ${resp.status}`);
        testResult.className = 'test-result success';
        testResult.innerHTML = `<span class="result-icon">&#x2713;</span> ${t('settingsConnectedToOpenAI')}`;
        break;
      }
      case 'anthropic': {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] })
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error?.message || `HTTP ${resp.status}`);
        testResult.className = 'test-result success';
        testResult.innerHTML = `<span class="result-icon">&#x2713;</span> ${t('settingsConnectedToAnthropic')}`;
        break;
      }
      case 'google': {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error?.message || `HTTP ${resp.status}`);
        testResult.className = 'test-result success';
        testResult.innerHTML = `<span class="result-icon">&#x2713;</span> ${t('settingsConnectedToGoogle')}`;
        break;
      }
      case 'groq': {
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error?.message || `HTTP ${resp.status}`);
        testResult.className = 'test-result success';
        testResult.innerHTML = `<span class="result-icon">&#x2713;</span> ${t('settingsConnectedToGroq')}`;
        break;
      }
      case 'openrouter': {
        const resp = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error?.message || `HTTP ${resp.status}`);
        testResult.className = 'test-result success';
        testResult.innerHTML = `<span class="result-icon">&#x2713;</span> ${t('settingsConnectedToOpenRouter')}`;
        break;
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err) {
    testResult.className = 'test-result error';
    testResult.innerHTML = `<span class="result-icon">&#x2717;</span> ${err.message}`;
  } finally {
    testBtn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Save settings
// ---------------------------------------------------------------------------

saveBtn.addEventListener('click', async () => {
  const provider = providerEl.value;
  const model = getSelectedModelId() || getDefaultModelForProvider(provider);
  const apiKey = apiKeyEl.value.trim();
  const defaultRunAt = defaultRunAtEl.value;
  const cacheEnabled = cacheEnabledEl.checked;

  await saveSettings({
    provider,
    model,
    apiKey,
    defaultRunAt,
    cacheEnabled
  });

  showToast(t('settingsSaved'));
});

// ---------------------------------------------------------------------------
// Clear Cache
// ---------------------------------------------------------------------------

clearCacheBtn.addEventListener('click', async () => {
  await clearCache();
  await updateCounts();
  showToast(t('settingsCacheCleared'));
});

// ---------------------------------------------------------------------------
// Clear Logs
// ---------------------------------------------------------------------------

clearLogsBtn.addEventListener('click', async () => {
  await clearLogs();
  await updateCounts();
  showToast(t('settingsLogsCleared'));
});

// ---------------------------------------------------------------------------
// Export All Scripts
// ---------------------------------------------------------------------------

exportBtn.addEventListener('click', async () => {
  const scripts = await getScripts();
  const scriptList = Object.values(scripts);

  if (scriptList.length === 0) {
    showToast(t('settingsNoScriptsToExport'), 'error');
    return;
  }

  const blob = new Blob([JSON.stringify(scriptList, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-monkey-scripts-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(formatCount(scriptList.length, 'settingsExportedScriptsOne', 'settingsExportedScriptsOther'));
});

// ---------------------------------------------------------------------------
// Reset Settings
// ---------------------------------------------------------------------------

resetBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm(
    t('settingsResetConfirmTitle'),
    t('settingsResetConfirmBody')
  );

  if (!confirmed) return;

  await saveSettings({ ...DEFAULT_SETTINGS });
  await loadForm();
  showToast(t('settingsResetSuccess'));
});

// ---------------------------------------------------------------------------
// Google Drive Backup (graceful — skip if gdrive.js not available)
// ---------------------------------------------------------------------------

async function initGdrive() {
  try {
    const gdrive = await import('../lib/gdrive.js');
    // If gdrive module exists, wire up the UI
    const gdriveStatus = document.getElementById('gdrive-status');
    const gdriveLastBackup = document.getElementById('gdrive-last-backup');
    const gdriveConnectBtn = document.getElementById('gdrive-connect-btn');
    const gdriveBackupBtn = document.getElementById('gdrive-backup-btn');
    const gdriveRestoreBtn = document.getElementById('gdrive-restore-btn');
    const gdriveDisconnectBtn = document.getElementById('gdrive-disconnect-btn');

    if (!gdriveConnectBtn) return; // UI elements not present

    async function updateGdriveUI() {
      const signedIn = await gdrive.isSignedIn();
      if (signedIn) {
        gdriveStatus.textContent = t('settingsConnected');
        setButtonLabel(gdriveConnectBtn, 'settingsConnected');
        gdriveConnectBtn.disabled = true;
        gdriveBackupBtn.disabled = false;
        gdriveRestoreBtn.disabled = false;
        gdriveDisconnectBtn.disabled = false;
        const info = await gdrive.getBackupInfo();
        gdriveLastBackup.textContent = info.exists && info.modifiedTime
          ? new Date(info.modifiedTime).toLocaleString()
          : t('settingsNoBackupYet');
      } else {
        gdriveStatus.textContent = t('settingsNotConnected');
        setButtonLabel(gdriveConnectBtn, 'settingsConnectGoogleDrive');
        gdriveConnectBtn.disabled = false;
        gdriveBackupBtn.disabled = true;
        gdriveRestoreBtn.disabled = true;
        gdriveDisconnectBtn.disabled = true;
        gdriveLastBackup.textContent = t('settingsNever');
      }
    }

    refreshGdriveUI = updateGdriveUI;

    gdriveConnectBtn.addEventListener('click', async () => {
      try {
        gdriveConnectBtn.disabled = true;
        setButtonLabel(gdriveConnectBtn, 'settingsConnecting');
        await gdrive.getAuthToken(true);
        showToast(t('settingsConnectSuccess'));
        await updateGdriveUI();
      } catch (err) {
        showToast(t('settingsConnectFailed', [err.message]), 'error');
        gdriveConnectBtn.disabled = false;
        setButtonLabel(gdriveConnectBtn, 'settingsConnectGoogleDrive');
      }
    });

    gdriveBackupBtn.addEventListener('click', async () => {
      gdriveBackupBtn.disabled = true;
      setButtonLabel(gdriveBackupBtn, 'settingsBackingUp');
      try {
        const scripts = await getScripts();
        const result = await gdrive.backupToDrive(scripts);
        showToast(t('settingsBackupComplete'));
        if (result.modifiedTime) gdriveLastBackup.textContent = new Date(result.modifiedTime).toLocaleString();
      } catch (err) {
        showToast(t('settingsBackupFailed', [err.message]), 'error');
      } finally {
        gdriveBackupBtn.disabled = false;
        setButtonLabel(gdriveBackupBtn, 'settingsBackupNow');
      }
    });

    gdriveRestoreBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(t('settingsRestoreConfirmTitle'), t('settingsRestoreConfirmBody'));
      if (!confirmed) return;
      gdriveRestoreBtn.disabled = true;
      setButtonLabel(gdriveRestoreBtn, 'settingsRestoring');
      try {
        const scripts = await gdrive.restoreFromDrive();
        let count = 0;
        for (const script of scripts) { await saveScript(script); count++; }
        showToast(formatCount(count, 'settingsRestoredScriptsOne', 'settingsRestoredScriptsOther'));
      } catch (err) {
        showToast(t('settingsRestoreFailed', [err.message]), 'error');
      } finally {
        gdriveRestoreBtn.disabled = false;
        setButtonLabel(gdriveRestoreBtn, 'settingsRestoreFromBackup');
      }
    });

    gdriveDisconnectBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(t('settingsDisconnectConfirmTitle'), t('settingsDisconnectConfirmBody'));
      if (!confirmed) return;
      try {
        await gdrive.signOut();
        showToast(t('settingsDisconnectSuccess'));
        await updateGdriveUI();
      } catch (err) {
        showToast(t('settingsDisconnectFailed', [err.message]), 'error');
      }
    });

    await updateGdriveUI();
  } catch {
    // gdrive.js not available — hide the section
    const gdriveSection = document.querySelector('.section-card:has(#gdrive-connect-btn)');
    if (gdriveSection) gdriveSection.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  const settings = await getSettings();
  await initI18n(settings.locale);
  localizePage();
  populateLocaleOptions(settings.locale || 'auto');
  await loadForm();
  await initGdrive();
}

init();
