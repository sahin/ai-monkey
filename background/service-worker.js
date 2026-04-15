// Service Worker - Central Orchestrator for AI Monkey

import { getEnabledScripts, getScript, getSettings, addLog } from '../lib/storage.js';
import { findMatchingScripts } from '../lib/matcher.js';
import { getCachedResponse, setCachedResponse } from '../lib/llm/cache.js';
import { buildSystemPrompt, buildUserMessage } from '../lib/llm/prompt-builder.js';
import { OpenAIProvider } from '../lib/llm/openai.js';
import { AnthropicProvider } from '../lib/llm/anthropic.js';
import { GoogleProvider } from '../lib/llm/google.js';
import { GroqProvider } from '../lib/llm/groq.js';
import { OpenRouterProvider } from '../lib/llm/openrouter.js';

function i18n(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// ---------------------------------------------------------------------------
// Dev auto-reload: connects to dev-reload.js server and reloads on changes
// Only active during development (fails silently in production)
// ---------------------------------------------------------------------------
try {
  const devReload = new EventSource('http://localhost:9234/events');
  devReload.onmessage = (event) => {
    if (event.data === 'reload') {
      console.log('[AI Monkey] Dev reload triggered');
      chrome.runtime.reload();
    }
  };
  devReload.onerror = () => {
    devReload.close();
  };
} catch { /* Dev server not available */ }

// ---------------------------------------------------------------------------
// Tab update listener — run matching scripts
// ---------------------------------------------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const scripts = await getEnabledScripts();
  const matching = findMatchingScripts(tab.url, scripts);

  if (matching.length === 0) return;

  chrome.action.setBadgeText({ text: String(matching.length), tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

  for (const script of matching) {
    try {
      await executeScript(tabId, tab.url, script);
    } catch (err) {
      console.error(`[AI Monkey] Error executing "${script.metadata?.name || script.name}":`, err);
      await addLog({
        scriptId: script.id,
        scriptName: script.metadata?.name || script.name,
        url: tab.url,
        status: 'error',
        error: err.message,
        tokensUsed: null,
        generatedCode: null
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Script execution pipeline
// ---------------------------------------------------------------------------
async function executeScript(tabId, url, script) {
  const settings = await getSettings();
  const scriptName = script.metadata?.name || script.name;

  if (!settings.apiKey) {
    throw new Error(i18n('backgroundNoApiKeyDetailed'));
  }

  let code, tokens;

  // Check cache first
  if (settings.cacheEnabled && script.cache !== 'none') {
    const cached = await getCachedResponse(script.id, script.body, url);
    if (cached) {
      code = cached.code;
      tokens = cached.tokens;
      await injectCode(tabId, code);
      await addLog({
        scriptId: script.id, scriptName, url,
        status: 'success (cached)', tokensUsed: tokens, generatedCode: code, error: null
      });
      return;
    }
  }

  // Extract page context
  const pageContext = await extractPageContext(tabId);

  // Build prompts and call LLM
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(pageContext, script.body);
  const provider = createProvider(settings);
  const result = await provider.generate(systemPrompt, userMessage);
  code = result.code;
  tokens = result.tokens;

  // Cache the result
  if (settings.cacheEnabled && script.cache !== 'none') {
    await setCachedResponse(script.id, script.body, url, code, tokens);
  }

  // Inject and log
  await injectCode(tabId, code);
  await addLog({
    scriptId: script.id, scriptName, url,
    status: 'success', tokensUsed: tokens, generatedCode: code, error: null
  });
}

async function extractPageContext(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/page-context.js'],
    world: 'ISOLATED'
  });

  if (results && results[0] && results[0].result) {
    return results[0].result;
  }
  return { url: '', title: '', elements: i18n('backgroundPageContextFailed') };
}

async function injectCode(tabId, code) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (codeStr) => {
      try {
        eval(codeStr);
      } catch(e) {
        console.error('[AI Monkey] Execution error:', e);
      }
    },
    args: [code],
    world: 'MAIN'
  });
}

function createProvider(settings) {
  switch (settings.provider) {
    case 'anthropic':
      return new AnthropicProvider(settings.apiKey, settings.model);
    case 'google':
      return new GoogleProvider(settings.apiKey, settings.model);
    case 'groq':
      return new GroqProvider(settings.apiKey, settings.model);
    case 'openrouter':
      return new OpenRouterProvider(settings.apiKey, settings.model);
    default:
      return new OpenAIProvider(settings.apiKey, settings.model);
  }
}

// ---------------------------------------------------------------------------
// Message handler (popup, dashboard, editor)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case 'RUN_SCRIPT': {
      const { tabId, scriptId } = message;
      const script = await getScript(scriptId);
      if (!script) throw new Error(i18n('backgroundScriptNotFound'));
      const tab = await chrome.tabs.get(tabId);
      await executeScript(tabId, tab.url, script);
      return { success: true };
    }
    case 'GET_MATCHING_SCRIPTS': {
      const { url } = message;
      const scripts = await getEnabledScripts();
      return findMatchingScripts(url, scripts);
    }
    case 'RUN_ON_PAGE': {
      const { tabId, scriptBody } = message;
      const settings = await getSettings();
      if (!settings.apiKey) throw new Error(i18n('backgroundNoApiKey'));

      const pageContext = await extractPageContext(tabId);
      const systemPrompt = buildSystemPrompt();
      const userMessage = buildUserMessage(pageContext, scriptBody);
      const provider = createProvider(settings);
      const result = await provider.generate(systemPrompt, userMessage);
      await injectCode(tabId, result.code);
      return { success: true, code: result.code, tokens: result.tokens };
    }
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
