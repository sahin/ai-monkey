/**
 * about.js - AI Monkey features, changelog, and roadmap page
 */

import { getSettings } from '../lib/storage.js';
import { initI18n, localizePage, t } from '../lib/i18n.js';

// ---------------------------------------------------------------------------
// Features data
// ---------------------------------------------------------------------------

const features = {
  core: [
    { nameKey: 'aboutFeatureCore1Name', descKey: 'aboutFeatureCore1Desc', done: true },
    { nameKey: 'aboutFeatureCore2Name', descKey: 'aboutFeatureCore2Desc', done: true },
    { nameKey: 'aboutFeatureCore3Name', descKey: 'aboutFeatureCore3Desc', done: true },
    { nameKey: 'aboutFeatureCore4Name', descKey: 'aboutFeatureCore4Desc', done: true },
    { nameKey: 'aboutFeatureCore5Name', descKey: 'aboutFeatureCore5Desc', done: true },
    { nameKey: 'aboutFeatureCore6Name', descKey: 'aboutFeatureCore6Desc', done: true },
    { nameKey: 'aboutFeatureCore7Name', descKey: 'aboutFeatureCore7Desc', done: true },
    { nameKey: 'aboutFeatureCore8Name', descKey: 'aboutFeatureCore8Desc', done: true },
    { nameKey: 'aboutFeatureCore9Name', descKey: 'aboutFeatureCore9Desc', done: true },
    { nameKey: 'aboutFeatureCore10Name', descKey: 'aboutFeatureCore10Desc', done: true }
  ],
  llm: [
    { nameKey: 'aboutFeatureLlm1Name', descKey: 'aboutFeatureLlm1Desc', done: true },
    { nameKey: 'aboutFeatureLlm2Name', descKey: 'aboutFeatureLlm2Desc', done: true },
    { nameKey: 'aboutFeatureLlm3Name', descKey: 'aboutFeatureLlm3Desc', done: true },
    { nameKey: 'aboutFeatureLlm4Name', descKey: 'aboutFeatureLlm4Desc', done: true },
    { nameKey: 'aboutFeatureLlm5Name', descKey: 'aboutFeatureLlm5Desc', done: true }
  ],
  management: [
    { nameKey: 'aboutFeatureMgmt1Name', descKey: 'aboutFeatureMgmt1Desc', done: true },
    { nameKey: 'aboutFeatureMgmt2Name', descKey: 'aboutFeatureMgmt2Desc', done: true },
    { nameKey: 'aboutFeatureMgmt3Name', descKey: 'aboutFeatureMgmt3Desc', done: true },
    { nameKey: 'aboutFeatureMgmt4Name', descKey: 'aboutFeatureMgmt4Desc', done: true },
    { nameKey: 'aboutFeatureMgmt5Name', descKey: 'aboutFeatureMgmt5Desc', done: true }
  ],
  ui: [
    { nameKey: 'aboutFeatureUi1Name', descKey: 'aboutFeatureUi1Desc', done: true },
    { nameKey: 'aboutFeatureUi2Name', descKey: 'aboutFeatureUi2Desc', done: true },
    { nameKey: 'aboutFeatureUi3Name', descKey: 'aboutFeatureUi3Desc', done: true },
    { nameKey: 'aboutFeatureUi4Name', descKey: 'aboutFeatureUi4Desc', done: true },
    { nameKey: 'aboutFeatureUi5Name', descKey: 'aboutFeatureUi5Desc', done: true }
  ]
};

// ---------------------------------------------------------------------------
// Changelog data
// ---------------------------------------------------------------------------

const changelog = [
  {
    version: 'v0.1.0',
    date: '2026-04-11',
    tag: 'initial',
    tagLabelKey: 'aboutChangelogTagInitial',
    changes: [
      { type: 'added', textKey: 'aboutChangelog1' },
      { type: 'added', textKey: 'aboutChangelog2' },
      { type: 'added', textKey: 'aboutChangelog3' },
      { type: 'added', textKey: 'aboutChangelog4' },
      { type: 'added', textKey: 'aboutChangelog5' },
      { type: 'added', textKey: 'aboutChangelog6' },
      { type: 'added', textKey: 'aboutChangelog7' },
      { type: 'added', textKey: 'aboutChangelog8' },
      { type: 'added', textKey: 'aboutChangelog9' },
      { type: 'added', textKey: 'aboutChangelog10' },
      { type: 'added', textKey: 'aboutChangelog11' },
      { type: 'added', textKey: 'aboutChangelog12' },
      { type: 'added', textKey: 'aboutChangelog13' }
    ]
  }
];

// ---------------------------------------------------------------------------
// Roadmap data
// ---------------------------------------------------------------------------

const roadmap = [
  {
    phaseKey: 'aboutRoadmapNext',
    icon: 'next',
    emoji: '🎯',
    subtitleKey: 'aboutRoadmapNextSubtitle',
    items: [
      { icon: '🌐', textKey: 'aboutRoadmapNext1Text', descKey: 'aboutRoadmapNext1Desc' },
      { icon: '🤖', textKey: 'aboutRoadmapNext2Text', descKey: 'aboutRoadmapNext2Desc' },
      { icon: '🔄', textKey: 'aboutRoadmapNext3Text', descKey: 'aboutRoadmapNext3Desc' },
      { icon: '📦', textKey: 'aboutRoadmapNext4Text', descKey: 'aboutRoadmapNext4Desc' },
      { icon: '🧩', textKey: 'aboutRoadmapNext5Text', descKey: 'aboutRoadmapNext5Desc' },
      { icon: '⏱️', textKey: 'aboutRoadmapNext6Text', descKey: 'aboutRoadmapNext6Desc' }
    ]
  },
  {
    phaseKey: 'aboutRoadmapLater',
    icon: 'later',
    emoji: '🔮',
    subtitleKey: 'aboutRoadmapLaterSubtitle',
    items: [
      { icon: '💬', textKey: 'aboutRoadmapLater1Text', descKey: 'aboutRoadmapLater1Desc' },
      { icon: '📸', textKey: 'aboutRoadmapLater2Text', descKey: 'aboutRoadmapLater2Desc' },
      { icon: '🔗', textKey: 'aboutRoadmapLater3Text', descKey: 'aboutRoadmapLater3Desc' },
      { icon: '📋', textKey: 'aboutRoadmapLater4Text', descKey: 'aboutRoadmapLater4Desc' },
      { icon: '🔒', textKey: 'aboutRoadmapLater5Text', descKey: 'aboutRoadmapLater5Desc' },
      { icon: '🌍', textKey: 'aboutRoadmapLater6Text', descKey: 'aboutRoadmapLater6Desc' }
    ]
  },
  {
    phaseKey: 'aboutRoadmapFuture',
    icon: 'future',
    emoji: '🚀',
    subtitleKey: 'aboutRoadmapFutureSubtitle',
    items: [
      { icon: '🏪', textKey: 'aboutRoadmapFuture1Text', descKey: 'aboutRoadmapFuture1Desc' },
      { icon: '🤝', textKey: 'aboutRoadmapFuture2Text', descKey: 'aboutRoadmapFuture2Desc' },
      { icon: '📱', textKey: 'aboutRoadmapFuture3Text', descKey: 'aboutRoadmapFuture3Desc' },
      { icon: '🧠', textKey: 'aboutRoadmapFuture4Text', descKey: 'aboutRoadmapFuture4Desc' },
      { icon: '⚡', textKey: 'aboutRoadmapFuture5Text', descKey: 'aboutRoadmapFuture5Desc' }
    ]
  }
];

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

function renderFeature(feature) {
  const item = document.createElement('div');
  item.className = 'feature-item';

  const status = document.createElement('div');
  status.className = `feature-status ${feature.done ? 'done' : 'planned'}`;
  status.innerHTML = feature.done
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
    : '?';

  const body = document.createElement('div');
  body.className = 'feature-body';

  const name = document.createElement('div');
  name.className = 'feature-name';
  name.textContent = t(feature.nameKey);

  const desc = document.createElement('div');
  desc.className = 'feature-desc';
  desc.textContent = t(feature.descKey);

  body.appendChild(name);
  body.appendChild(desc);

  item.appendChild(status);
  item.appendChild(body);

  return item;
}

function renderFeatures() {
  const groups = { core: 'features-core', llm: 'features-llm', management: 'features-management', ui: 'features-ui' };

  let total = 0;
  let done = 0;

  for (const [key, containerId] of Object.entries(groups)) {
    const container = document.getElementById(containerId);
    const items = features[key];
    for (const feature of items) {
      container.appendChild(renderFeature(feature));
      total++;
      if (feature.done) done++;
    }
  }

  // Progress summary
  const pct = Math.round((done / total) * 100);
  const summary = document.getElementById('progress-summary');
  summary.innerHTML = `
      <div class="progress-stat">
        <div class="number">${done}/${total}</div>
        <div class="label">${t('aboutFeaturesShipped')}</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-label">
          <span>${t('aboutProgress')}</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

function renderChangelog() {
  const container = document.getElementById('changelog');

  for (const entry of changelog) {
    const formattedDate = new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const el = document.createElement('div');
    el.className = 'changelog-entry';

    el.innerHTML = `
      <div class="changelog-dot"></div>
      <div class="changelog-header">
        <span class="changelog-version">${entry.version}</span>
        <span class="changelog-date">${formattedDate}</span>
        <span class="changelog-tag ${entry.tag}">${t(entry.tagLabelKey)}</span>
      </div>
      <ul class="changelog-changes">
        ${entry.changes.map((c) => `
          <li>
            <span class="change-type ${c.type}">${t('aboutChangeAdded')}</span>
            <span>${t(c.textKey)}</span>
          </li>
        `).join('')}
      </ul>
    `;

    container.appendChild(el);
  }
}

function renderRoadmap() {
  const container = document.getElementById('roadmap');

  for (const phase of roadmap) {
    const el = document.createElement('div');
    el.className = 'roadmap-phase';

    el.innerHTML = `
      <div class="phase-header">
        <div class="phase-icon ${phase.icon}">${phase.emoji}</div>
        <div>
          <div class="phase-title">${t(phase.phaseKey)}</div>
          <div class="phase-subtitle">${t(phase.subtitleKey)}</div>
        </div>
      </div>
      <div class="roadmap-items">
        ${phase.items.map((item) => `
          <div class="roadmap-item">
            <span class="roadmap-item-icon">${item.icon}</span>
            <div>
              <div class="roadmap-item-text">${t(item.textKey)}</div>
              <div class="roadmap-item-desc">${t(item.descKey)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.appendChild(el);
  }
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

document.getElementById('back-link').addEventListener('click', (e) => {
  e.preventDefault();
  // Try chrome extension URL, fall back to relative path
  try {
    const url = chrome.runtime.getURL('dashboard/dashboard.html');
    window.location.href = url;
  } catch {
    window.location.href = '../dashboard/dashboard.html';
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  const settings = await getSettings();
  await initI18n(settings.locale);
  localizePage();
  renderFeatures();
  renderChangelog();
  renderRoadmap();
}

init();
