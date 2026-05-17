/**
 * KIS Scenes — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Consolidated scene buttons: 6 scenes in a responsive grid.
 * Single custom card replaces individual button-card scene instances from v1.
 * Reads last_triggered from each script entity to show active-state glow.
 * Active = triggered within last 60 minutes; multiple can be active simultaneously.
 *
 * Depends on: kis-design-tokens.js (sizing/color constants)
 * Used by: kis-dashboard-v2.json (Home page, Scenes section)
 */

import { KIS_TOKENS, KIS_SECTION_LABEL_CSS } from '/local/mobile_v2/kis-design-tokens.js?v=3';

const SCENES = [
  { entity: 'script.scene_good_morning',  name: 'Morning', icon: 'mdi:white-balance-sunny',   color: '#f5a623' },
  { entity: 'script.scene_good_night',    name: 'Night',   icon: 'mdi:moon-waning-crescent',  color: '#9d6ef0' },
  { entity: 'script.scene_away_mode',     name: 'Away',    icon: 'mdi:home-export-outline',   color: '#00d4f0' },
  { entity: 'script.scene_welcome_home',  name: 'Welcome', icon: 'mdi:home-import-outline',   color: '#10d090' },
  { entity: 'script.scene_movie_time',    name: 'Movie',   icon: 'mdi:television-play',       color: '#4d8ef0' },
  { entity: 'script.scene_dinner_time',   name: 'Dinner',  icon: 'mdi:silverware-fork-knife', color: '#f04060' },
];

const ACTIVE_WINDOW_MS = 3600000;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isActive(stateObj) {
  const lt = stateObj?.attributes?.last_triggered;
  if (!lt) return false;
  return (Date.now() - new Date(lt).getTime()) < ACTIVE_WINDOW_MS;
}

function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, {
    bubbles: true, composed: true, detail: detail || {},
  }));
}

class KisScenes extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._built = false;
  }

  connectedCallback() { if (window.KIS_REGISTER_CARD) window.KIS_REGISTER_CARD(this); }
  disconnectedCallback() { if (window.KIS_UNREGISTER_CARD) window.KIS_UNREGISTER_CARD(this); }

  setConfig(config) {
    this._config = config || {};
  }

  static getStubConfig() {
    return {};
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;

    if (!this._built) {
      this._build();
      this._built = true;
      return;
    }

    for (const scene of SCENES) {
      const id = scene.entity;
      const cur = hass.states[id];
      const old = prev?.states?.[id];
      const curLT = cur?.attributes?.last_triggered;
      const oldLT = old?.attributes?.last_triggered;
      if (!old || cur?.state !== old.state || curLT !== oldLT) {
        this._updateBtn(scene, cur);
      }
    }
  }

  _build() {
    const s = this.shadowRoot;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        box-sizing: border-box;
        --sc-h: var(--kis-scene-h, 64px);
        --sc-icon: clamp(14px, calc(var(--sc-h) * 0.30), 24px);
        --sc-icon-box: clamp(24px, calc(var(--sc-h) * 0.50), 36px);
        --sc-icon-r: clamp(6px, calc(var(--sc-h) * 0.14), 10px);
      }
      ${KIS_SECTION_LABEL_CSS}
      .scene-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--kis-spacing-h, ${KIS_TOKENS.gap.scene});
        align-items: start;
      }
      .scene-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 8px 8px 6px;
        border-radius: ${KIS_TOKENS.radius.card};
        background: var(--ha-card-background, ${KIS_TOKENS.night.bgCardSolid});
        border: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
        cursor: pointer;
        height: var(--sc-h);
        transition: border 0.2s ease, box-shadow 0.2s ease, min-height 0.25s cubic-bezier(0.4,0,0.2,1);
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .scene-btn:active { opacity: 0.85; }
      .scene-btn.active {
        border-width: 2px;
      }
      .icon-circle {
        width: var(--sc-icon-box);
        height: var(--sc-icon-box);
        border-radius: var(--sc-icon-r);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .scene-name {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: ${KIS_TOKENS.fontSize.sectionLabel};
        font-weight: ${KIS_TOKENS.fontWeight.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--kis-lights-room-count, ${KIS_TOKENS.night.lightsRoomCount});
        margin-top: 8px;
      }
      @media (max-width: 599px) {
        :host {
          max-width: min(100%, calc(55vh * 16 / 9));
          margin-left: auto;
          margin-right: auto;
        }
        .scene-grid {
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
        }
      }
    `;
    s.appendChild(style);

    if (this._config.title) {
      const label = document.createElement('div');
      label.className = 'kis-section-label';
      label.textContent = this._config.title;
      s.appendChild(label);
    }

    const grid = document.createElement('div');
    grid.className = 'scene-grid';

    for (const scene of SCENES) {
      const btn = document.createElement('div');
      btn.className = 'scene-btn';
      btn.dataset.entity = scene.entity;

      const circle = document.createElement('div');
      circle.className = 'icon-circle';
      circle.style.background = hexToRgba(scene.color, 0.22);

      const icon = document.createElement('ha-icon');
      icon.setAttribute('icon', scene.icon);
      icon.style.setProperty('--mdc-icon-size', 'var(--sc-icon)');
      icon.style.color = scene.color;

      circle.appendChild(icon);
      btn.appendChild(circle);

      const name = document.createElement('div');
      name.className = 'scene-name';
      name.textContent = scene.name;
      btn.appendChild(name);

      btn.addEventListener('click', () => this._tap(scene.entity));

      grid.appendChild(btn);
    }

    s.appendChild(grid);

    for (const scene of SCENES) {
      this._updateBtn(scene, this._hass?.states?.[scene.entity]);
    }
  }

  _updateBtn(scene, stateObj) {
    const btn = this.shadowRoot.querySelector(`[data-entity="${scene.entity}"]`);
    if (!btn) return;

    const active = isActive(stateObj);

    if (active) {
      btn.classList.add('active');
      btn.style.borderColor = scene.color;
      btn.style.boxShadow = `0 0 14px ${hexToRgba(scene.color, 0.45)}`;
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
    }
  }

  _tap(entityId) {
    if (!this._hass) return;
    fireEvent(this, 'haptic', 'light');
    this._hass.callService('script', 'turn_on', { entity_id: entityId });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define('kis-scenes', KisScenes);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'kis-scenes',
  name: 'KIS Scenes',
  description: 'Scene buttons grid for KIS mobilev2',
});
