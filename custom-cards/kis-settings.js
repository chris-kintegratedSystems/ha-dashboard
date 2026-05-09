/**
 * KIS Settings — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Consolidated settings card: theme mode selector, kiosk toggle,
 * color picker placeholder (wired in Chunk 5), and about info.
 * Replaces v1's individual button-card Settings page controls.
 *
 * Depends on: kis-design-tokens.js (sizing/color constants)
 * Used by: kis-dashboard-v2.yaml (Settings view)
 */

import { KIS_TOKENS } from '/local/mobile_v2/kis-design-tokens.js';

const T = KIS_TOKENS;

const THEME_MODES = [
  { value: 'Auto', icon: 'mdi:theme-light-dark', desc: 'Follows sunrise / sunset' },
  { value: 'Day',  icon: 'mdi:weather-sunny',    desc: 'Always light theme' },
  { value: 'Night',icon: 'mdi:weather-night',     desc: 'Always dark theme' },
];

function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, {
    bubbles: true, composed: true, detail: detail || {},
  }));
}

class KisSettings extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._built = false;
  }

  setConfig(config) { this._config = config || {}; }
  static getStubConfig() { return {}; }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._built) { this._build(); this._built = true; return; }

    const tm = hass.states['input_select.theme_mode'];
    const ptm = prev?.states?.['input_select.theme_mode'];
    if (!ptm || tm?.state !== ptm.state) this._updateThemeMode(tm?.state);

    const km = hass.states['input_boolean.kiosk_mode'];
    const pkm = prev?.states?.['input_boolean.kiosk_mode'];
    if (!pkm || km?.state !== pkm.state) this._updateKiosk(km?.state);
  }

  _build() {
    const s = this.shadowRoot;
    const style = document.createElement('style');
    style.textContent = this._css();
    s.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'kis-settings';

    wrap.appendChild(this._sectionLabel('THEME'));
    wrap.appendChild(this._themeDesc());
    wrap.appendChild(this._themeBtns());

    wrap.appendChild(this._sectionLabel('DISPLAY'));
    wrap.appendChild(this._kioskRow());

    wrap.appendChild(this._sectionLabel('THEME COLORS'));
    wrap.appendChild(this._colorPlaceholder());

    wrap.appendChild(this._sectionLabel('ABOUT'));
    wrap.appendChild(this._aboutCard());

    s.appendChild(wrap);

    const tm = this._hass?.states?.['input_select.theme_mode'];
    this._updateThemeMode(tm?.state || 'Auto');
    const km = this._hass?.states?.['input_boolean.kiosk_mode'];
    this._updateKiosk(km?.state || 'on');
  }

  _sectionLabel(text) {
    const el = document.createElement('div');
    el.className = 'section-label';
    el.textContent = text;
    return el;
  }

  _themeDesc() {
    const el = document.createElement('div');
    el.className = 'card theme-desc-card';
    el.innerHTML = `
      <div class="card-title">Theme Mode</div>
      <div class="card-desc" id="theme-desc">Follows sunrise / sunset</div>
    `;
    return el;
  }

  _themeBtns() {
    const row = document.createElement('div');
    row.className = 'theme-row';
    for (const mode of THEME_MODES) {
      const btn = document.createElement('div');
      btn.className = 'theme-btn';
      btn.dataset.mode = mode.value;
      btn.innerHTML = `
        <ha-icon icon="${mode.icon}" style="--mdc-icon-size:${T.size.iconTheme};"></ha-icon>
        <span class="theme-btn-label">${mode.value}</span>
      `;
      btn.addEventListener('click', () => {
        if (!this._hass) return;
        fireEvent(this, 'haptic', 'light');
        this._hass.callService('input_select', 'select_option', {
          entity_id: 'input_select.theme_mode', option: mode.value,
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  _updateThemeMode(current) {
    const desc = this.shadowRoot.getElementById('theme-desc');
    if (desc) {
      const m = THEME_MODES.find(m => m.value === current) || THEME_MODES[0];
      desc.textContent = m.desc;
    }
    const btns = this.shadowRoot.querySelectorAll('.theme-btn');
    btns.forEach(btn => {
      const isActive = btn.dataset.mode === current;
      btn.classList.toggle('active', isActive);
    });
  }

  _kioskRow() {
    const card = document.createElement('div');
    card.className = 'card kiosk-card';
    card.innerHTML = `
      <div class="kiosk-left">
        <div class="card-title">Kiosk Mode</div>
        <div class="card-desc" id="kiosk-desc">HA header &amp; sidebar hidden</div>
      </div>
      <div class="toggle-track" id="kiosk-toggle">
        <div class="toggle-knob"></div>
      </div>
    `;
    card.querySelector('#kiosk-toggle').addEventListener('click', () => {
      if (!this._hass) return;
      fireEvent(this, 'haptic', 'light');
      this._hass.callService('input_boolean', 'toggle', {
        entity_id: 'input_boolean.kiosk_mode',
      });
    });
    return card;
  }

  _updateKiosk(state) {
    const isOn = state === 'on';
    const desc = this.shadowRoot.getElementById('kiosk-desc');
    if (desc) desc.textContent = isOn ? 'HA header & sidebar hidden' : 'HA header & sidebar visible';
    const track = this.shadowRoot.getElementById('kiosk-toggle');
    if (track) track.classList.toggle('on', isOn);
  }

  _colorPlaceholder() {
    const card = document.createElement('div');
    card.className = 'card color-placeholder';
    card.innerHTML = `
      <div class="card-desc" style="text-align:center;padding:16px 0;">
        Coming in a future update
      </div>
    `;
    return card;
  }

  _aboutCard() {
    const card = document.createElement('div');
    card.className = 'card about-card';
    const shellVer = window.KIS_APP_SHELL_VERSION || '—';
    const rows = [
      ['Dashboard', 'mobilev2'],
      ['App Shell', `v${shellVer}`],
      ['Navigation', '2 tabs'],
      ['Release Notes', 'Coming soon'],
    ];
    card.innerHTML = rows.map((r, i) => `
      <div class="about-row${i < rows.length - 1 ? ' about-row-border' : ''}">
        <span class="about-label">${r[0]}</span>
        <span class="about-value">${r[1]}</span>
      </div>
    `).join('');
    return card;
  }

  getCardSize() { return 8; }

  _css() {
    return `
      :host { display: block; }
      .kis-settings {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 600px;
        margin: 0 auto;
      }
      .section-label {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.navLabel};
        font-weight: ${T.fontWeight.semibold};
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--kis-section-label, ${T.night.sectionLabel});
        padding: 4px 2px;
        border-bottom: 1px solid var(--kis-section-rule, ${T.night.sectionRule});
        text-align: left;
        margin-top: 8px;
      }
      .section-label:first-child { margin-top: 0; }
      .card {
        padding: ${T.padding.card};
        border-radius: ${T.radius.card};
        background: var(--ha-card-background, ${T.night.bgCard});
        border: 1px solid var(--ha-card-border-color, ${T.night.borderCard});
      }
      .card-title {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.settingsTitle};
        font-weight: ${T.fontWeight.semibold};
        color: var(--primary-text-color, ${T.night.textPrimary});
      }
      .card-desc {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        color: var(--secondary-text-color, ${T.night.textSecondary});
        margin-top: 2px;
      }

      /* Theme selector */
      .theme-row {
        display: flex;
        gap: 8px;
      }
      .theme-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: ${T.padding.themeBtn};
        border-radius: ${T.radius.btn};
        background: var(--ha-card-background, ${T.night.bgCard});
        border: 1px solid var(--ha-card-border-color, ${T.night.borderCard});
        cursor: pointer;
        transition: background ${T.transition.medium}, border ${T.transition.medium};
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .theme-btn ha-icon {
        color: var(--secondary-text-color, ${T.night.textSecondary});
        transition: color ${T.transition.medium};
      }
      .theme-btn-label {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardLabel};
        font-weight: ${T.fontWeight.semibold};
        color: var(--secondary-text-color, ${T.night.textSecondary});
        transition: color ${T.transition.medium};
      }
      .theme-btn.active {
        background: var(--accent-color, ${T.night.accent});
        border-color: var(--accent-color, ${T.night.accent});
      }
      .theme-btn.active ha-icon,
      .theme-btn.active .theme-btn-label {
        color: #fff;
      }
      .theme-btn:active { opacity: 0.85; }

      /* Kiosk toggle */
      .kiosk-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
      }
      .toggle-track {
        position: relative;
        width: ${T.size.toggleTrackW};
        height: ${T.size.toggleTrackH};
        border-radius: ${T.radius.toggle};
        background: rgba(255,255,255,0.12);
        cursor: pointer;
        transition: background ${T.transition.medium};
        flex-shrink: 0;
      }
      .toggle-track.on {
        background: var(--accent-color, ${T.night.accent});
      }
      .toggle-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: ${T.size.toggleKnob};
        height: ${T.size.toggleKnob};
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        transition: transform ${T.transition.medium};
      }
      .toggle-track.on .toggle-knob {
        transform: translateX(18px);
      }

      /* Color placeholder */
      .color-placeholder {
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* About */
      .about-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
      }
      .about-row-border {
        border-bottom: 1px solid var(--divider-color, ${T.night.borderCard});
      }
      .about-label {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.settingsTitle};
        color: var(--primary-text-color, ${T.night.textPrimary});
      }
      .about-value {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        color: var(--secondary-text-color, ${T.night.textSecondary});
      }

      @media (max-width: 599px) {
        :host {
          max-width: min(100%, calc(55vh * 16 / 9));
          margin-left: auto;
          margin-right: auto;
        }
      }
    `;
  }
}

customElements.define('kis-settings', KisSettings);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'kis-settings',
  name: 'KIS Settings',
  description: 'Settings controls for KIS mobilev2',
});
