/**
 * qa-screenshot.js — Authenticated QA screenshots for KIS Dashboard
 *
 * Uses a long-lived HA access token + localStorage injection so the HA
 * frontend boots fully authenticated. This is required to load custom
 * resources declared in configuration.yaml's frontend.extra_module_url
 * (kis-nav.js), HA themes, and entity state.
 *
 * Fails the run if kis-nav.js did not inject its #kis-header-bar or
 * #kis-nav-bar into document.body — those are the canonical signals
 * that the dashboard is rendering exactly like the real device.
 *
 * Usage:
 *   node qa-screenshot.js [view]
 *   node qa-screenshot.js              # all views, all devices
 *   node qa-screenshot.js home         # just the home view
 *
 * .env (gitignored):
 *   HA_QA_TOKEN=<long-lived access token>   # preferred
 *   HA_TOKEN=<fallback, older var name>
 *   HA_URL=http://192.168.51.179:8123
 *   FKB_IP=192.168.51.150                   # optional: Fully Kiosk tablet
 *   FKB_PASSWORD=<remote admin password>    # optional: FKB REST API auth
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
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
const HA_TOKEN = env.HA_QA_TOKEN || process.env.HA_QA_TOKEN || env.HA_TOKEN || process.env.HA_TOKEN;
const HA_URL = env.HA_URL || process.env.HA_URL || 'http://192.168.51.179:8123';
if (!HA_TOKEN) {
  console.error('ERROR: Missing HA_QA_TOKEN in .env — create a long-lived access token in HA (Profile → Security → Long-lived access tokens).');
  process.exit(1);
}
const FKB_IP = env.FKB_IP || process.env.FKB_IP;
const FKB_PASSWORD = env.FKB_PASSWORD || process.env.FKB_PASSWORD;

const DASHBOARD = '/dashboard-mobilev1';
const VIEWS = ['home', 'climate', 'lights', 'cameras', 'media', 'settings'];
const OUT_DIR = path.join(__dirname, 'qa-screenshots');

// Three device profiles — match real hardware used by Chris's household.
const DEVICES = [
  { name: 'tabs9-landscape',    width: 2800, height: 1752, scale: 2, ua: null },
  { name: 'iphone-portrait',    width: 430,  height: 932,  scale: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
  { name: 'iphone-landscape',   width: 932,  height: 430,  scale: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
];

// kis-nav.js injects these IDs into document.body — checking for them is how
// we know the authenticated session loaded the frontend.extra_module_url JS.
const REQUIRED_SELECTORS = ['#kis-header-bar', '#kis-nav-bar'];

async function setHassTokens(page, token) {
  await page.evaluate((t) => {
    const hassTokens = {
      access_token: t,
      token_type: 'Bearer',
      expires_in: 1800,
      hassUrl: window.location.origin,
      clientId: window.location.origin + '/',
      expires: Date.now() + 1800000,
      refresh_token: '',
    };
    localStorage.setItem('hassTokens', JSON.stringify(hassTokens));
  }, token);
}

function captureFullyKiosk(ip, password, outPath) {
  return new Promise((resolve, reject) => {
    const url = `http://${ip}:2323/?cmd=screenShot&password=${encodeURIComponent(password)}`;
    const req = http.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Fully Kiosk returned HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(outPath)));
      file.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(new Error('Fully Kiosk request timed out')); });
    req.on('error', reject);
  });
}

async function waitForKisNav(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const present = await page.evaluate((sels) =>
      sels.every(sel => !!document.querySelector(sel)), REQUIRED_SELECTORS);
    if (present) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

(async () => {
  const requestedView = process.argv[2];
  const views = requestedView ? [requestedView] : VIEWS;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];

  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      userAgent: device.ua || undefined,
      // Bearer header covers REST fetches for /api/* and /local/* — HA
      // frontend still uses WebSocket auth, so localStorage token below
      // is what authenticates the long-running session.
      extraHTTPHeaders: { Authorization: `Bearer ${HA_TOKEN}` },
    });

    const page = await context.newPage();

    // Prime localStorage on the HA origin before any dashboard load.
    await page.goto(HA_URL + '/auth/authorize', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    await setHassTokens(page, HA_TOKEN);

    for (const view of views) {
      const url = `${HA_URL}${DASHBOARD}/${view}`;
      console.log(`[${device.name}] ${view} → navigating...`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      // Re-assert localStorage token in case the redirect wiped it.
      await setHassTokens(page, HA_TOKEN);

      // Wait for kis-nav.js to inject its fixed UI. If this times out,
      // the frontend.extra_module_url loader is broken — fail the run.
      const ok = await waitForKisNav(page, 15000);
      if (!ok) {
        const which = await page.evaluate((sels) => sels.map(s => `${s}:${!!document.querySelector(s)}`), REQUIRED_SELECTORS);
        const msg = `[${device.name}] ${view} — kis-nav.js did not inject (${which.join(', ')}). configuration.yaml may be missing frontend.extra_module_url, or the cache-bust did not update.`;
        console.error('  ❌ ' + msg);
        failures.push(msg);
      } else {
        console.log('  ✓ kis-nav.js injected');
      }

      const filename = `qa-${device.name}-${view}.png`;
      await page.screenshot({
        path: path.join(OUT_DIR, filename),
        fullPage: false,
      });
      console.log(`  ✓ ${filename}`);
    }

    await context.close();
  }

  await browser.close();

  // Real-device capture: pull a live PNG from Fully Kiosk on the wall-mounted
  // Tab S9. Only runs if FKB_IP + FKB_PASSWORD are in .env; never fails the
  // overall QA run if the tablet is unreachable (it may be asleep, offline,
  // or the user may not have creds configured).
  if (FKB_IP && FKB_PASSWORD) {
    const fkbPath = path.join(OUT_DIR, 'fkb-tabs9.png');
    console.log(`\n[fkb] capturing real-device screenshot from ${FKB_IP}...`);
    try {
      await captureFullyKiosk(FKB_IP, FKB_PASSWORD, fkbPath);
      console.log(`  ✓ ${path.basename(fkbPath)}`);
    } catch (e) {
      console.warn(`  ⚠ Fully Kiosk capture skipped: ${e.message}`);
    }
  }

  if (failures.length) {
    console.error(`\n❌ QA FAILED — ${failures.length} kis-nav.js injection failure(s):`);
    failures.forEach(f => console.error('  - ' + f));
    console.error('\nDo NOT open a PR until this is resolved. Verify on real device first.');
    process.exit(1);
  }
  console.log(`\n✅ Done — ${views.length * DEVICES.length} screenshots in ${OUT_DIR}, kis-nav.js verified on every view.`);
})();
