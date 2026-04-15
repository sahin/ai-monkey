/**
 * i18n.js - Shared Chrome extension localization helpers
 */

const SUPPORTED_LOCALES = ['en', 'tr'];
const DEFAULT_LOCALE = 'en';
const messagesCache = new Map();

let activeLocale = null;
let activeLocalePreference = 'auto';
let currentMessages = null;

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const base = String(locale).toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

function resolveLocale(localePreference = 'auto') {
  if (localePreference !== 'auto') {
    return normalizeLocale(localePreference);
  }
  return normalizeLocale(chrome.i18n.getUILanguage());
}

async function loadMessages(locale) {
  const normalized = normalizeLocale(locale);
  if (messagesCache.has(normalized)) {
    return messagesCache.get(normalized);
  }

  const response = await fetch(chrome.runtime.getURL(`_locales/${normalized}/messages.json`));
  if (!response.ok) {
    throw new Error(`Failed to load locale messages for ${normalized}`);
  }

  const messages = await response.json();
  messagesCache.set(normalized, messages);
  return messages;
}

async function getStoredLocalePreference() {
  try {
    const result = await chrome.storage.local.get('settings');
    return result.settings?.locale || 'auto';
  } catch {
    return 'auto';
  }
}

async function initI18n(localePreference) {
  const preferred = localePreference ?? await getStoredLocalePreference();
  const resolved = resolveLocale(preferred);

  activeLocalePreference = preferred;
  activeLocale = resolved;
  currentMessages = await loadMessages(resolved);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatMessage(message, placeholders = {}, substitutions = []) {
  let formatted = message;
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];

  Object.entries(placeholders).forEach(([name, meta]) => {
    const indexMatch = meta?.content?.match(/^\$(\d+)$/);
    if (!indexMatch) return;
    const replacement = values[Number(indexMatch[1]) - 1] ?? '';
    formatted = formatted.replace(new RegExp(`\\$${escapeRegExp(name)}\\$`, 'gi'), replacement);
  });

  values.forEach((value, index) => {
    formatted = formatted.replace(new RegExp(`\\$${index + 1}\\$`, 'g'), value == null ? '' : String(value));
  });

  return formatted;
}

function t(key, substitutions) {
  if (currentMessages?.[key]) {
    return formatMessage(
      currentMessages[key].message,
      currentMessages[key].placeholders,
      substitutions
    );
  }
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function formatCount(count, oneKey, otherKey) {
  return t(count === 1 ? oneKey : otherKey, [String(count)]);
}

function localizePage(root = document) {
  document.documentElement.lang = activeLocale || resolveLocale(activeLocalePreference);

  const titleKey = document.documentElement.dataset.i18nDocumentTitle;
  if (titleKey) {
    document.title = t(titleKey);
  }

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
}

function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

export { t, formatCount, localizePage, initI18n, getSupportedLocales };
