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

import { KIS_TOKENS, KIS_SECTION_LABEL_CSS } from '/local/mobile_v2/kis-design-tokens.js?v=2';

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

  connectedCallback() { if (window.KIS_REGISTER_CARD) window.KIS_REGISTER_CARD(this); }
  disconnectedCallback() { if (window.KIS_UNREGISTER_CARD) window.KIS_UNREGISTER_CARD(this); }

  setConfig(config) { this._config = config || {}; }
  static getStubConfig() { return {}; }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._built) { this._build(); this._built = true; return; }

    const tm = hass.states['input_select.theme_mode'];
    const ptm = prev?.states?.['input_select.theme_mode'];
    if (!ptm || tm?.state !== ptm.state) {
      this._updateThemeMode(tm?.state);
      this._rebuildColorPicker();
    }

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
    wrap.appendChild(this._colorPicker());

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
    el.className = 'kis-section-label';
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

  _colorPicker() {
    const wrap = document.createElement('div');
    wrap.className = 'color-picker-wrap';
    wrap.id = 'color-picker-wrap';

    const themeInfo = window.KIS_THEME || {};
    const factory = themeInfo.getFactory ? themeInfo.getFactory() : null;
    const colorMap = themeInfo.getColorMap ? themeInfo.getColorMap() : [];

    if (!factory || colorMap.length === 0) {
      wrap.innerHTML = `<div class="card color-placeholder"><div class="card-desc" style="text-align:center;padding:16px 0;">Theme system loading...</div></div>`;
      return wrap;
    }

    const mode = this._getActiveMode();
    const colors = factory[mode] || factory.night;

    const LABELS = {
      primary_accent: 'Primary Accent',
      bg_app: 'Background',
      text_primary: 'Primary Text',
      text_secondary: 'Secondary Text',
      success: 'Locked / Closed',
      warning: 'Unlocked / Warning',
      error: 'Error / Alert',
      info: 'Info (Blue)',
      scene_active: 'Scene Active',
      section_label: 'Section Label',
    };

    // Preview strip
    const preview = document.createElement('div');
    preview.className = 'card color-preview';
    preview.id = 'color-preview';
    wrap.appendChild(preview);

    // Color rows
    const grid = document.createElement('div');
    grid.className = 'card color-grid';
    for (const entry of colorMap) {
      const entityId = `input_text.kis_${mode}_${entry.key}`;
      const entity = this._hass?.states?.[entityId];
      const currentVal = (entity && entity.state && entity.state.startsWith('#'))
        ? entity.state
        : colors[entry.key];

      const row = document.createElement('div');
      row.className = 'color-row';
      row.innerHTML = `
        <label class="color-label">${LABELS[entry.key] || entry.key}</label>
        <div class="color-input-wrap">
          <input type="color" class="color-input" data-key="${entry.key}" value="${currentVal}" />
          <span class="color-hex" data-key="${entry.key}">${currentVal}</span>
        </div>
      `;
      const input = row.querySelector('input[type="color"]');
      const hex = row.querySelector('.color-hex');
      input.addEventListener('input', () => {
        hex.textContent = input.value;
        this._updatePreview();
        this._checkContrast();
      });
      grid.appendChild(row);
    }
    wrap.appendChild(grid);

    // Contrast indicator
    const contrast = document.createElement('div');
    contrast.className = 'card contrast-row';
    contrast.id = 'contrast-row';
    wrap.appendChild(contrast);

    // Save + Reset buttons
    const actions = document.createElement('div');
    actions.className = 'color-actions';
    actions.innerHTML = `
      <button class="color-btn reset-btn" id="color-reset">Reset to defaults</button>
      <button class="color-btn save-btn" id="color-save">Save</button>
    `;
    wrap.appendChild(actions);

    setTimeout(() => {
      this._updatePreview();
      this._checkContrast();

      const saveBtn = this.shadowRoot.getElementById('color-save');
      const resetBtn = this.shadowRoot.getElementById('color-reset');
      if (saveBtn) saveBtn.addEventListener('click', () => this._saveColors());
      if (resetBtn) resetBtn.addEventListener('click', () => this._resetColors());
    }, 0);

    return wrap;
  }

  _getActiveMode() {
    const tm = this._hass?.states?.['input_select.theme_mode'];
    const mode = tm ? tm.state : 'Auto';
    if (mode === 'Day') return 'day';
    if (mode === 'Night') return 'night';
    const sun = this._hass?.states?.['sun.sun'];
    return (sun && sun.state === 'above_horizon') ? 'day' : 'night';
  }

  _updatePreview() {
    const preview = this.shadowRoot.getElementById('color-preview');
    if (!preview) return;
    const inputs = this.shadowRoot.querySelectorAll('.color-input');
    const vals = {};
    inputs.forEach(i => { vals[i.dataset.key] = i.value; });

    const bg = vals.bg_app || '#070910';
    const text = vals.text_primary || '#eef2f8';
    const secondary = vals.text_secondary || '#8a9ab8';
    const accent = vals.primary_accent || '#00d4f0';

    preview.innerHTML = `
      <div class="preview-strip" style="background:${bg};border-radius:10px;padding:14px 16px;">
        <div style="color:${text};font-size:14px;font-weight:600;margin-bottom:4px;">Preview Text</div>
        <div style="color:${secondary};font-size:12px;margin-bottom:8px;">Secondary text sample</div>
        <div style="display:flex;gap:6px;">
          <span class="preview-chip" style="background:${accent};color:#fff;">Accent</span>
          <span class="preview-chip" style="background:${vals.success || '#10d090'};color:#fff;">Locked</span>
          <span class="preview-chip" style="background:${vals.error || '#f04060'};color:#fff;">Alert</span>
        </div>
      </div>
    `;
  }

  _checkContrast() {
    const row = this.shadowRoot.getElementById('contrast-row');
    const saveBtn = this.shadowRoot.getElementById('color-save');
    if (!row) return;

    const inputs = this.shadowRoot.querySelectorAll('.color-input');
    const vals = {};
    inputs.forEach(i => { vals[i.dataset.key] = i.value; });

    const bg = vals.bg_app || '#070910';
    const text = vals.text_primary || '#eef2f8';
    const ratio = this._contrastRatio(bg, text);
    const pass = ratio >= 4.5;

    row.innerHTML = `
      <span class="contrast-label">Text / Background Contrast</span>
      <span class="contrast-value ${pass ? 'pass' : 'fail'}">${ratio.toFixed(1)}:1 ${pass ? 'OK' : 'FAIL'}</span>
    `;

    if (saveBtn) {
      saveBtn.disabled = !pass;
      saveBtn.classList.toggle('disabled', !pass);
    }
  }

  _contrastRatio(hex1, hex2) {
    const l1 = this._luminance(hex1);
    const l2 = this._luminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  _luminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  async _saveColors() {
    if (!this._hass) return;
    const mode = this._getActiveMode();
    const inputs = this.shadowRoot.querySelectorAll('.color-input');
    fireEvent(this, 'haptic', 'success');

    for (const input of inputs) {
      const entityId = `input_text.kis_${mode}_${input.dataset.key}`;
      try {
        await this._hass.callService('input_text', 'set_value', {
          entity_id: entityId,
          value: input.value,
        });
      } catch (e) {
        // ignore if helper doesn't exist yet
      }
    }
  }

  _resetColors() {
    const themeInfo = window.KIS_THEME || {};
    const factory = themeInfo.getFactory ? themeInfo.getFactory() : null;
    if (!factory) return;
    const mode = this._getActiveMode();
    const defaults = factory[mode];
    if (!defaults) return;

    fireEvent(this, 'haptic', 'light');
    const inputs = this.shadowRoot.querySelectorAll('.color-input');
    inputs.forEach(input => {
      const def = defaults[input.dataset.key];
      if (def) {
        input.value = def;
        const hex = this.shadowRoot.querySelector(`.color-hex[data-key="${input.dataset.key}"]`);
        if (hex) hex.textContent = def;
      }
    });
    this._updatePreview();
    this._checkContrast();
  }

  _rebuildColorPicker() {
    const oldWrap = this.shadowRoot.getElementById('color-picker-wrap');
    if (!oldWrap) return;
    const newWrap = this._colorPicker();
    oldWrap.replaceWith(newWrap);
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
      ${KIS_SECTION_LABEL_CSS}
      .kis-section-label { margin-top: 8px; }
      .kis-section-label:first-child { margin-top: 0; }
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

      /* Color picker */
      .color-placeholder {
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .color-picker-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .color-preview {
        padding: 0;
        overflow: hidden;
      }
      .preview-strip {
        border: 1px solid var(--ha-card-border-color, ${T.night.borderCard});
      }
      .preview-chip {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        font-family: ${T.fontFamily};
      }
      .color-grid {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .color-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-bottom: 1px solid var(--divider-color, ${T.night.borderCard});
      }
      .color-row:last-child { border-bottom: none; }
      .color-label {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        color: var(--primary-text-color, ${T.night.textPrimary});
      }
      .color-input-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .color-input {
        -webkit-appearance: none;
        appearance: none;
        width: 32px;
        height: 32px;
        border: 2px solid var(--ha-card-border-color, ${T.night.borderCard});
        border-radius: 8px;
        cursor: pointer;
        padding: 0;
        background: none;
      }
      .color-input::-webkit-color-swatch-wrapper { padding: 2px; }
      .color-input::-webkit-color-swatch { border: none; border-radius: 4px; }
      .color-hex {
        font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
        font-size: 11px;
        color: var(--secondary-text-color, ${T.night.textSecondary});
        min-width: 60px;
      }
      .contrast-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
      }
      .contrast-label {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        color: var(--primary-text-color, ${T.night.textPrimary});
      }
      .contrast-value {
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        font-weight: ${T.fontWeight.semibold};
      }
      .contrast-value.pass { color: var(--success-color, ${T.night.green}); }
      .contrast-value.fail { color: var(--error-color, ${T.night.red}); }
      .color-actions {
        display: flex;
        gap: 8px;
      }
      .color-btn {
        flex: 1;
        padding: 12px;
        border-radius: ${T.radius.btn};
        font-family: ${T.fontFamily};
        font-size: ${T.fontSize.cardValue};
        font-weight: ${T.fontWeight.semibold};
        border: none;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: opacity ${T.transition.medium};
      }
      .color-btn:active { opacity: 0.8; }
      .reset-btn {
        background: var(--ha-card-background, ${T.night.bgCard});
        color: var(--primary-text-color, ${T.night.textPrimary});
        border: 1px solid var(--ha-card-border-color, ${T.night.borderCard});
      }
      .save-btn {
        background: var(--accent-color, ${T.night.accent});
        color: #fff;
      }
      .save-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
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
