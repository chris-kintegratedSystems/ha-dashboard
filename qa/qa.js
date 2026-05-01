#!/usr/bin/env node
/**
 * KIS Dashboard QA Tool
 * Captures screenshots of the live HA dashboard and the design mockup
 * at multiple viewports, then generates a side-by-side HTML diff report.
 *
 * Usage:
 *   HA_TOKEN=<token> node qa.js mobile|tablet|ipad11|all
 *
 * Output:
 *   report/<viewport>/index.html
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HA_URL = 'http://192.168.51.179:8123';
const HA_TOKEN = process.env.HA_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2NDMxNWRkMjgyZDE0N2Y3YTFhZWY5MDg4Yjc4YWUwYyIsImlhdCI6MTc3NTk1ODc1NiwiZXhwIjoyMDkxMzE4NzU2fQ.SKDxCahBFqTuMDHw6jIopd8Xv8GFapFR8mRCZWwQyQI';

const MOCKUP_DIR = path.join(__dirname, '..', 'projects', 'ha-dashboard');
const REPORT_DIR = path.join(__dirname, 'report');

const VIEWPORTS = {
  mobile: {
    label: 'iPhone 14 Pro (393×852)',
    width: 393,
    height: 852,
    dashboard: 'dashboard-mobilev1/home',
    mockup: 'mockup-iphone.html',
    sections: ['Status Bar', 'Scenes', 'Locks', 'Garage', 'System Status', 'Now Playing'],
  },
  tablet: {
    label: 'Galaxy Tab S9+ (1052×1680)',
    width: 1052,
    height: 1680,
    dashboard: 'dashboard-tabletv1/home',
    mockup: 'mockup-tablet.html',
    sections: ['Status Bar', 'Scenes', 'Security (Locks + Garage)', 'Now Playing'],
  },
  ipad11: {
    label: 'iPad Pro 11" (834×1194)',
    width: 834,
    height: 1194,
    dashboard: 'dashboard-mobilev1/home',
    mockup: 'mockup-iphone.html',
    sections: ['Status Bar', 'Scenes', 'Locks', 'Garage', 'System Status', 'Now Playing'],
  },
};

function hassStorageState() {
  const hassTokens = {
    access_token: HA_TOKEN,
    token_type: 'Bearer',
    expires_in: 1800,
    refresh_token: 'long-lived-no-refresh-needed',
    expires_on: Math.floor(Date.now() / 1000) + 31536000,
    hassUrl: HA_URL,
    clientId: HA_URL + '/',
  };
  return {
    cookies: [],
    origins: [{
      origin: HA_URL,
      localStorage: [{ name: 'hassTokens', value: JSON.stringify(hassTokens) }],
    }],
  };
}

async function screenshotMockup(browser, vpKey, vp, outDir) {
  const mockupPath = path.join(MOCKUP_DIR, vp.mockup);
  if (!fs.existsSync(mockupPath)) {
    console.warn(`  [warn] Mockup not found: ${mockupPath}`);
    return null;
  }
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const fileUrl = 'file:///' + mockupPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);
  const outPath = path.join(outDir, 'mockup.png');
  await page.screenshot({ path: outPath, fullPage: true });
  await context.close();
  console.log(`  mockup → ${outPath}`);
  return outPath;
}

async function screenshotLive(browser, vpKey, vp, outDir) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    storageState: hassStorageState(),
  });
  const page = await context.newPage();
  const url = `${HA_URL}/${vp.dashboard}`;
  console.log(`  live  → ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Inject --sait to simulate iPhone 17 Pro Max Dynamic Island (59px)
    // WKWebView does not expose env(safe-area-inset-top) to Playwright
    await page.addStyleTag({ content: ':root { --sait: 59px !important; }' });
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/authorize') || currentUrl.includes('login')) {
      console.error(`  [error] Auth redirect detected. Check HA_TOKEN.`);
      await context.close();
      return null;
    }
    const outPath = path.join(outDir, 'live.png');
    await page.screenshot({ path: outPath, fullPage: true });
    await context.close();
    console.log(`  live  → ${outPath}`);
    return outPath;
  } catch (err) {
    console.error(`  [error] Live screenshot failed: ${err.message}`);
    await context.close();
    return null;
  }
}

function toBase64(imgPath) {
  if (!imgPath || !fs.existsSync(imgPath)) return null;
  return 'data:image/png;base64,' + fs.readFileSync(imgPath).toString('base64');
}

function buildReport(vpKey, vp, mockupImg, liveImg) {
  const mockupB64 = toBase64(mockupImg);
  const liveB64 = toBase64(liveImg);
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const sectionRows = vp.sections.map(s => `
    <tr data-section="${s}">
      <td class="section-name">${s}</td>
      <td class="status-cell">
        <button class="status-btn" data-val="✅" onclick="setStatus(this)">✅ Matches</button>
        <button class="status-btn" data-val="⚠️" onclick="setStatus(this)">⚠️ Partial</button>
        <button class="status-btn" data-val="❌" onclick="setStatus(this)">❌ Wrong</button>
      </td>
      <td><input class="notes-input" type="text" placeholder="Notes..." /></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KIS Dashboard QA — ${vp.label}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f111a; color: #e2e8f0; }
  header { padding: 16px 24px; background: #161b2e; border-bottom: 1px solid #1e2a45; display: flex; justify-content: space-between; align-items: center; }
  header h1 { font-size: 18px; font-weight: 600; color: #00d4f0; }
  header span { font-size: 12px; color: #64748b; }
  .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: #1e2a45; }
  .panel { background: #0f111a; }
  .panel-label { padding: 10px 16px; font-size: 13px; font-weight: 600; color: #94a3b8; border-bottom: 1px solid #1e2a45; }
  .panel-label.mockup { color: #a78bfa; }
  .panel-label.live   { color: #34d399; }
  .panel img { width: 100%; display: block; }
  .panel .no-img { padding: 40px; text-align: center; color: #475569; font-size: 14px; }
  .gap-section { padding: 24px; }
  .gap-section h2 { font-size: 15px; font-weight: 600; color: #e2e8f0; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 8px 12px; background: #161b2e; color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e2a45; vertical-align: middle; }
  .section-name { font-weight: 500; color: #cbd5e1; width: 200px; }
  .status-cell { width: 280px; }
  .status-btn { margin-right: 6px; padding: 4px 10px; border-radius: 12px; border: 1px solid #334155; background: #1e2a45; color: #94a3b8; cursor: pointer; font-size: 12px; transition: all 0.15s; }
  .status-btn.active-pass { background: rgba(52,211,153,0.15); border-color: #34d399; color: #34d399; }
  .status-btn.active-warn { background: rgba(251,191,36,0.15); border-color: #fbbf24; color: #fbbf24; }
  .status-btn.active-fail { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #ef4444; }
  .notes-input { width: 100%; background: #161b2e; border: 1px solid #1e2a45; border-radius: 6px; padding: 6px 10px; color: #e2e8f0; font-size: 13px; }
  .notes-input:focus { outline: none; border-color: #00d4f0; }
  .export-bar { padding: 0 24px 24px; }
  .export-btn { padding: 10px 20px; background: #00d4f0; color: #0f111a; font-weight: 700; font-size: 14px; border: none; border-radius: 8px; cursor: pointer; }
  .export-btn:hover { background: #00b8d4; }
  .copied-msg { display: none; margin-left: 12px; color: #34d399; font-size: 13px; }
  .sync-bar { background: #161b2e; border-bottom: 1px solid #1e2a45; padding: 8px 16px; display: flex; gap: 12px; align-items: center; }
  .sync-label { font-size: 12px; color: #64748b; }
  input[type=range] { width: 200px; accent-color: #00d4f0; }
</style>
</head>
<body>
<header>
  <h1>KIS Dashboard QA — ${vp.label}</h1>
  <span>Generated ${now} CT</span>
</header>

<div class="sync-bar">
  <span class="sync-label">Scroll sync:</span>
  <input type="range" id="syncSlider" min="0" max="100" value="0" oninput="syncScroll(this.value)">
  <span class="sync-label" id="syncPct">0%</span>
  <span class="sync-label" style="margin-left:16px;">Mockup is purple · Live is green</span>
</div>

<div class="compare" id="compare">
  <div class="panel">
    <div class="panel-label mockup">Mockup — ${vp.mockup}</div>
    ${mockupB64
      ? `<img src="${mockupB64}" alt="Mockup">`
      : '<div class="no-img">Mockup screenshot not available</div>'}
  </div>
  <div class="panel">
    <div class="panel-label live">Live — ${HA_URL}/${vp.dashboard}</div>
    ${liveB64
      ? `<img src="${liveB64}" alt="Live dashboard">`
      : '<div class="no-img">Live screenshot not available — check HA_TOKEN and HA connectivity</div>'}
  </div>
</div>

<div class="gap-section">
  <h2>Gap Table — mark each section</h2>
  <table id="gapTable">
    <thead>
      <tr>
        <th>Section</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${sectionRows}</tbody>
  </table>
</div>

<div class="export-bar">
  <button class="export-btn" onclick="exportGapTable()">Export Gap Table</button>
  <span class="copied-msg" id="copiedMsg">Copied to clipboard!</span>
</div>

<script>
function setStatus(btn) {
  const row = btn.closest('tr');
  row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active-pass','active-warn','active-fail'));
  const val = btn.dataset.val;
  if (val === '✅') btn.classList.add('active-pass');
  else if (val === '⚠️') btn.classList.add('active-warn');
  else if (val === '❌') btn.classList.add('active-fail');
}

function exportGapTable() {
  const rows = document.querySelectorAll('#gapTable tbody tr');
  const lines = ['| Section | Status | Notes |', '|---------|--------|-------|'];
  rows.forEach(row => {
    const section = row.querySelector('.section-name').textContent.trim();
    const active = row.querySelector('.status-btn.active-pass, .status-btn.active-warn, .status-btn.active-fail');
    const status = active ? active.dataset.val : '—';
    const notes = row.querySelector('.notes-input').value.trim() || '';
    lines.push('| ' + section + ' | ' + status + ' | ' + notes + ' |');
  });
  const text = lines.join('\\n');
  navigator.clipboard.writeText(text).then(() => {
    const msg = document.getElementById('copiedMsg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });
}

function syncScroll(pct) {
  document.getElementById('syncPct').textContent = pct + '%';
  const panels = document.querySelectorAll('.panel img');
  panels.forEach(img => {
    const maxScroll = img.offsetHeight - window.innerHeight;
    if (maxScroll > 0) window.scrollTo(0, (maxScroll * pct) / 100);
  });
  const compare = document.getElementById('compare');
  const maxScroll = compare.scrollHeight - compare.clientHeight;
  compare.scrollTop = (maxScroll * pct) / 100;
}
</script>
</body>
</html>`;
}

async function runViewport(browser, vpKey) {
  const vp = VIEWPORTS[vpKey];
  console.log(`\n=== ${vpKey.toUpperCase()} — ${vp.label} ===`);
  const outDir = path.join(REPORT_DIR, vpKey);
  fs.mkdirSync(outDir, { recursive: true });

  const [mockupImg, liveImg] = await Promise.all([
    screenshotMockup(browser, vpKey, vp, outDir),
    screenshotLive(browser, vpKey, vp, outDir),
  ]);

  const reportHtml = buildReport(vpKey, vp, mockupImg, liveImg);
  const reportPath = path.join(outDir, 'index.html');
  fs.writeFileSync(reportPath, reportHtml, 'utf8');
  console.log(`  report → ${reportPath}`);
  return reportPath;
}

(async () => {
  const target = process.argv[2] || 'mobile';
  const keys = target === 'all' ? Object.keys(VIEWPORTS) : [target];

  for (const k of keys) {
    if (!VIEWPORTS[k]) {
      console.error(`Unknown viewport: ${k}. Use: mobile | tablet | ipad11 | all`);
      process.exit(1);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const reports = [];

  for (const k of keys) {
    const r = await runViewport(browser, k);
    reports.push(r);
  }

  await browser.close();
  console.log('\nDone.');
  reports.forEach(r => console.log(' ', r));
})().catch(err => {
  console.error('QA failed:', err.message);
  process.exit(1);
});
