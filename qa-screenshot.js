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
 *   node qa-screenshot.js [view] [devices] [flags]
 *   node qa-screenshot.js                                                # all views, all devices (full 48-shot sweep)
 *   node qa-screenshot.js home                                           # just the home view, all devices
 *   node qa-screenshot.js cameras tabs9plus-landscape,iphone17promax-portrait
 *                                                                        # targeted iteration sweep — one view, two devices
 *
 * Flags:
 *   --mock-cameras        Replace the two Nest camera streams
 *                         (camera.nest_cam_2, camera.nest_cam_1)
 *                         with a generated SVG "CAMERA MOCK" placeholder.
 *                         Zero Nest SDM API calls. Use this for all
 *                         iterative camera-containing-view layout work so
 *                         you don't burn the 5 QPM ExecuteDeviceCommand
 *                         quota. Vivint doorbell + Nanit cameras are NOT
 *                         mocked (no rate limits).
 *
 *   --camera-delay N      Milliseconds to wait between device profiles
 *                         when the current view is a camera-containing
 *                         view (cameras or home). Default 15000. Only
 *                         applies when --mock-cameras is NOT set. Lets a
 *                         full sweep across 8 devices stay under the Nest
 *                         5 QPM quota at the cost of ~2 minutes extra.
 *
 * During iterative UI work, prefer the targeted form. Run the full sweep
 * once at the end before committing + updating the PR. See CLAUDE.md
 * "Camera QA — rate-limit-safe testing" for the full decision guide.
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

// Eight device profiles — every piece of real hardware in Chris's household,
// in both orientations. Viewports are CSS pixels; scale is DPR.
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const DEVICES = [
  { name: 'ipad11-portrait',          width: 834,  height: 1194, scale: 2, ua: null },
  { name: 'ipad11-landscape',         width: 1194, height: 834,  scale: 2, ua: null },
  { name: 'tabs9plus-portrait',       width: 876,  height: 1400, scale: 2, ua: null },
  { name: 'tabs9plus-landscape',      width: 1400, height: 876,  scale: 2, ua: null },
  { name: 'iphone17promax-portrait',  width: 440,  height: 956,  scale: 3, ua: IOS_UA },
  { name: 'iphone17promax-landscape', width: 956,  height: 440,  scale: 3, ua: IOS_UA },
  { name: 'iphone16pro-portrait',     width: 402,  height: 874,  scale: 3, ua: IOS_UA },
  { name: 'iphone16pro-landscape',    width: 874,  height: 402,  scale: 3, ua: IOS_UA },
];

// kis-nav.js injects these IDs into document.body — checking for them is how
// we know the authenticated session loaded the frontend.extra_module_url JS.
const REQUIRED_SELECTORS = ['#kis-header-bar', '#kis-nav-bar'];

// Nest SDM cameras are the only ones that get rate-limited (5 QPM per device
// on ExecuteDeviceCommand). Vivint doorbell + Nanit never need mocking.
const MOCK_CAMERA_ENTITIES = ['camera.nest_cam_2', 'camera.nest_cam_1'];

// Views whose layout typically renders Nest camera streams. --camera-delay
// applies between device profiles on these views only.
const CAMERA_VIEWS = new Set(['cameras', 'home']);

function buildMockSvg(label) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="100%" height="100%" fill="#2a2f3a"/>` +
    `<text x="50%" y="46%" text-anchor="middle" fill="#c0c8d8" font-family="system-ui,Arial,sans-serif" font-size="120" font-weight="700">CAMERA MOCK</text>` +
    `<text x="50%" y="60%" text-anchor="middle" fill="#6a7484" font-family="system-ui,Arial,sans-serif" font-size="56">${label}</text>` +
    `</svg>`;
  return svg;
}

// Installs the camera mock into the page. Uses two layers so the mock holds
// whether HA serves via camera_proxy (HTTP snapshot) or via HLS/WebRTC stream:
//   Layer 1 — page.route() intercepts /api/camera_proxy/<entity>* requests
//             and returns the SVG mock. Option A from the task brief.
//   Layer 2 — addInitScript injects a MutationObserver that walks shadow
//             DOMs, finds hui-picture-entity-card elements whose config.entity
//             matches a mock entity, and paints an SVG overlay on ha-card
//             that covers the live feed. This covers HLS/WebRTC paths whose
//             URL tokens are not deterministic enough for page.route to match.
async function installCameraMocks(context) {
  // Layer 1 — HTTP intercept for snapshot paths.
  for (const entity of MOCK_CAMERA_ENTITIES) {
    const pattern = `**/api/camera_proxy/${entity}*`;
    await context.route(pattern, async (route) => {
      const svg = buildMockSvg(entity);
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: svg,
      });
    });
    // camera_proxy_stream is the MJPEG stream path; feed back the same SVG
    // as a single frame so the stream element has something to show.
    const streamPattern = `**/api/camera_proxy_stream/${entity}*`;
    await context.route(streamPattern, async (route) => {
      const svg = buildMockSvg(entity);
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: svg,
      });
    });
  }

  // Layer 2 — shadow-DOM overlay. Runs inside the page on every navigation.
  await context.addInitScript(({ mockEntities }) => {
    const MOCK = new Set(mockEntities);
    const svgCache = new Map();
    function dataUri(entity) {
      if (svgCache.has(entity)) return svgCache.get(entity);
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">' +
        '<rect width="100%" height="100%" fill="#2a2f3a"/>' +
        '<text x="50%" y="46%" text-anchor="middle" fill="#c0c8d8" font-family="system-ui,Arial,sans-serif" font-size="120" font-weight="700">CAMERA MOCK</text>' +
        '<text x="50%" y="60%" text-anchor="middle" fill="#6a7484" font-family="system-ui,Arial,sans-serif" font-size="56">' + entity + '</text>' +
        '</svg>';
      const uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      svgCache.set(entity, uri);
      return uri;
    }

    function applyMock(card) {
      if (!card || card.__kisMocked) return;
      const entity = card.config && card.config.entity;
      if (!entity || !MOCK.has(entity)) return;
      const sr = card.shadowRoot;
      if (!sr) return;
      const haCard = sr.querySelector('ha-card');
      if (!haCard) return;
      card.__kisMocked = true;
      const style = document.createElement('style');
      style.textContent = `
        ha-card { background: #2a2f3a !important; position: relative; }
        hui-image, hui-image img, hui-image video, hui-image div,
        ha-hls-player, ha-hls-player video,
        ha-camera-stream, ha-camera-stream video {
          opacity: 0 !important;
        }
        .kis-mock-overlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          background-color: #2a2f3a;
          background-image: url("${dataUri(entity)}");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          border-radius: inherit;
          pointer-events: none;
        }
      `;
      sr.appendChild(style);
      const overlay = document.createElement('div');
      overlay.className = 'kis-mock-overlay';
      haCard.appendChild(overlay);
    }

    function walk(node) {
      if (!node) return;
      if (node.tagName === 'HUI-PICTURE-ENTITY-CARD') applyMock(node);
      const sr = node.shadowRoot;
      if (sr) {
        for (const child of sr.children) walk(child);
      }
      const kids = node.children || [];
      for (const child of kids) walk(child);
    }

    // Run both on an interval (cheap, catches async renders) and via
    // MutationObserver on document for immediate coverage.
    const mo = new MutationObserver(() => walk(document.body));
    mo.observe(document, { subtree: true, childList: true });
    setInterval(() => walk(document.body), 500);
  }, { mockEntities: MOCK_CAMERA_ENTITIES });
}

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
    const url = `http://${ip}:2323/?cmd=getScreenshot&password=${encodeURIComponent(password)}`;
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
  // Split argv into flags (--foo [value]) and positional args. Positional
  // args are [view, devices] — preserved so existing invocations like
  // `node qa-screenshot.js cameras tabs9plus-landscape,iphone17promax-portrait`
  // still work exactly as before when no flags are present.
  const positional = [];
  let mockCameras = false;
  let cameraDelayMs = 15000;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--mock-cameras') {
      mockCameras = true;
    } else if (a === '--camera-delay') {
      const v = parseInt(process.argv[++i], 10);
      if (!Number.isFinite(v) || v < 0) {
        console.error('ERROR: --camera-delay must be a non-negative integer (ms)');
        process.exit(1);
      }
      cameraDelayMs = v;
    } else if (a.startsWith('--')) {
      console.error(`ERROR: unknown flag: ${a}`);
      process.exit(1);
    } else {
      positional.push(a);
    }
  }

  const requestedView = positional[0];
  const views = requestedView ? [requestedView] : VIEWS;

  const requestedDevices = positional[1];
  const devices = requestedDevices
    ? (() => {
        const names = requestedDevices.split(',').map(s => s.trim()).filter(Boolean);
        const unknown = names.filter(n => !DEVICES.some(d => d.name === n));
        if (unknown.length) {
          console.error(`ERROR: unknown device name(s): ${unknown.join(', ')}`);
          console.error(`Valid: ${DEVICES.map(d => d.name).join(', ')}`);
          process.exit(1);
        }
        return DEVICES.filter(d => names.includes(d.name));
      })()
    : DEVICES;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  if (mockCameras) {
    console.log(`[mock] Nest cameras mocked: ${MOCK_CAMERA_ENTITIES.join(', ')} — zero SDM API calls.`);
  }

  // A sweep "touches cameras" if any view in the run is a camera-containing
  // view. Only then does --camera-delay apply between device profiles.
  const sweepTouchesCameras = views.some(v => CAMERA_VIEWS.has(v));
  const applyCameraDelay = sweepTouchesCameras && !mockCameras && cameraDelayMs > 0;

  const browser = await chromium.launch();
  const failures = [];

  for (let deviceIdx = 0; deviceIdx < devices.length; deviceIdx++) {
    const device = devices[deviceIdx];

    if (applyCameraDelay && deviceIdx > 0) {
      console.log(`[rate-limit] Camera rate-limit delay: waiting ${cameraDelayMs}ms before next device...`);
      await new Promise(r => setTimeout(r, cameraDelayMs));
    }

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      userAgent: device.ua || undefined,
      // Bearer header covers REST fetches for /api/* and /local/* — HA
      // frontend still uses WebSocket auth, so localStorage token below
      // is what authenticates the long-running session.
      extraHTTPHeaders: { Authorization: `Bearer ${HA_TOKEN}` },
    });

    if (mockCameras) await installCameraMocks(context);

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
  console.log(`\n✅ Done — ${views.length * devices.length} screenshots in ${OUT_DIR}, kis-nav.js verified on every view.`);
})();
