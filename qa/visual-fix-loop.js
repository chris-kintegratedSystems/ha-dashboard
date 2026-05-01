#!/usr/bin/env node
/**
 * qa/visual-fix-loop.js
 * Visual fix loop for KIS HA Dashboard
 *
 * STEP 1: Deploy dashboard JSON to HA via WebSocket
 * STEP 2: Wait 2s, then screenshot live dashboard via page.goto()
 * STEP 3: Screenshot mockup from GitHub Pages
 * STEP 4: Send both to Claude API for visual comparison
 * STEP 5: Print gap report
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node visual-fix-loop.js [mobile|tablet|all] [--no-deploy]
 *
 * Flags:
 *   --no-deploy   Skip the WebSocket deploy step (screenshot current live state)
 *   --loop        Keep iterating until Claude reports no gaps (max 5 rounds)
 */

'use strict';

const { chromium } = require('playwright');
const WebSocket = require('ws');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const HA_URL  = 'http://192.168.51.179:8123';
const HA_TOKEN = process.env.HA_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2NDMxNWRkMjgyZDE0N2Y3YTFhZWY5MDg4Yjc4YWUwYyIsImlhdCI6MTc3NTk1ODc1NiwiZXhwIjoyMDkxMzE4NzU2fQ.SKDxCahBFqTuMDHw6jIopd8Xv8GFapFR8mRCZWwQyQI';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const DASHBOARD_DIR = path.join(__dirname, '..', 'projects', 'ha-dashboard');

const VIEWPORTS = {
  mobile: {
    label: 'iPhone 14 Pro (393×852)',
    width: 393,
    height: 852,
    dashboardPath: 'dashboard-mobilev1/home',
    dashboardUrlPath: 'dashboard-mobilev1',
    jsonFile: 'dashboard_mobilev1.json',
    mockupUrl: 'https://chris-kintegratedsystems.github.io/ha-dashboard/mockup-iphone.html',
    sections: ['Status Bar', 'Scenes', 'Locks', 'Garage', 'System Status', 'Now Playing'],
  },
  tablet: {
    label: 'Galaxy Tab S9+ (1752×2800)',
    width: 1752,
    height: 2800,
    dashboardPath: 'dashboard-tabletv1/home',
    dashboardUrlPath: 'dashboard-tabletv1',
    jsonFile: 'dashboard_tabletv1.json',
    mockupUrl: 'https://chris-kintegratedsystems.github.io/ha-dashboard/mockup-tablet.html',
    sections: ['Status Bar', 'Scenes', 'Security (Locks + Garage)', 'Now Playing'],
  },
};

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const noDeploy = args.includes('--no-deploy');
const loopMode = args.includes('--loop');
const MAX_ROUNDS = 5;

const targetArg = args.find(a => !a.startsWith('--')) || 'mobile';
const vpKeys = targetArg === 'all' ? Object.keys(VIEWPORTS) : [targetArg];

for (const k of vpKeys) {
  if (!VIEWPORTS[k]) {
    console.error(`Unknown target: ${k}. Use: mobile | tablet | all`);
    process.exit(1);
  }
}

// ── WebSocket deploy ──────────────────────────────────────────────────────────
function deployDashboards(vpKeys) {
  return new Promise((resolve, reject) => {
    const toDeploy = vpKeys.map(k => {
      const vp = VIEWPORTS[k];
      const jsonPath = path.join(DASHBOARD_DIR, vp.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Dashboard JSON not found: ${jsonPath}`);
      }
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return { urlPath: vp.dashboardUrlPath, config: parsed.data?.config ?? parsed };
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
        console.log('  [deploy] Authenticated — pushing dashboards...');
        const item = toDeploy[idx];
        ws.send(JSON.stringify({
          id: msgId++,
          type: 'lovelace/config/save',
          url_path: item.urlPath,
          config: item.config,
        }));
        return;
      }

      if (msg.type === 'result') {
        const item = toDeploy[idx];
        if (msg.success) {
          console.log(`  [deploy] ${item.urlPath} → OK`);
        } else {
          console.error(`  [deploy] ${item.urlPath} → FAIL: ${JSON.stringify(msg.error)}`);
        }
        idx++;
        if (idx < toDeploy.length) {
          const next = toDeploy[idx];
          ws.send(JSON.stringify({
            id: msgId++,
            type: 'lovelace/config/save',
            url_path: next.urlPath,
            config: next.config,
          }));
        } else {
          ws.close();
          resolve();
        }
      }
    });

    setTimeout(() => reject(new Error('Deploy timeout after 15s')), 15000);
  });
}

// ── HA auth storage state ─────────────────────────────────────────────────────
function hassStorageState() {
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

// ── Screenshot live dashboard ─────────────────────────────────────────────────
// Uses page.goto() with full URL — never page.reload()
async function screenshotLive(browser, vp, outPath) {
  const url = `${HA_URL}/${vp.dashboardPath}`;
  console.log(`  [screenshot] Live → ${url}`);

  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    storageState: hassStorageState(),
  });
  const page = await ctx.newPage();

  // Always page.goto() — never page.reload()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const current = page.url();
  if (current.includes('/auth/authorize') || current.includes('login')) {
    await ctx.close();
    throw new Error(`Auth redirect detected — check HA_TOKEN. URL: ${current}`);
  }

  // Wait for custom Lovelace cards to render
  await page.waitForTimeout(3000);

  await page.screenshot({ path: outPath, fullPage: false });
  await ctx.close();
  console.log(`  [screenshot] Live saved → ${outPath}`);
  return outPath;
}

// ── Screenshot mockup ─────────────────────────────────────────────────────────
async function screenshotMockup(browser, vp, outPath) {
  console.log(`  [screenshot] Mockup → ${vp.mockupUrl}`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(vp.mockupUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outPath, fullPage: false });
  await ctx.close();
  console.log(`  [screenshot] Mockup saved → ${outPath}`);
  return outPath;
}

// ── Claude API comparison ─────────────────────────────────────────────────────
async function compareWithClaude(liveImg, mockupImg, vp) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('  [compare] ANTHROPIC_API_KEY not set — skipping Claude comparison');
    return null;
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const liveB64   = fs.readFileSync(liveImg).toString('base64');
  const mockupB64 = fs.readFileSync(mockupImg).toString('base64');

  console.log('  [compare] Sending both screenshots to Claude API...');

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: `You are a Home Assistant dashboard QA expert. You compare a live HA dashboard screenshot against a design mockup and identify visual gaps. Be precise and actionable. Format your response as a numbered list of gaps. For each gap, state: (1) what section it's in, (2) what's wrong, (3) what the fix should be. If there are no gaps, reply with "NO GAPS — dashboard matches mockup."`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Compare these two screenshots of the ${vp.label} dashboard.\n\nImage 1 (MOCKUP — target design):\nImage 2 (LIVE — current state):\n\nSections to check: ${vp.sections.join(', ')}.\n\nList every visual difference you see. Be specific about colors, spacing, missing elements, wrong text, or layout issues.`,
        },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: mockupB64 },
        },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: liveB64 },
        },
      ],
    }],
  });

  return response.content[0].text;
}

// ── Main run for one viewport ─────────────────────────────────────────────────
async function runViewport(browser, vpKey, round) {
  const vp = VIEWPORTS[vpKey];
  const ts = Date.now();
  const liveOut   = path.join(SCREENSHOTS_DIR, `${vpKey}-live-r${round}-${ts}.png`);
  const mockupOut = path.join(SCREENSHOTS_DIR, `${vpKey}-mockup-r${round}-${ts}.png`);

  const [liveImg, mockupImg] = await Promise.all([
    screenshotLive(browser, vp, liveOut),
    screenshotMockup(browser, vp, mockupOut),
  ]);

  const gaps = await compareWithClaude(liveImg, mockupImg, vp);
  return { gaps, liveImg, mockupImg };
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  // Deploy step
  if (!noDeploy) {
    console.log('\n=== STEP 1: Deploy dashboards to HA ===');
    await deployDashboards(vpKeys);
    console.log('  Waiting 2s for HA to register changes...');
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log('  [deploy] Skipped (--no-deploy)');
  }

  const browser = await chromium.launch({ headless: true });
  let allClean = false;
  let round = 1;

  try {
    while (!allClean && round <= MAX_ROUNDS) {
      console.log(`\n=== STEP ${noDeploy ? 1 : 2}: Screenshot + Compare (round ${round}) ===`);
      allClean = true;

      for (const vpKey of vpKeys) {
        console.log(`\n--- ${VIEWPORTS[vpKey].label} ---`);
        const { gaps, liveImg, mockupImg } = await runViewport(browser, vpKey, round);

        if (gaps) {
          const hasGaps = !gaps.toLowerCase().includes('no gaps');
          console.log(`\n[Claude QA — ${vpKey}]:\n${gaps}\n`);
          if (hasGaps) allClean = false;
        }
      }

      if (loopMode && !allClean && round < MAX_ROUNDS) {
        console.log(`\nGaps found. Round ${round} complete. Manual fix required — re-run after updating dashboard JSON.`);
        break; // Loop mode: report then exit (fixes are manual)
      }
      round++;
      if (!loopMode) break; // Single pass by default
    }

    if (allClean) {
      console.log('\n✅ Dashboard matches mockup — no gaps detected.');
    }
  } finally {
    await browser.close();
  }

  console.log('\nDone. Screenshots saved to qa/screenshots/');
})().catch(err => {
  console.error('visual-fix-loop failed:', err.message);
  process.exit(1);
});
