/**
 * One-off: rewrite the mobilev1 Home priority-display zone so the 3 motion
 * camera conditionals are wrapped in a vertical-stack and keyed on their
 * own sticky sensors (enables stream-preload pattern). kis-nav.js then
 * overlays them via CSS + drives winner visibility from sensor.priority_camera.
 */
const fs = require('fs');
const path = require('path');

const DASHBOARD = path.join(__dirname, '..', 'dashboard_mobilev1.json');
const data = JSON.parse(fs.readFileSync(DASHBOARD, 'utf8'));

const CAM_CONFIG = [
  { camState: 'doorbell',     sticky: 'binary_sensor.doorbell_motion_sticky' },
  { camState: 'living_room',  sticky: 'binary_sensor.nest_cam_2_motion_sticky' },
  { camState: 'izzy',         sticky: 'binary_sensor.nest_cam_1_motion_sticky' },
];

let rewriteCount = 0;

function rewriteSection(section) {
  if (!Array.isArray(section.cards)) return;
  // Find the 3 conditional cards keyed on sensor.priority_camera with states
  // doorbell/living_room/izzy (in any order), consecutive or not.
  const indices = [];
  const conditionals = [];
  section.cards.forEach((c, idx) => {
    if (
      c.type === 'conditional' &&
      Array.isArray(c.conditions) &&
      c.conditions.length === 1 &&
      c.conditions[0].entity === 'sensor.priority_camera' &&
      CAM_CONFIG.some((cam) => cam.camState === c.conditions[0].state)
    ) {
      indices.push(idx);
      conditionals.push(c);
    }
  });
  if (conditionals.length !== 3) return;

  // Rebuild conditionals: rewrite each condition to key on its own sticky sensor.
  const newConditionals = conditionals.map((c) => {
    const state = c.conditions[0].state;
    const cam = CAM_CONFIG.find((x) => x.camState === state);
    return {
      ...c,
      conditions: [
        {
          condition: 'state',
          entity: cam.sticky,
          state: 'on',
        },
      ],
    };
  });

  // Replace the 3 original entries with a single vertical-stack wrapping them.
  // Order: doorbell, living_room, izzy (stable regardless of original order).
  const ordered = CAM_CONFIG.map((cam) => {
    const match = newConditionals.find(
      (c) => c.conditions[0].entity === cam.sticky
    );
    return match;
  });

  const wrapper = {
    type: 'vertical-stack',
    cards: ordered,
  };

  // Delete from highest-idx first so earlier indices remain valid.
  indices
    .slice()
    .sort((a, b) => b - a)
    .forEach((i) => section.cards.splice(i, 1));
  // Insert the wrapper at the position of the first removed conditional.
  section.cards.splice(indices[0], 0, wrapper);
  rewriteCount++;
}

function walk(node) {
  if (node && typeof node === 'object') {
    if (Array.isArray(node.sections)) {
      node.sections.forEach(rewriteSection);
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  }
}

walk(data);

if (rewriteCount === 0) {
  console.error('No priority-zone section matched. Aborting.');
  process.exit(1);
}

fs.writeFileSync(DASHBOARD, JSON.stringify(data, null, 2) + '\n');
console.log('Rewrote ' + rewriteCount + ' section(s).');
