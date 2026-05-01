#!/usr/bin/env node
/**
 * qa/full-page-qa.js
 * Full per-page, per-card visual QA for KIS HA Dashboard.
 *
 * For each page (Home, Climate, Lights, Cameras, Media) on both
 * mobile and tablet:
 *   1. Navigate live HA dashboard to that view
 *   2. Take full-page screenshot
 *   3. Navigate mockup HTML to that page
 *   4. Take full-page screenshot of mockup
 *   5. Send both to Claude Opus for detailed card-by-card comparison
 *   6. Print gap report
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node full-page-qa.js [mobile|tablet|all] [--no-deploy]
 */

'use strict';

const { chromium } = require('playwright');
const WebSocket = require('ws');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const HA_URL = 'http://192.168.51.179:8123';
const HA_TOKEN = process.env.HA_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2NDMxNWRkMjgyZDE0N2Y3YTFhZWY5MDg4Yjc4YWUwYyIsImlhdCI6MTc3NTk1ODc1NiwiZXhwIjoyMDkxMzE4NzU2fQ.SKDxCahBFqTuMDHw6jIopd8Xv8GFapFR8mRCZWwQyQI';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DASHBOARD_DIR = path.join(__dirname, '..', 'projects', 'ha-dashboard');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'full-qa-' + Date.now());
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ── Pages to check per viewport ───────────────────────────────────────────────
const PAGES = [
  { id: 'home',    label: 'Home',    mockupId: 'home' },
  { id: 'climate', label: 'Climate', mockupId: 'climate' },
  { id: 'lights',  label: 'Lights',  mockupId: 'lights' },
  { id: 'cameras', label: 'Cameras', mockupId: 'cameras' },
  { id: 'media',   label: 'Media',   mockupId: 'media' },
];

const VIEWPORTS = {
  mobile: {
    label: 'iPhone 14 Pro',
    width: 393,
    height: 852,
    // Simulate WKWebView Dynamic Island safe-area-inset-top.
    // Playwright can't override env(safe-area-inset-top) natively, so we:
    //   1. Set --sait CSS var (used by dashboard CSS)
    //   2. Overlay a black bar at the top to reveal any content hidden under the notch
    safeAreaTop: 59,
    dashboardUrlPrefix: 'dashboard-mobilev1',
    jsonFile: 'dashboard_mobilev1.json',
    mockupUrl: 'https://chris-kintegratedsystems.github.io/ha-dashboard/mockup-iphone.html',
  },
  tablet: {
    label: 'Galaxy Tab S9+',
    width: 1052,
    height: 1680,
    safeAreaTop: 0,
    dashboardUrlPrefix: 'dashboard-tabletv1',
    jsonFile: 'dashboard_tabletv1.json',
    mockupUrl: 'https://chris-kintegratedsystems.github.io/ha-dashboard/mockup-tablet.html',
  },
};

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const noDeploy = args.includes('--no-deploy');
const targetArg = args.find(a => !a.startsWith('--')) || 'mobile';
const vpKeys = targetArg === 'all' ? Object.keys(VIEWPORTS) : [targetArg];

// ── Deploy ────────────────────────────────────────────────────────────────────
function deployDashboards(keys) {
  return new Promise((resolve, reject) => {
    const toDeploy = keys.map(k => {
      const vp = VIEWPORTS[k];
      const jsonPath = path.join(DASHBOARD_DIR, vp.jsonFile);
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return { urlPath: vp.dashboardUrlPrefix, config: parsed.data?.config ?? parsed };
    });

    const ws = new WebSocket(`ws://${HA_URL.replace('http://', '')}/api/websocket`);
    let msgId = 1;
    let idx = 0;

    ws.on('error', err => reject(new Error(`WebSocket error: ${err.message}`)));
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
        return;
      }
      if (msg.type === 'auth_ok') {
        console.log('  [deploy] Authenticated — pushing...');
        ws.send(JSON.stringify({ id: msgId++, type: 'lovelace/config/save', url_path: toDeploy[idx].urlPath, config: toDeploy[idx].config }));
        return;
      }
      if (msg.type === 'result') {
        console.log(`  [deploy] ${toDeploy[idx].urlPath} → ${msg.success ? 'OK' : 'FAIL: ' + JSON.stringify(msg.error)}`);
        idx++;
        if (idx < toDeploy.length) {
          ws.send(JSON.stringify({ id: msgId++, type: 'lovelace/config/save', url_path: toDeploy[idx].urlPath, config: toDeploy[idx].config }));
        } else {
          ws.close();
          resolve();
        }
      }
    });
    setTimeout(() => reject(new Error('Deploy timeout')), 15000);
  });
}

// ── Auth storage ──────────────────────────────────────────────────────────────
function hassStorage() {
  return {
    cookies: [],
    origins: [{
      origin: HA_URL,
      localStorage: [{
        name: 'hassTokens',
        value: JSON.stringify({
          access_token: HA_TOKEN,
          token_type: 'Bearer',
          expires_in: 1800,
          refresh_token: 'long-lived-no-refresh-needed',
          expires_on: Math.floor(Date.now() / 1000) + 31536000,
          hassUrl: HA_URL,
          clientId: HA_URL + '/',
        }),
      }],
    }],
  };
}

// ── Screenshot live ───────────────────────────────────────────────────────────
async function screenshotLivePage(browser, vp, pageId, outPath) {
  const url = `${HA_URL}/${vp.dashboardUrlPrefix}/${pageId}`;
  console.log(`    [live] ${url}`);

  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    storageState: hassStorage(),
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const current = page.url();
  if (current.includes('/auth/') || current.includes('login')) {
    await ctx.close();
    throw new Error(`Auth redirect — check token. URL: ${current}`);
  }

  // Inject --sait IMMEDIATELY after load so kis-nav.js measures the header
  // at the correct height (matching real WKWebView safe-area-inset-top).
  // If injected late, the clearance measurement uses the wrong header height.
  if (vp.safeAreaTop) {
    await page.addStyleTag({
      content: `:root { --sait: ${vp.safeAreaTop}px !important; }`
    });
  }

  // Wait for custom cards + kis-nav.js clearance re-measurements (1s, 2s, 3.5s)
  await page.waitForTimeout(4000);

  // Overlay a black bar to visually show the notch zone in screenshots.
  if (vp.safeAreaTop) {
    await page.addStyleTag({
      content: `
        body::before {
          content: 'notch (${vp.safeAreaTop}px)';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: ${vp.safeAreaTop}px;
          background: rgba(0, 0, 0, 0.82);
          color: #fff;
          font: 10px/1 monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          pointer-events: none;
        }
      `
    });
    await page.waitForTimeout(200);
  }

  await page.screenshot({ path: outPath, fullPage: true });
  await ctx.close();
  return outPath;
}

// ── Screenshot mockup page ────────────────────────────────────────────────────
async function screenshotMockupPage(browser, vp, mockupPageId, outPath) {
  console.log(`    [mockup] ${vp.mockupUrl} → page: ${mockupPageId}`);

  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(vp.mockupUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Navigate to the correct page in the mockup via JS
  if (mockupPageId !== 'home') {
    await page.evaluate((pid) => {
      // Click the nav button for the target page
      const btn = document.querySelector(`[onclick*="switchPage('${pid}'"]`) ||
                  document.querySelector(`[onclick*='switchPage("${pid}"']`);
      if (btn) btn.click();
      // Fallback: directly call switchPage if available
      else if (typeof switchPage === 'function') switchPage(pid, null);
      else {
        // Manual show/hide
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + pid);
        if (target) target.classList.add('active');
      }
    }, mockupPageId);
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: outPath, fullPage: true });
  await ctx.close();
  return outPath;
}

// ── Claude compare ────────────────────────────────────────────────────────────
async function compareWithClaude(liveImg, mockupImg, vpLabel, pageLabel) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('  [compare] ANTHROPIC_API_KEY not set — skipping');
    return null;
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const liveB64   = fs.readFileSync(liveImg).toString('base64');
  const mockupB64 = fs.readFileSync(mockupImg).toString('base64');

  const headerZones = `
HEADER CARD ZONES (check each explicitly by name):
  1. TIME — large monospace clock (top-left), should show HH:MM
  2. DATE — day + month below clock (e.g. "Sunday · April 13"), muted color
  3. ALARM PILL — colored badge showing security state (Disarmed/Armed Away/Armed Home/Triggered), correct color per state
  4. WEATHER — temperature (°F) + city + condition text (right side of row with alarm pill)
  5. PRESENCE CIRCLES — 3 small circles labeled C, CL, B (Chris/Claire/Benjamin), green when home, grey when away

For each zone: does it appear? correct position? correct text/color? any truncation or missing content?`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: `You are a KIS Home Assistant dashboard QA expert. Your job is to compare a live HA dashboard screenshot against a design mockup and find every visual difference. You are precise, literal, and direct. You describe what you actually SEE in each image — not what you expect. You never say "matches" unless you can confirm the specific element is visually identical. Format output as a numbered list of gaps. For each gap: ZONE name, what is wrong, and what the fix is. If a zone truly matches, say "✅ ZONE_NAME — matches". End with overall verdict: PASS or FAIL.`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Viewport: ${vpLabel} | Page: ${pageLabel}

Image 1 = MOCKUP (approved target design)
Image 2 = LIVE dashboard on Pi right now

${headerZones}

After checking the header zones, check ALL other cards on the page:
- Scene buttons section (colors, labels, layout)
- Lock/garage buttons
- System status chips
- Nav bar (5 tabs, active tab indicator)
- Any extra or missing cards vs mockup

Be specific. If you see --:-- for time, that is a bug. If presence circles are missing, say so. If alarm pill color is wrong, name the color you see vs what is expected.`,
        },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: mockupB64 } },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: liveB64 } },
      ],
    }],
  });

  return response.content[0].text;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  if (!noDeploy) {
    console.log('\n=== DEPLOY ===');
    await deployDashboards(vpKeys);
    console.log('  Waiting 2s...');
    await new Promise(r => setTimeout(r, 2000));
  }

  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  try {
    for (const vpKey of vpKeys) {
      const vp = VIEWPORTS[vpKey];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`VIEWPORT: ${vp.label} (${vp.width}×${vp.height})`);
      console.log('='.repeat(60));

      for (const pg of PAGES) {
        console.log(`\n  -- Page: ${pg.label} --`);
        const liveOut   = path.join(SCREENSHOTS_DIR, `${vpKey}-${pg.id}-live.png`);
        const mockupOut = path.join(SCREENSHOTS_DIR, `${vpKey}-${pg.id}-mockup.png`);

        let liveImg, mockupImg;
        try {
          liveImg   = await screenshotLivePage(browser, vp, pg.id, liveOut);
          mockupImg = await screenshotMockupPage(browser, vp, pg.mockupId, mockupOut);
        } catch (err) {
          console.error(`    [error] ${err.message}`);
          allResults.push({ viewport: vp.label, page: pg.label, gaps: `ERROR: ${err.message}` });
          continue;
        }

        console.log(`    [compare] Sending to Claude...`);
        const gaps = await compareWithClaude(liveImg, mockupImg, vp.label, pg.label);

        allResults.push({ viewport: vp.label, page: pg.label, gaps });

        const hasGaps = gaps && !gaps.toLowerCase().includes('no gaps');
        console.log(`\n  [${vpKey.toUpperCase()} / ${pg.label}]:`);
        console.log(gaps || '(no API key — skipped)');
        console.log(hasGaps ? '  ⚠ GAPS FOUND' : '  ✅ MATCHES MOCKUP');
      }
    }
  } finally {
    await browser.close();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('FULL QA SUMMARY');
  console.log('='.repeat(60));
  let totalGaps = 0;
  const summaryLines = [];
  for (const r of allResults) {
    const hasGaps = r.gaps && !r.gaps.toLowerCase().includes('no gaps');
    if (hasGaps) totalGaps++;
    const line = `${hasGaps ? '⚠' : '✅'} ${r.viewport} / ${r.page}: ${hasGaps ? 'GAPS' : 'OK'}`;
    console.log(line);
    summaryLines.push(line);
  }
  const verdict = totalGaps === 0 ? '✅ ALL PAGES MATCH MOCKUP' : `⚠ ${totalGaps} page(s) have gaps`;
  console.log(`\n${verdict}`);
  console.log(`\nScreenshots saved: ${SCREENSHOTS_DIR}`);

  // ── Post to Slack #dev-log ────────────────────────────────────────────────
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (slackToken) {
    try {
      const https = require('https');
      const slackBody = JSON.stringify({
        channel: 'C0AR0GBNJVB',
        text: `*QA Run — ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}*\n${summaryLines.join('\n')}\n\n*Verdict:* ${verdict}\n\nScreenshots: \`${SCREENSHOTS_DIR}\``,
        unfurl_links: false,
      });
      await new Promise((resolve) => {
        const req = https.request({
          hostname: 'slack.com',
          path: '/api/chat.postMessage',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackToken}`,
            'Content-Length': Buffer.byteLength(slackBody),
          },
        }, (res) => {
          let data = '';
          res.on('data', d => { data += d; });
          res.on('end', () => {
            const parsed = JSON.parse(data);
            if (parsed.ok) console.log('  [slack] Posted QA summary to #dev-log');
            else console.warn('  [slack] Post failed:', parsed.error);
            resolve();
          });
        });
        req.on('error', e => { console.warn('  [slack] Error:', e.message); resolve(); });
        req.write(slackBody);
        req.end();
      });

      // Post full gap details for failed pages
      for (const r of allResults) {
        const hasGaps = r.gaps && !r.gaps.toLowerCase().includes('no gaps');
        if (hasGaps && r.gaps) {
          const detailBody = JSON.stringify({
            channel: 'C0AR0GBNJVB',
            text: `*Gap Detail — ${r.viewport} / ${r.page}*\n\`\`\`\n${r.gaps.slice(0, 2900)}\n\`\`\``,
          });
          await new Promise((resolve) => {
            const req = https.request({
              hostname: 'slack.com',
              path: '/api/chat.postMessage',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackToken}`,
                'Content-Length': Buffer.byteLength(detailBody),
              },
            }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
            req.on('error', resolve);
            req.write(detailBody);
            req.end();
          });
        }
      }
    } catch (e) {
      console.warn('  [slack] Failed to post:', e.message);
    }
  } else {
    console.log('  [slack] SLACK_BOT_TOKEN not set — skipping Slack post');
  }
})().catch(err => {
  console.error('full-page-qa failed:', err.message);
  process.exit(1);
});
