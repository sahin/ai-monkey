/**
 * storage.js - chrome.storage.local wrapper for AI Monkey
 *
 * Provides async CRUD operations for scripts, settings, logs, and cache.
 * All functions use chrome.storage.local under the hood.
 */

// Storage keys used as top-level keys in chrome.storage.local
const KEYS = {
  SCRIPTS: 'scripts',
  SETTINGS: 'settings',
  LOGS: 'logs',
  CACHE: 'cache'
};

// Default settings applied when no stored settings exist
const DEFAULT_SETTINGS = {
  locale: 'auto',
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  defaultRunAt: 'document-idle',
  cacheEnabled: true,
  maxLogs: 500
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read a single key from chrome.storage.local.
 * @param {string} key - The storage key to read.
 * @returns {Promise<*>} The stored value, or undefined if not set.
 */
async function _get(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

/**
 * Write a single key/value pair to chrome.storage.local.
 * @param {string} key - The storage key.
 * @param {*} value - The value to store.
 */
async function _set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// ---------------------------------------------------------------------------
// Scripts CRUD
// ---------------------------------------------------------------------------

/**
 * Get all scripts as an object keyed by script id.
 * @returns {Promise<Object>} { id: scriptObj, ... }
 */
async function getScripts() {
  return (await _get(KEYS.SCRIPTS)) || {};
}

/**
 * Get a single script by id.
 * @param {string} id - Script identifier.
 * @returns {Promise<Object|null>} The script object, or null if not found.
 */
async function getScript(id) {
  const scripts = await getScripts();
  return scripts[id] || null;
}

/**
 * Save (create or update) a script.
 * Generates an id via crypto.randomUUID() if one is not present.
 * Automatically sets createdAt (on first save) and updatedAt timestamps.
 * @param {Object} script - The script object to save.
 * @returns {Promise<Object>} The saved script (with id and timestamps).
 */
async function saveScript(script) {
  const scripts = await getScripts();
  const now = Date.now();

  // Generate id if missing
  if (!script.id) {
    script.id = crypto.randomUUID();
  }

  // Preserve original createdAt or set it now
  if (!script.createdAt && scripts[script.id]?.createdAt) {
    script.createdAt = scripts[script.id].createdAt;
  } else if (!script.createdAt) {
    script.createdAt = now;
  }

  script.updatedAt = now;
  scripts[script.id] = script;

  await _set(KEYS.SCRIPTS, scripts);
  return script;
}

/**
 * Delete a script by id.
 * @param {string} id - Script identifier.
 */
async function deleteScript(id) {
  const scripts = await getScripts();
  delete scripts[id];
  await _set(KEYS.SCRIPTS, scripts);
}

/**
 * Toggle a script's enabled state.
 * @param {string} id - Script identifier.
 * @returns {Promise<boolean>} The new enabled state.
 */
async function toggleScript(id) {
  const scripts = await getScripts();
  if (!scripts[id]) {
    throw new Error(`Script not found: ${id}`);
  }
  scripts[id].enabled = !scripts[id].enabled;
  scripts[id].updatedAt = Date.now();
  await _set(KEYS.SCRIPTS, scripts);
  return scripts[id].enabled;
}

/**
 * Get all enabled scripts as an array.
 * @returns {Promise<Object[]>} Array of enabled script objects.
 */
async function getEnabledScripts() {
  const scripts = await getScripts();
  return Object.values(scripts).filter((s) => s.enabled);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Get settings, merged with DEFAULT_SETTINGS so callers always have every key.
 * @returns {Promise<Object>} The merged settings object.
 */
async function getSettings() {
  const stored = (await _get(KEYS.SETTINGS)) || {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Save a settings object (partial updates are fine -- reads are merged).
 * @param {Object} settings - Settings key/value pairs to persist.
 */
async function saveSettings(settings) {
  const current = (await _get(KEYS.SETTINGS)) || {};
  await _set(KEYS.SETTINGS, { ...current, ...settings });
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

/**
 * Add a log entry. The entry is prepended (newest first) and the list is
 * trimmed to maxLogs as defined in the current settings.
 * @param {Object} logEntry - Arbitrary log data (scriptId, message, level, etc.).
 * @returns {Promise<Object>} The log entry with id and timestamp added.
 */
async function addLog(logEntry) {
  const logs = (await _get(KEYS.LOGS)) || [];
  const settings = await getSettings();

  logEntry.id = crypto.randomUUID();
  logEntry.timestamp = Date.now();

  // Prepend and trim
  logs.unshift(logEntry);
  if (logs.length > settings.maxLogs) {
    logs.length = settings.maxLogs;
  }

  await _set(KEYS.LOGS, logs);
  return logEntry;
}

/**
 * Get all log entries (newest first).
 * @returns {Promise<Object[]>} Array of log entries.
 */
async function getLogs() {
  return (await _get(KEYS.LOGS)) || [];
}

/**
 * Clear all log entries.
 */
async function clearLogs() {
  await _set(KEYS.LOGS, []);
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * Get a cached entry by key.
 * @param {string} key - Cache key.
 * @returns {Promise<*>} The cached value, or null if not found.
 */
async function getCacheEntry(key) {
  const cache = (await _get(KEYS.CACHE)) || {};
  return cache[key] || null;
}

/**
 * Store a value in the cache under the given key.
 * @param {string} key - Cache key.
 * @param {*} value - Value to cache.
 */
async function setCacheEntry(key, value) {
  const cache = (await _get(KEYS.CACHE)) || {};
  cache[key] = { value, timestamp: Date.now() };
  await _set(KEYS.CACHE, cache);
}

/**
 * Clear all cached entries.
 */
async function clearCache() {
  await _set(KEYS.CACHE, {});
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  getScripts,
  getScript,
  saveScript,
  deleteScript,
  toggleScript,
  getEnabledScripts,
  getSettings,
  saveSettings,
  addLog,
  getLogs,
  clearLogs,
  getCacheEntry,
  setCacheEntry,
  clearCache,
  DEFAULT_SETTINGS
};
