/**
 * qa-screenshot.js — Automated QA screenshots for KIS Dashboard
 * Uses a long-lived HA access token to bypass login.
 *
 * Usage:
 *   node qa-screenshot.js [view]
 *   node qa-screenshot.js           # screenshots all views
 *   node qa-screenshot.js home      # screenshot just home
 *
 * Requires: npx playwright (uses playwright CLI internally)
 * Reads: .env (HA_TOKEN, HA_URL)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^(\w+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  });
}
const HA_TOKEN = env.HA_TOKEN || process.env.HA_TOKEN;
const HA_URL = env.HA_URL || process.env.HA_URL || 'http://192.168.51.179:8123';
if (!HA_TOKEN) { console.error('Missing HA_TOKEN in .env'); process.exit(1); }

const DASHBOARD = '/dashboard-mobilev1';
const VIEWS = ['home', 'climate', 'lights', 'cameras', 'media', 'settings'];
const OUT_DIR = path.join(__dirname, 'qa-screenshots');

const DEVICES = [
  { name: 'iphone',  width: 393, height: 852, scale: 3 },
  { name: 'tabs9',   width: 1280, height: 800, scale: 2 },
];

(async () => {
  const requestedView = process.argv[2];
  const views = requestedView ? [requestedView] : VIEWS;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      userAgent: device.name === 'iphone'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
        : undefined,
    });

    const page = await context.newPage();

    // Inject HA auth token into localStorage before navigating
    // Navigate to a blank page on the same origin first to set localStorage
    await page.goto(HA_URL + '/auth/authorize', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    try {
      await page.evaluate((token) => {
        const hassTokens = {
          access_token: token,
          token_type: 'Bearer',
          expires_in: 1800,
          hassUrl: window.location.origin,
          clientId: window.location.origin + '/',
          expires: Date.now() + 1800000,
          refresh_token: '',
        };
        localStorage.setItem('hassTokens', JSON.stringify(hassTokens));
      }, HA_TOKEN);
    } catch (e) {
      console.log(`  [warn] localStorage inject failed, retrying...`);
      await page.waitForTimeout(2000);
      await page.evaluate((token) => {
        localStorage.setItem('hassTokens', JSON.stringify({
          access_token: token, token_type: 'Bearer', expires_in: 1800,
          hassUrl: window.location.origin, clientId: window.location.origin + '/',
          expires: Date.now() + 1800000, refresh_token: '',
        }));
      }, HA_TOKEN);
    }

    for (const view of views) {
      const url = `${HA_URL}${DASHBOARD}/${view}`;
      console.log(`[${device.name}] ${view} → navigating...`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        // networkidle can timeout if HA keeps websocket open — fallback to load
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }
      // Wait for kis-nav.js to inject header + render content
      await page.waitForTimeout(6000);

      const filename = `v3-${device.name}-${view}.png`;
      await page.screenshot({
        path: path.join(OUT_DIR, filename),
        fullPage: false,
      });
      console.log(`  ✓ ${filename}`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nDone — ${views.length * DEVICES.length} screenshots in ${OUT_DIR}`);
})();
