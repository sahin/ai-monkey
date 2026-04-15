/**
 * language.js - Language detection for AI Monkey
 *
 * Lightweight heuristic-based language detection to determine if script
 * instructions are written in English or another language.
 * Uses Unicode script ranges and common word patterns.
 */

// Common English stop words (high frequency)
const ENGLISH_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'no', 'just', 'him', 'know', 'take',
  'click', 'hide', 'show', 'remove', 'change', 'add', 'button', 'page',
  'element', 'text', 'color', 'background', 'style', 'class', 'div',
]);

// Common Turkish words / particles to distinguish Turkish from generic Latin text
const TURKISH_WORDS = new Set([
  've', 'bir', 'bu', 'için', 'ile', 'de', 'da', 'gibi', 'çok', 'daha',
  'olan', 'olarak', 'sonra', 'önce', 'sayfa', 'düğme', 'metin', 'arka',
  'plan', 'renk', 'gizle', 'göster', 'değiştir', 'ekle', 'kaldır', 'tıkla',
  'kenar', 'çerez', 'kabul', 'makale', 'özetle', 'başlık', 'öğe'
]);

// Unicode ranges for non-Latin scripts
const NON_LATIN_RANGES = [
  [0x0400, 0x04FF],  // Cyrillic
  [0x0500, 0x052F],  // Cyrillic Supplement
  [0x0600, 0x06FF],  // Arabic
  [0x0750, 0x077F],  // Arabic Supplement
  [0x0900, 0x097F],  // Devanagari
  [0x0980, 0x09FF],  // Bengali
  [0x0A80, 0x0AFF],  // Gujarati
  [0x3040, 0x309F],  // Hiragana
  [0x30A0, 0x30FF],  // Katakana
  [0x4E00, 0x9FFF],  // CJK Unified Ideographs
  [0xAC00, 0xD7AF],  // Hangul Syllables
  [0x0E00, 0x0E7F],  // Thai
  [0x0E80, 0x0EFF],  // Lao
  [0x1000, 0x109F],  // Myanmar
  [0x0590, 0x05FF],  // Hebrew
];

/**
 * Detect if text contains significant non-Latin script characters.
 * @param {string} text - The text to check.
 * @returns {boolean} True if >20% of alpha characters are non-Latin.
 */
function hasNonLatinChars(text) {
  let nonLatin = 0;
  let total = 0;

  for (const char of text) {
    const code = char.codePointAt(0);
    // Skip whitespace, numbers, punctuation
    if (code <= 0x7F && !/[a-zA-Z]/.test(char)) continue;

    total++;
    for (const [start, end] of NON_LATIN_RANGES) {
      if (code >= start && code <= end) {
        nonLatin++;
        break;
      }
    }
  }

  if (total === 0) return false;
  return nonLatin / total > 0.2;
}

/**
 * Check if text is likely English using word frequency heuristic.
 * @param {string} text - The text to check.
 * @returns {number} Score from 0 to 1 (1 = very likely English).
 */
function englishScore(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1; // Empty or all non-alpha — assume English

  let englishCount = 0;
  for (const word of words) {
    if (ENGLISH_WORDS.has(word)) englishCount++;
  }

  return englishCount / words.length;
}

/**
 * Check if text is likely Turkish using simple word + character heuristics.
 * @param {string} text - The text to check.
 * @returns {number} Score from 0 to 1 (1 = very likely Turkish).
 */
function turkishScore(text) {
  const lower = text.toLowerCase();
  const words = lower
    .replace(/[^a-zçğıöşü\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 0;

  let turkishCount = 0;
  for (const word of words) {
    if (TURKISH_WORDS.has(word)) turkishCount++;
  }

  // Turkish-specific letters are a strong signal for the language.
  const charBoost = /[çğıöşü]/.test(lower) ? 0.2 : 0;
  return Math.min(1, turkishCount / words.length + charBoost);
}

/**
 * Detect whether the given text is likely English or another language.
 * @param {string} text - Script instructions text.
 * @returns {{ isEnglish: boolean, isTurkish: boolean, language: string, confidence: number }}
 */
function detectLanguage(text) {
  if (!text || text.trim().length < 5) {
    return { isEnglish: true, isTurkish: false, language: 'en', confidence: 1 };
  }

  // Check for non-Latin scripts (CJK, Arabic, Cyrillic, etc.)
  if (hasNonLatinChars(text)) {
    return { isEnglish: false, isTurkish: false, language: 'other', confidence: 0.9 };
  }

  // Check English word frequency for Latin-script languages
  const enScore = englishScore(text);
  const trScore = turkishScore(text);

  if (enScore >= trScore && enScore > 0.15) {
    return { isEnglish: true, isTurkish: false, language: 'en', confidence: enScore };
  }

  if (trScore > 0.15) {
    return { isEnglish: false, isTurkish: true, language: 'tr', confidence: trScore };
  }

  return {
    isEnglish: false,
    isTurkish: false,
    language: 'other',
    confidence: 1 - Math.max(enScore, trScore)
  };
}

export { detectLanguage, hasNonLatinChars, englishScore, turkishScore };
