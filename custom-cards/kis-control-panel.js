/**
 * KIS Control Panel — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Consolidated security control panel: 3 door locks + 2 garage doors.
 * Single custom card replaces 5 individual button-card instances from v1.
 * Reads HA entity state directly, re-renders only changed rows.
 *
 * Depends on: kis-design-tokens.js (sizing/color constants)
 * Used by: kis-dashboard-v2.json (Home page, Security section)
 */

import { KIS_TOKENS, KIS_SECTION_LABEL_CSS } from '/local/mobile_v2/kis-design-tokens.js?v=2';

const LOCKS = [
  { entity: 'lock.front_door_lock', name: 'Front Door' },
  { entity: 'lock.back_door_lock', name: 'Back Door' },
  { entity: 'lock.gemelli_door', name: 'Gemelli Door' },
];

const GARAGES = [
  { entity: 'cover.ratgdov25i_1746c3_door', name: 'Left Garage' },
  { entity: 'cover.ratgdov25i_1746b4_door', name: 'Right Garage' },
];

const ALL_ENTITIES = [...LOCKS, ...GARAGES];

function getLockVisuals(state) {
  if (state === 'locked') return {
    icon: 'mdi:lock',
    accent: 'var(--success-color, #10d090)',
    pillBg: 'rgba(16,208,144,0.08)',
    pillBorder: 'rgba(16,208,144,0.35)',
    label: 'LOCKED',
    verb: 'Locked',
  };
  if (state === 'jammed') return {
    icon: 'mdi:lock-alert',
    accent: 'var(--error-color, #f04060)',
    pillBg: 'rgba(240,64,96,0.08)',
    pillBorder: 'rgba(240,64,96,0.35)',
    label: 'JAMMED',
    verb: 'Jammed',
  };
  return {
    icon: 'mdi:lock-open',
    accent: 'var(--warning-color, #f5a623)',
    pillBg: 'rgba(245,166,35,0.08)',
    pillBorder: 'rgba(245,166,35,0.35)',
    label: 'UNLOCKED',
    verb: 'Unlocked',
  };
}

function getGarageVisuals(state) {
  if (state === 'closed') return {
    icon: 'mdi:garage',
    accent: 'var(--success-color, #10d090)',
    pillBg: 'rgba(16,208,144,0.08)',
    pillBorder: 'rgba(16,208,144,0.35)',
    label: 'CLOSED',
    verb: 'Closed',
  };
  if (state === 'open') return {
    icon: 'mdi:garage-open',
    accent: 'var(--error-color, #f04060)',
    pillBg: 'rgba(240,64,96,0.08)',
    pillBorder: 'rgba(240,64,96,0.35)',
    label: 'OPEN',
    verb: 'Opened',
  };
  return {
    icon: state === 'opening' ? 'mdi:garage-open' : 'mdi:garage',
    accent: 'var(--warning-color, #f5a623)',
    pillBg: 'rgba(245,166,35,0.08)',
    pillBorder: 'rgba(245,166,35,0.35)',
    label: state.toUpperCase(),
    verb: state.charAt(0).toUpperCase() + state.slice(1),
  };
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, {
    bubbles: true, composed: true, detail: detail || {},
  }));
}

class KisControlPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._built = false;
    this._holdTimers = {};
    this._held = {};
  }

  connectedCallback() {
    if (window.KIS_REGISTER_CARD) window.KIS_REGISTER_CARD(this);
    this._ro = new ResizeObserver(() => {
      const cp = this.shadowRoot?.querySelector('.kis-cp');
      if (!cp) return;
      if (window.innerWidth >= 769) {
        cp.style.minHeight = '';
      } else {
        cp.style.minHeight = this.getBoundingClientRect().height + 'px';
      }
    });
    this._ro.observe(this);
  }
  disconnectedCallback() {
    if (window.KIS_UNREGISTER_CARD) window.KIS_UNREGISTER_CARD(this);
    this._ro?.disconnect();
  }

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

    for (const { entity } of ALL_ENTITIES) {
      const cur = hass.states[entity];
      const old = prev?.states?.[entity];
      if (!old || cur?.state !== old.state || cur?.last_changed !== old.last_changed) {
        this._updateRow(entity, cur);
      }
    }
  }

  _build() {
    const s = this.shadowRoot;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
        --cp-h: var(--kis-card-h, 80px);
        --cp-icon: clamp(14px, calc(var(--cp-h) * 0.35), 24px);
        --cp-chip-box: clamp(24px, calc(var(--cp-h) * 0.58), 40px);
        --cp-chip-r: clamp(6px, calc(var(--cp-h) * 0.14), 10px);
        --cp-pad-v: clamp(6px, calc(var(--cp-h) * 0.14), 12px);
        --cp-pad-h: clamp(8px, calc(var(--cp-h) * 0.17), 14px);
        --cp-name-fs: clamp(10px, calc(var(--cp-h) * 0.17), 14px);
        --cp-time-fs: clamp(7px, calc(var(--cp-h) * 0.14), 11px);
        --cp-pill-fs: clamp(8px, calc(var(--cp-h) * 0.13), 10px);
        --cp-pill-pv: calc(var(--cp-h) * 0.06);
        --cp-pill-ph: calc(var(--cp-h) * 0.13);
        --cp-pill-r: clamp(10px, calc(var(--cp-h) * 0.28), 20px);
      }
      .kis-cp {
        display: flex;
        flex-direction: column;
        gap: var(--kis-spacing-h, 8px);
        height: 100%;
        box-sizing: border-box;
      }
      ${KIS_SECTION_LABEL_CSS}
      .kis-section-label { margin-bottom: 0; }
      .row {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--cp-pad-v) var(--cp-pad-h);
        border-radius: ${KIS_TOKENS.radius.card};
        background: var(--ha-card-background, ${KIS_TOKENS.night.bgCard});
        border: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
        cursor: pointer;
        overflow: visible;
        min-height: var(--cp-h);
        transition: min-height 0.25s cubic-bezier(0.4,0,0.2,1);
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .row:active { opacity: 0.85; }
      .icon-wrap {
        position: absolute;
        left: var(--cp-pad-h);
        top: 50%;
        transform: translateY(-50%);
        width: var(--cp-chip-box);
        height: var(--cp-chip-box);
        border-radius: var(--cp-chip-r);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .center {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .name {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: var(--cp-name-fs);
        font-weight: ${KIS_TOKENS.fontWeight.medium};
        color: var(--kis-lights-room-count, ${KIS_TOKENS.night.lightsRoomCount});
      }
      .time {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: var(--cp-time-fs);
        color: var(--secondary-text-color, ${KIS_TOKENS.night.textSecondary});
      }
      .chip {
        position: absolute;
        right: var(--cp-pad-h);
        top: 50%;
        transform: translateY(-50%);
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: var(--cp-pill-fs);
        font-weight: ${KIS_TOKENS.fontWeight.bold};
        letter-spacing: ${KIS_TOKENS.letterSpacing.chip};
        text-transform: uppercase;
        padding: var(--cp-pill-pv) var(--cp-pill-ph);
        border-radius: var(--cp-pill-r);
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .garage-pair {
        display: flex;
        gap: var(--kis-spacing-h, 8px);
      }
      .garage-pair > .row {
        flex: 1;
        min-width: 0;
      }
      @media (min-width: 769px) {
        :host {
          contain: size;
        }
        .kis-cp {
          display: grid;
          grid-template-rows: auto 1fr 1fr 1fr auto 1fr;
        }
        .kis-cp > .row {
          min-height: 0;
          overflow: hidden;
          box-sizing: border-box;
          padding-top: 6px;
          padding-bottom: 6px;
          border-top: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
          border-bottom: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
          transition: none;
        }
        .kis-cp > .garage-pair {
          min-height: 0;
          overflow: hidden;
        }
        .kis-cp > .garage-pair > .row {
          box-sizing: border-box;
          height: 100%;
          min-height: 0;
          padding-top: 6px;
          padding-bottom: 6px;
          border-top: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
          border-bottom: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
        }
      }
      @media (max-width: 768px) {
        :host {
          height: auto;
          max-width: min(100%, calc(55vh * 16 / 9));
          margin-left: auto;
          margin-right: auto;
        }
        .kis-cp {
          height: auto;
        }
      }
      @media (max-width: 430px) {
        .garage-pair {
          flex-direction: column;
        }
        .garage-pair > .row {
          width: 100%;
        }
      }
    `;
    s.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'kis-cp';

    wrap.appendChild(this._label('LOCKS'));
    for (const l of LOCKS) wrap.appendChild(this._row(l.entity, l.name, 'lock'));

    wrap.appendChild(this._label('GARAGE'));
    const pair = document.createElement('div');
    pair.className = 'garage-pair';
    for (const g of GARAGES) pair.appendChild(this._row(g.entity, g.name, 'cover'));
    wrap.appendChild(pair);

    s.appendChild(wrap);

    for (const { entity } of ALL_ENTITIES) {
      const isLock = LOCKS.some(l => l.entity === entity);
      this._updateRow(entity, this._hass?.states?.[entity]);
    }
  }

  _label(text) {
    const el = document.createElement('div');
    el.className = 'kis-section-label';
    el.textContent = text;
    return el;
  }

  _row(entityId, name, domain) {
    const el = document.createElement('div');
    el.className = 'row';
    el.dataset.entity = entityId;

    el.innerHTML = `
      <div class="icon-wrap"><ha-icon class="ic"></ha-icon></div>
      <div class="center">
        <div class="name">${name}</div>
        <div class="time"></div>
      </div>
      <div class="chip"></div>
    `;

    el.addEventListener('pointerdown', () => {
      this._held[entityId] = false;
      this._holdTimers[entityId] = setTimeout(() => {
        this._held[entityId] = true;
        fireEvent(this, 'haptic', 'medium');
        fireEvent(this, 'hass-more-info', { entityId });
      }, 500);
    });
    el.addEventListener('pointerup', () => {
      clearTimeout(this._holdTimers[entityId]);
      if (!this._held[entityId]) this._tap(entityId, domain);
    });
    el.addEventListener('pointercancel', () => {
      clearTimeout(this._holdTimers[entityId]);
      this._held[entityId] = false;
    });
    el.addEventListener('contextmenu', e => e.preventDefault());

    return el;
  }

  _updateRow(entityId, stateObj) {
    const el = this.shadowRoot.querySelector(`[data-entity="${entityId}"]`);
    if (!el || !stateObj) return;

    const isLock = LOCKS.some(l => l.entity === entityId);
    const vis = isLock ? getLockVisuals(stateObj.state) : getGarageVisuals(stateObj.state);
    const time = formatTime(stateObj.last_changed);

    const ic = el.querySelector('.ic');
    ic.setAttribute('icon', vis.icon);
    ic.style.setProperty('--mdc-icon-size', 'var(--cp-icon)');
    ic.style.color = vis.accent;

    el.querySelector('.time').textContent = `${vis.verb} at ${time}`;

    const chip = el.querySelector('.chip');
    chip.textContent = vis.label;
    chip.style.color = vis.accent;
    chip.style.background = vis.pillBg;
    chip.style.borderColor = vis.pillBorder;

    el.style.boxShadow = `inset 3px 0 0 ${vis.accent}`;
  }

  _tap(entityId, domain) {
    if (!this._hass) return;
    fireEvent(this, 'haptic', 'light');
    if (domain === 'lock') {
      const svc = this._hass.states[entityId]?.state === 'locked' ? 'unlock' : 'lock';
      this._hass.callService('lock', svc, { entity_id: entityId });
    } else {
      this._hass.callService('cover', 'toggle', { entity_id: entityId });
    }
  }

  getCardSize() {
    return 6;
  }
}

customElements.define('kis-control-panel', KisControlPanel);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'kis-control-panel',
  name: 'KIS Control Panel',
  description: 'Locks + Garage consolidated control panel for KIS mobilev2',
});
