/**
 * One-off visual: navigate to /cameras, screenshot at T=1s (placeholders
 * visible) and T=5s (placeholders faded), so we can eyeball the actual
 * placeholder look and the crossfade endpoint.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const HA_URL = 'http://192.168.51.179:8123';
const HA_TOKEN = process.env.HA_QA_TOKEN || process.env.HA_TOKEN;
const OUT = path.join(__dirname, '..', 'qa-screenshots');

async function setHassTokens(page, token) {
  await page.evaluate((t) => {
    const payload = {
      access_token: t, token_type: 'Bearer', refresh_token: 'probe',
      expires_in: 1800, hassUrl: window.location.origin,
      clientId: window.location.origin, expires: Date.now() + 1800000,
    };
    localStorage.setItem('hassTokens', JSON.stringify(payload));
  }, token);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 876 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: { Authorization: `Bearer ${HA_TOKEN}` },
  });
  const page = await context.newPage();

  await page.goto(HA_URL + '/auth/authorize', { waitUntil: 'domcontentloaded' });
  await setHassTokens(page, HA_TOKEN);
  await page.goto(HA_URL + '/dashboard-mobilev1/cameras', { waitUntil: 'load' });
  await setHassTokens(page, HA_TOKEN);

  await page.waitForTimeout(1200);
  const p1 = path.join(OUT, 'cam-placeholder-initial.png');
  await page.screenshot({ path: p1 });
  console.log('Saved initial:', p1);

  await page.waitForTimeout(4000);
  const p2 = path.join(OUT, 'cam-placeholder-ready.png');
  await page.screenshot({ path: p2 });
  console.log('Saved ready:', p2);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
