/**
 * dashboard.js - AI Monkey script management dashboard
 *
 * Loads, renders, searches, and manages all user scripts.
 */

import { getScripts, getSettings, saveScript, deleteScript, toggleScript } from '../lib/storage.js';
import { encodeShareUrl } from '../lib/share.js';
import { formatCount, initI18n, localizePage, t } from '../lib/i18n.js';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const scriptsGrid = document.getElementById('scripts-grid');
const emptyState = document.getElementById('empty-state');
const noResults = document.getElementById('no-results');
const scriptCountEl = document.getElementById('script-count');
const searchInput = document.getElementById('search-input');
const newScriptBtn = document.getElementById('new-script-btn');
const emptyCreateBtn = document.getElementById('empty-create-btn');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const deleteModal = document.getElementById('delete-modal');
const deleteBodyPrefix = document.getElementById('delete-body-prefix');
const deleteScriptName = document.getElementById('delete-script-name');
const deleteBodySuffix = document.getElementById('delete-body-suffix');
const deleteCancelBtn = document.getElementById('delete-cancel');
const deleteConfirmBtn = document.getElementById('delete-confirm');
const toastEl = document.getElementById('toast');

// State
let allScripts = {};
let pendingDeleteId = null;

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
// Navigation helpers
// ---------------------------------------------------------------------------

function openExtensionPage(path) {
  const url = chrome.runtime.getURL(path);
  chrome.tabs.create({ url });
}

async function openEditor(id) {
  if (id) {
    openExtensionPage(`editor/editor.html?id=${id}`);
    return;
  }
  // For new scripts, pass the current active tab's URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const url = tab?.url;
    if (url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')) {
      openExtensionPage(`editor/editor.html?url=${encodeURIComponent(url)}`);
    } else {
      openExtensionPage('editor/editor.html');
    }
  } catch {
    openExtensionPage('editor/editor.html');
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function getScriptName(script) {
  return script.metadata?.name || script.name || t('commonUntitledScript');
}

function getScriptDescription(script) {
  return script.metadata?.description || script.description || '';
}

function getMatchSites(script) {
  return script.metadata?.match || [];
}

function getLastRunStatus(script) {
  // Possible values: 'success', 'error', 'idle'
  return script.lastRunStatus || 'idle';
}

function renderScriptCard(script) {
  const card = document.createElement('div');
  card.className = 'script-card';
  card.dataset.id = script.id;

  const name = getScriptName(script);
  const description = getScriptDescription(script);
  const sites = getMatchSites(script);
  const status = getLastRunStatus(script);

  // Header row: title + toggle
  const header = document.createElement('div');
  header.className = 'card-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = name;

  const toggle = document.createElement('label');
  toggle.className = 'toggle';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = script.enabled !== false;
  checkbox.addEventListener('change', async () => {
    try {
      const newState = await toggleScript(script.id);
      checkbox.checked = newState;
      script.enabled = newState;
    } catch {
      checkbox.checked = !checkbox.checked;
      showToast(t('dashboardToggleFailed'), 'error');
    }
  });
  const slider = document.createElement('span');
  slider.className = 'toggle-slider';
  toggle.appendChild(checkbox);
  toggle.appendChild(slider);

  header.appendChild(titleEl);
  header.appendChild(toggle);
  card.appendChild(header);

  // Description
  if (description) {
    const descEl = document.createElement('div');
    descEl.className = 'card-description';
    descEl.textContent = description;
    card.appendChild(descEl);
  }

  // Match pattern chips
  if (sites.length > 0) {
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'card-patterns';
    for (const s of sites) {
      if (!s) continue;
      const chip = document.createElement('span');
      chip.className = 'pattern-chip';
      chip.textContent = s;
      chip.title = s;
      chipsContainer.appendChild(chip);
    }
    card.appendChild(chipsContainer);
  }

  // Footer: status + actions
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const statusEl = document.createElement('div');
  statusEl.className = 'card-status';
  const dot = document.createElement('span');
  dot.className = `status-dot ${status}`;
  const statusText = document.createElement('span');
  statusText.textContent = status === 'success'
    ? t('dashboardStatusSuccess')
    : status === 'error'
      ? t('dashboardStatusError')
      : t('dashboardStatusIdle');
  statusEl.appendChild(dot);
  statusEl.appendChild(statusText);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Share button
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn-icon';
  shareBtn.title = t('dashboardCopyShareLink');
  shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  shareBtn.addEventListener('click', async () => {
    try {
      const encoded = encodeShareUrl(script);
      const shareUrl = chrome.runtime.getURL(`editor/editor.html?install=${encoded}`);
      await navigator.clipboard.writeText(shareUrl);
      showToast(t('dashboardShareCopied'));
    } catch {
      showToast(t('dashboardShareCopyFailed'), 'error');
    }
  });

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.title = t('dashboardEditScript');
  editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  editBtn.addEventListener('click', () => openEditor(script.id));

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon danger';
  delBtn.title = t('dashboardDeleteScript');
  delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
  delBtn.addEventListener('click', () => showDeleteModal(script.id, name));

  actions.appendChild(shareBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  footer.appendChild(statusEl);
  footer.appendChild(actions);
  card.appendChild(footer);

  return card;
}

function renderScripts(filter = '') {
  scriptsGrid.innerHTML = '';
  const scripts = Object.values(allScripts);
  const query = filter.toLowerCase().trim();

  const filtered = query
    ? scripts.filter((s) => {
        const name = getScriptName(s).toLowerCase();
        const desc = getScriptDescription(s).toLowerCase();
        const patterns = getMatchSites(s).join(' ').toLowerCase();
        return name.includes(query) || desc.includes(query) || patterns.includes(query);
      })
    : scripts;

  // Update count
  scriptCountEl.textContent = formatCount(scripts.length, 'commonScriptCountOne', 'commonScriptCountOther');

  if (scripts.length === 0) {
    emptyState.hidden = false;
    noResults.hidden = true;
    scriptsGrid.style.display = 'none';
    return;
  }

  emptyState.hidden = true;

  if (filtered.length === 0) {
    noResults.hidden = false;
    scriptsGrid.style.display = 'none';
    return;
  }

  noResults.hidden = true;
  scriptsGrid.style.display = '';

  // Sort by updatedAt descending
  filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const fragment = document.createDocumentFragment();
  for (const script of filtered) {
    fragment.appendChild(renderScriptCard(script));
  }
  scriptsGrid.appendChild(fragment);
}

// ---------------------------------------------------------------------------
// Delete modal
// ---------------------------------------------------------------------------

function showDeleteModal(id, name) {
  pendingDeleteId = id;
  deleteBodyPrefix.textContent = t('dashboardDeleteBodyPrefix');
  deleteScriptName.textContent = name;
  deleteBodySuffix.textContent = t('dashboardDeleteBodySuffix');
  deleteModal.hidden = false;
}

function hideDeleteModal() {
  pendingDeleteId = null;
  deleteModal.hidden = true;
}

deleteCancelBtn.addEventListener('click', hideDeleteModal);

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) hideDeleteModal();
});

deleteConfirmBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await deleteScript(pendingDeleteId);
    delete allScripts[pendingDeleteId];
    hideDeleteModal();
    renderScripts(searchInput.value);
    showToast(t('dashboardDeleted'));
  } catch {
    showToast(t('dashboardDeleteFailed'), 'error');
    hideDeleteModal();
  }
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

searchInput.addEventListener('input', () => {
  renderScripts(searchInput.value);
});

// ---------------------------------------------------------------------------
// New Script
// ---------------------------------------------------------------------------

newScriptBtn.addEventListener('click', () => openEditor());
emptyCreateBtn.addEventListener('click', () => openEditor());

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

exportBtn.addEventListener('click', () => {
  const scripts = Object.values(allScripts);
  if (scripts.length === 0) {
    showToast(t('dashboardNoScriptsToExport'), 'error');
    return;
  }

  const data = JSON.stringify(scripts, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-monkey-scripts-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(formatCount(scripts.length, 'dashboardExportedScriptsOne', 'dashboardExportedScriptsOther'));
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const scripts = JSON.parse(text);

    if (!Array.isArray(scripts)) {
      throw new Error(t('dashboardImportInvalidFormat'));
    }

    let count = 0;
    for (const script of scripts) {
      // Strip id so each gets a fresh one (or keep if re-importing own export)
      const saved = await saveScript(script);
      allScripts[saved.id] = saved;
      count++;
    }

    renderScripts(searchInput.value);
    showToast(formatCount(count, 'dashboardImportedScriptsOne', 'dashboardImportedScriptsOther'));
  } catch (err) {
    showToast(t('dashboardImportFailed', [err.message]), 'error');
  }

  // Reset file input so re-importing the same file triggers change
  importFile.value = '';
});

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------

document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    if (page === 'dashboard') return; // already here
    openExtensionPage(page);
  });
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  try {
    const settings = await getSettings();
    await initI18n(settings.locale);
    localizePage();

    allScripts = await getScripts();
    renderScripts();
  } catch (err) {
    showToast(t('dashboardLoadFailed'), 'error');
  }
}

init();
