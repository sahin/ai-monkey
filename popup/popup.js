/**
 * popup.js - AI Monkey popup controller
 *
 * Renders matching scripts for the current tab, handles toggle/run actions,
 * and provides navigation to extension pages.
 */

import { getScripts, getSettings, saveSettings, toggleScript } from '../lib/storage.js';
import { matchesUrl } from '../lib/matcher.js';
import { detectLanguage } from '../lib/language.js';
import { parseScript } from '../lib/parser.js';
import { formatCount, initI18n, localizePage, t } from '../lib/i18n.js';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const scriptsList = document.getElementById('scripts-list');
const emptyState = document.getElementById('empty-state');
const scriptCount = document.getElementById('script-count');
const apiKeyWarning = document.getElementById('api-key-warning');
const settingsLinkWarning = document.getElementById('settings-link-warning');
const toastEl = document.getElementById('toast');
const languageSelect = document.getElementById('language-select');

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

let toastTimer = null;

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.hidden = false;

  // Trigger reflow so the transition plays
  void toastEl.offsetWidth;
  toastEl.classList.add('visible');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('visible');
    setTimeout(() => {
      toastEl.hidden = true;
    }, 200);
  }, 2000);
}

// ---------------------------------------------------------------------------
// Open extension page helper
// ---------------------------------------------------------------------------

function openExtensionPage(path) {
  const url = chrome.runtime.getURL(path);
  chrome.tabs.create({ url });
}

function populateLocaleOptions(selectedLocale) {
  const options = [
    { value: 'auto', label: t('commonLanguageAuto') },
    { value: 'en', label: t('commonLanguageEnglish') },
    { value: 'tr', label: t('commonLanguageTurkish') }
  ];

  languageSelect.innerHTML = '';
  for (const option of options) {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === selectedLocale;
    languageSelect.appendChild(el);
  }
}

function getScriptLanguageBadge(script) {
  const body = script.body || (script.rawText ? parseScript(script.rawText).body : '');
  const result = detectLanguage(body);

  if (result.isEnglish) {
    return { label: 'EN', title: t('popupScriptLanguageEnglish') };
  }

  if (result.isTurkish) {
    return { label: 'TR', title: t('popupScriptLanguageTurkish') };
  }

  if (result.language === 'other' && body.trim().length >= 10) {
    return { label: 'INTL', title: t('popupScriptLanguageOther') };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Render a single script row
// ---------------------------------------------------------------------------

function renderScriptRow(script, tabId) {
  const row = document.createElement('div');
  row.className = 'script-row';

  // Info (name + first match pattern)
  const info = document.createElement('div');
  info.className = 'script-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'script-name-row';

  const name = document.createElement('div');
  name.className = 'script-name';
  name.textContent = script.metadata?.name || script.name || t('commonUntitledScript');

  const langBadge = getScriptLanguageBadge(script);
  if (langBadge) {
    const badge = document.createElement('span');
    badge.className = 'script-lang-badge';
    badge.textContent = langBadge.label;
    badge.title = langBadge.title;
    nameRow.appendChild(badge);
  }

  nameRow.appendChild(name);

  const pattern = document.createElement('div');
  pattern.className = 'script-pattern';
  const sites = script.metadata?.match || [];
  pattern.textContent = sites[0] || t('commonNoSitesSpecified');

  info.appendChild(nameRow);
  info.appendChild(pattern);

  // Toggle
  const toggle = document.createElement('label');
  toggle.className = 'toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = script.enabled;
  checkbox.addEventListener('change', async () => {
    try {
      const newState = await toggleScript(script.id);
      checkbox.checked = newState;
    } catch (err) {
      checkbox.checked = !checkbox.checked;
      showToast(t('popupToggleFailed'), 'error');
    }
  });

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';

  toggle.appendChild(checkbox);
  toggle.appendChild(slider);

  // Run button
  const runBtn = document.createElement('button');
  runBtn.className = 'btn-run';
  runBtn.textContent = t('popupRun');
  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.textContent = t('popupRunning');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RUN_SCRIPT',
        tabId,
        scriptId: script.id
      });

      if (response?.error) {
        showToast(response.error, 'error');
      } else {
        showToast(t('popupRunSuccess'), 'success');
      }
    } catch (err) {
      showToast(t('popupRunFailed'), 'error');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = t('popupRun');
    }
  });

  row.appendChild(info);
  row.appendChild(toggle);
  row.appendChild(runBtn);

  return row;
}

// ---------------------------------------------------------------------------
// Main initialisation
// ---------------------------------------------------------------------------

async function init() {
  const settings = await getSettings();
  await initI18n(settings.locale);
  localizePage();
  populateLocaleOptions(settings.locale || 'auto');

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || '';
  const tabId = tab?.id;

  const scriptsObj = await getScripts();

  const allScripts = Object.values(scriptsObj);

  // Check API key
  if (!settings.apiKey) {
    apiKeyWarning.hidden = false;
  }

  // Show total count
  const totalCount = allScripts.length;
  scriptCount.textContent = formatCount(totalCount, 'popupScriptCountTotalOne', 'popupScriptCountTotalOther');

  // Find matching scripts (include disabled ones in the popup so users can toggle them)
  const matchingScripts = allScripts.filter((script) => {
    const matchPatterns = script.metadata?.match || [];
    const excludePatterns = script.metadata?.exclude || [];
    return matchesUrl(currentUrl, matchPatterns, excludePatterns);
  });

  // Render
  if (matchingScripts.length === 0) {
    scriptsList.innerHTML = '';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    const fragment = document.createDocumentFragment();
    for (const script of matchingScripts) {
      fragment.appendChild(renderScriptRow(script, tabId));
    }
    scriptsList.appendChild(fragment);
  }

  // Footer links
  document.querySelectorAll('.footer-link[data-page]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      // Pass current tab URL when opening the editor for a new script
      if (page === 'editor/editor.html' && currentUrl && !currentUrl.startsWith('chrome')) {
        openExtensionPage(`${page}?url=${encodeURIComponent(currentUrl)}`);
      } else {
        openExtensionPage(page);
      }
    });
  });

  // Warning banner settings link
  settingsLinkWarning.addEventListener('click', (e) => {
    e.preventDefault();
    openExtensionPage('settings/settings.html');
  });

  languageSelect.addEventListener('change', async () => {
    await saveSettings({ locale: languageSelect.value });
    window.location.reload();
  });
}

init();
