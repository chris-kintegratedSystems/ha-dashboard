/**
 * KIS App Shell — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Minimal persistent UI layer for the KIS mobilev2 dashboard.
 * Manages: day/night theme initialization, CSS variable application
 * from HA input_text color helpers, and theme switching on sun.sun
 * state changes.
 *
 * Loaded via frontend.extra_module_url in configuration.yaml.
 * Survives Lovelace page transitions.
 *
 * Paired with: kis-dashboard-v2.yaml (page structure)
 * Depends on: kis-design-tokens.js (sizing constants)
 */

(function () {
  'use strict';

  const VERSION = '1';
  window.KIS_APP_SHELL_VERSION = VERSION;

  // ── Color helper mapping ──────────────────────────────────────────────────
  // Maps input_text entity suffix → CSS variable name on :root
  const COLOR_MAP = [
    { key: 'primary_accent', css: '--kis-accent' },
    { key: 'bg_app',         css: '--kis-bg-app' },
    { key: 'text_primary',   css: '--kis-text-primary' },
    { key: 'text_secondary', css: '--kis-text-secondary' },
    { key: 'success',        css: '--kis-green' },
    { key: 'warning',        css: '--kis-orange' },
    { key: 'error',          css: '--kis-red' },
    { key: 'info',           css: '--kis-blue' },
    { key: 'scene_active',   css: '--kis-scene-active' },
    { key: 'section_label',  css: '--kis-section-label' },
  ];

  // ── Factory defaults (match kis-day.yaml / kis-night.yaml) ────────────────
  const FACTORY = {
    day: {
      primary_accent: '#0088a8',
      bg_app:         '#f0f2f5',
      text_primary:   '#1a2030',
      text_secondary: '#4a5a72',
      success:        '#089464',
      warning:        '#c07808',
      error:          '#c02840',
      info:           '#2d6bc4',
      scene_active:   '#c07808',
      section_label:  '#7a8698',
    },
    night: {
      primary_accent: '#00d4f0',
      bg_app:         '#070910',
      text_primary:   '#eef2f8',
      text_secondary: '#8a9ab8',
      success:        '#10d090',
      warning:        '#f5a623',
      error:          '#f04060',
      info:           '#4d8ef0',
      scene_active:   '#f5a623',
      section_label:  '#4a5570',
    },
  };

  let _hass = null;
  let _currentMode = null; // 'day' or 'night'

  // ── Resolve current theme mode ────────────────────────────────────────────
  function resolveMode(hass) {
    const modeEntity = hass.states['input_select.theme_mode'];
    const mode = modeEntity ? modeEntity.state : 'Auto';
    if (mode === 'Day') return 'day';
    if (mode === 'Night') return 'night';
    // Auto: follow sun
    const sun = hass.states['sun.sun'];
    return (sun && sun.state === 'above_horizon') ? 'day' : 'night';
  }

  // ── Read colors from helpers, fallback to factory ─────────────────────────
  function readColors(hass, mode) {
    const colors = {};
    for (const entry of COLOR_MAP) {
      const entityId = `input_text.kis_${mode}_${entry.key}`;
      const entity = hass.states[entityId];
      if (entity && entity.state && entity.state !== 'unknown' && entity.state.startsWith('#')) {
        colors[entry.key] = entity.state;
      } else {
        colors[entry.key] = FACTORY[mode][entry.key];
      }
    }
    return colors;
  }

  // ── Apply colors as CSS variables on :root ────────────────────────────────
  function applyColors(colors) {
    const root = document.documentElement;
    for (const entry of COLOR_MAP) {
      root.style.setProperty(entry.css, colors[entry.key]);
    }
  }

  // ── Initialize helpers from factory defaults if missing ───────────────────
  async function initializeHelpersIfNeeded(hass) {
    for (const mode of ['day', 'night']) {
      for (const entry of COLOR_MAP) {
        const entityId = `input_text.kis_${mode}_${entry.key}`;
        const entity = hass.states[entityId];
        if (!entity || !entity.state || entity.state === 'unknown' || entity.state === '') {
          try {
            await hass.callService('input_text', 'set_value', {
              entity_id: entityId,
              value: FACTORY[mode][entry.key],
            });
          } catch (e) {
            // Helper may not exist yet (pre-restart); silent fail
          }
        }
      }
    }
  }

  // ── Main theme init ───────────────────────────────────────────────────────
  function initTheme(hass) {
    const mode = resolveMode(hass);
    const colors = readColors(hass, mode);
    applyColors(colors);
    _currentMode = mode;
  }

  // ── HA connection hook ────────────────────────────────────────────────────
  // Wait for the HA frontend to provide the hass object, then subscribe
  function connectToHA() {
    const doc = document;

    function tryConnect() {
      const haMain = doc.querySelector('home-assistant');
      if (!haMain || !haMain.hass) {
        requestAnimationFrame(tryConnect);
        return;
      }

      _hass = haMain.hass;

      // First-boot: seed helpers if needed
      initializeHelpersIfNeeded(_hass);

      // Apply current theme colors
      initTheme(_hass);

      // Watch for hass updates (theme mode, sun, helper changes)
      const origDescriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(haMain), 'hass'
      );
      let _hassValue = haMain.hass;

      Object.defineProperty(haMain, 'hass', {
        get() { return _hassValue; },
        set(newHass) {
          _hassValue = newHass;
          if (origDescriptor && origDescriptor.set) {
            origDescriptor.set.call(this, newHass);
          }
          _hass = newHass;
          onHassUpdate(newHass);
        },
        configurable: true,
      });
    }

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', tryConnect);
    } else {
      tryConnect();
    }
  }

  let _prevSun = null;
  let _prevThemeMode = null;

  function onHassUpdate(hass) {
    const sun = hass.states['sun.sun'];
    const themeMode = hass.states['input_select.theme_mode'];

    const sunState = sun ? sun.state : null;
    const tmState = themeMode ? themeMode.state : null;

    // Only re-apply if mode-relevant state changed
    if (sunState !== _prevSun || tmState !== _prevThemeMode) {
      _prevSun = sunState;
      _prevThemeMode = tmState;
      initTheme(hass);
    }

    // Check if any color helper changed (for live preview from settings)
    const newMode = resolveMode(hass);
    for (const entry of COLOR_MAP) {
      const entityId = `input_text.kis_${newMode}_${entry.key}`;
      const entity = hass.states[entityId];
      if (entity && entity.state && entity.state.startsWith('#')) {
        const current = document.documentElement.style.getPropertyValue(entry.css).trim();
        if (current !== entity.state) {
          applyColors(readColors(hass, newMode));
          break;
        }
      }
    }
  }

  // ── Expose for other cards ────────────────────────────────────────────────
  window.KIS_THEME = {
    getMode: () => _currentMode,
    getFactory: () => FACTORY,
    getColorMap: () => COLOR_MAP,
    reapply: () => { if (_hass) initTheme(_hass); },
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  connectToHA();

})();
