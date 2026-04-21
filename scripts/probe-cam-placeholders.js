/**
 * One-off probe: navigate to /cameras, then poll the picture-entity shadow
 * DOMs for the .kis-cam-placeholder overlay. Reports count + current
 * opacity for each so we can verify v29 placeholder installation works
 * without having to catch the 300ms crossfade mid-flight.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Minimal .env parser so we don't depend on dotenv being installed.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const HA_URL = 'http://192.168.51.179:8123';
const HA_TOKEN = process.env.HA_QA_TOKEN || process.env.HA_TOKEN;

async function setHassTokens(page, token) {
  await page.evaluate((t) => {
    const payload = {
      access_token: t,
      token_type: 'Bearer',
      refresh_token: 'probe',
      expires_in: 1800,
      hassUrl: window.location.origin,
      clientId: window.location.origin,
      expires: Date.now() + 1800000,
    };
    localStorage.setItem('hassTokens', JSON.stringify(payload));
  }, token);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 876 },
    extraHTTPHeaders: { Authorization: `Bearer ${HA_TOKEN}` },
  });
  const page = await context.newPage();

  await page.goto(HA_URL + '/auth/authorize', { waitUntil: 'domcontentloaded' });
  await setHassTokens(page, HA_TOKEN);
  await page.goto(HA_URL + '/dashboard-mobilev1/cameras', { waitUntil: 'load' });
  await setHassTokens(page, HA_TOKEN);

  // Poll for placeholders appearing as the page boots; log the first time
  // they land and their state, then re-check after 3 s to confirm fade.
  const probe = async () => {
    return await page.evaluate(() => {
      const pes = [];
      const seen = new Set();
      function walk(root) {
        if (!root || seen.has(root)) return;
        seen.add(root);
        const found = root.querySelectorAll
          ? root.querySelectorAll('hui-picture-entity-card')
          : [];
        for (const pe of found) pes.push(pe);
        const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (const el of all) if (el.shadowRoot) walk(el.shadowRoot);
      }
      walk(document.body);
      return pes.map((pe) => {
        const cfg = pe._config || pe.config;
        const sr = pe.shadowRoot;
        const ov = sr && sr.querySelector('.kis-cam-placeholder');
        const hasOv = !!ov;
        const ready = ov && ov.classList.contains('kis-ready');
        const opacity = ov ? getComputedStyle(ov).opacity : null;
        const haCardPos = sr && sr.querySelector('ha-card')
          ? getComputedStyle(sr.querySelector('ha-card')).position : null;
        return {
          entity: cfg && cfg.entity,
          hasOverlay: hasOv,
          ready,
          opacity,
          haCardPosition: haCardPos,
        };
      });
    });
  };

  // Wait for kis-nav to inject + placeholders to land.
  await page.waitForTimeout(1500);
  console.log('T=1.5s:');
  console.table(await probe());

  await page.waitForTimeout(3000);
  console.log('T=4.5s (after streams should be ready):');
  console.table(await probe());

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
