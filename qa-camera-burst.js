/**
 * qa-camera-burst.js — Rapid FKB screenshots of the wall-mounted Tab S9
 *
 * Captures what is ALREADY on the tablet's screen via Fully Kiosk Browser's
 * Remote Admin REST API (cmd=getScreenshot). ZERO Nest API calls — we only
 * read what the tablet is already rendering. Ideal for verifying camera
 * loading transitions (crossfade, placeholder flash, stream init timing)
 * and motion-triggered takeover sequences without burning the Nest 5 QPM
 * quota.
 *
 * Usage:
 *   node qa-camera-burst.js                                  # 5 shots, 1s apart
 *   node qa-camera-burst.js --count 10                       # 10 shots, 1s apart
 *   node qa-camera-burst.js --interval 500                   # 5 shots, 500ms apart
 *   node qa-camera-burst.js --count 10 --interval 500        # 10 shots, 500ms apart
 *   node qa-camera-burst.js --trigger doorbell               # fire motion first, then burst
 *   node qa-camera-burst.js --trigger living_room --count 12 --interval 500
 *
 * --trigger <doorbell|living_room|bens_room>
 *   Fires a motion pulse via HA REST API BEFORE starting the burst, so the
 *   burst captures the full motion→takeover→stream sequence as rendered on
 *   the real tablet. Sleeps 500 ms between trigger and first shot.
 *
 *   Mechanism (Camera Follow Code — see ha-config automations.yaml):
 *     • doorbell     → POST /api/states/binary_sensor.doorbell_person_occupancy
 *                      {state: "on"} — triggers the Camera Follow Code
 *                      doorbell lock automation, which sets
 *                      input_text.priority_camera_lock to 'doorbell'.
 *     • living_room  → POST /api/states/binary_sensor.nest_cam_1_person_occupancy
 *                      {state: "on"} — triggers lock onto living_room (nest_cam_1).
 *     • bens_room    → POST /api/states/binary_sensor.nest_cam_2_person_occupancy
 *                      {state: "on"} — triggers lock onto bens_room (nest_cam_2).
 *
 *   Caveat: the forced state is only authoritative until the source
 *   integration pushes the next real update. That is fine — we only need
 *   person_occupancy to flip "on" long enough for the Camera Follow Code
 *   automations to lock, then sensor.priority_camera selects the target
 *   camera and the mobilev1 priority-display zone swaps to the takeover
 *   card. The 60-second trailing hold keeps it visible.
 *
 * .env (gitignored):
 *   FKB_IP=192.168.51.150                    # required
 *   FKB_PASSWORD=<remote admin password>     # required
 *   HA_QA_TOKEN=<long-lived access token>    # required for --trigger
 *   HA_URL=http://192.168.51.179:8123        # required for --trigger
 */
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
const FKB_IP = env.FKB_IP || process.env.FKB_IP;
const FKB_PASSWORD = env.FKB_PASSWORD || process.env.FKB_PASSWORD;
const HA_TOKEN = env.HA_QA_TOKEN || process.env.HA_QA_TOKEN || env.HA_TOKEN || process.env.HA_TOKEN;
const HA_URL = env.HA_URL || process.env.HA_URL || 'http://192.168.51.179:8123';

const OUT_DIR = path.join(__dirname, 'qa-screenshots', 'burst');

const TRIGGER_MAP = {
  doorbell:    { entity: 'binary_sensor.doorbell_motion',       state: 'on' },
  living_room: { entity: 'event.nest_cam_1_motion',     state: '__iso_now__' },
  bens_room:   { entity: 'event.nest_cam_2_motion',     state: '__iso_now__' },
};

function parseArgs(argv) {
  const args = { count: 5, interval: 1000, trigger: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') {
      args.count = parseInt(argv[++i], 10);
    } else if (a === '--interval') {
      args.interval = parseInt(argv[++i], 10);
    } else if (a === '--trigger') {
      args.trigger = argv[++i];
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  if (!Number.isFinite(args.count) || args.count < 1) {
    console.error('ERROR: --count must be a positive integer');
    process.exit(1);
  }
  if (!Number.isFinite(args.interval) || args.interval < 0) {
    console.error('ERROR: --interval must be a non-negative integer (ms)');
    process.exit(1);
  }
  if (args.trigger && !TRIGGER_MAP[args.trigger]) {
    console.error(`ERROR: --trigger must be one of: ${Object.keys(TRIGGER_MAP).join(', ')}`);
    process.exit(1);
  }
  return args;
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

function haPostState(haUrl, token, entityId, state) {
  return new Promise((resolve, reject) => {
    const u = new URL(haUrl);
    const body = JSON.stringify({ state });
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: `/api/states/${encodeURIComponent(entityId)}`,
      method: 'POST',
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HA API ${res.statusCode}: ${data}`));
      });
    });
    req.on('timeout', () => { req.destroy(new Error('HA API request timed out')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const args = parseArgs(process.argv);

  if (!FKB_IP || !FKB_PASSWORD) {
    console.error('ERROR: FKB_IP and FKB_PASSWORD must be set in .env — this tool captures from the wall-mounted Tab S9 via Fully Kiosk Remote Admin.');
    process.exit(1);
  }

  if (args.trigger) {
    if (!HA_TOKEN) {
      console.error('ERROR: --trigger requires HA_QA_TOKEN in .env');
      process.exit(1);
    }
    const t = TRIGGER_MAP[args.trigger];
    const state = t.state === '__iso_now__' ? new Date().toISOString() : t.state;
    console.log(`[trigger] firing motion for ${args.trigger} → ${t.entity} = ${state}`);
    try {
      await haPostState(HA_URL, HA_TOKEN, t.entity, state);
      console.log('[trigger] ✓ motion source state set; waiting 500ms for sticky sensor to latch');
      await sleep(500);
    } catch (e) {
      console.error(`[trigger] ✗ failed to fire motion: ${e.message}`);
      process.exit(1);
    }
  }

  // Clear old burst files and recreate the dir — every run is a fresh set.
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR)) {
      if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const pad = String(args.count).length;
  const start = Date.now();
  const timings = [];

  for (let i = 1; i <= args.count; i++) {
    const shotStart = Date.now();
    const elapsed = shotStart - start;
    const filename = `burst-${String(i).padStart(pad, '0')}-${elapsed}ms.png`;
    const outPath = path.join(OUT_DIR, filename);
    console.log(`Shot ${i}/${args.count} at ${elapsed}ms`);
    try {
      await captureFullyKiosk(FKB_IP, FKB_PASSWORD, outPath);
      timings.push(elapsed);
    } catch (e) {
      console.error(`  ✗ capture failed: ${e.message}`);
      if (i === 1) {
        // First shot must succeed — tablet unreachable means the tool is pointless.
        console.error('First shot failed — tablet unreachable. Aborting.');
        process.exit(1);
      }
    }
    // Only sleep if we have more shots to take, and only for the remaining
    // interval so actual spacing lands close to requested interval regardless
    // of REST latency.
    if (i < args.count) {
      const elapsedInShot = Date.now() - shotStart;
      const waitMs = Math.max(0, args.interval - elapsedInShot);
      if (waitMs > 0) await sleep(waitMs);
    }
  }

  const total = Date.now() - start;
  console.log(`\n✓ ${timings.length} shots captured in ${path.relative(__dirname, OUT_DIR)}/ over ${total}ms`);
})();
