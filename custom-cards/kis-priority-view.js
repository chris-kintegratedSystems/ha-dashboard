/**
 * KIS Priority View — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Unified priority display: carousel of 10 items (5 cameras + 3 vehicles +
 * Weather + Radar) with camera motion override. Default state: manual swipe
 * through 5 non-camera items. Camera motion auto-takes-over with 2-min
 * sticky-on. User can swipe past camera to return to default.
 *
 * Section label is dynamic — matches current item literally.
 * Carousel items configured as data array — easy to add/edit/reorder.
 *
 * Depends on: kis-design-tokens.js
 * Used by: kis-dashboard-v2.yaml (Home view, right column)
 */

import { KIS_TOKENS } from '/local/mobile_v2/kis-design-tokens.js';

// ── Carousel item configuration ──────────────────────────────────────────────
const CAMERAS = [
  {
    id: 'doorbell',
    label: 'FRONT DOOR',
    entity: 'camera.doorbell',
    motion_sensor: 'binary_sensor.doorbell_person_occupancy',
    priority: 100,
    border_color: KIS_TOKENS.night.stateError || '#f04060',
    glow_rgba: 'rgba(240,64,96,0.35)',
    popup_elements: ['cam_close', 'cam_lock_front_door', 'cam_ctrl_mic', 'cam_ctrl_speaker'],
  },
  {
    id: 'living_room',
    label: 'LIVING ROOM',
    entity: 'camera.nest_cam_1',
    motion_sensor: 'binary_sensor.nest_cam_1_person_occupancy',
    priority: 80,
    border_color: KIS_TOKENS.night.accent || '#00d4f0',
    glow_rgba: 'rgba(0,212,240,0.25)',
    popup_elements: ['cam_close', 'cam_ctrl_mic', 'cam_ctrl_speaker'],
  },
  {
    id: 'bens_room',
    label: "BEN'S ROOM",
    entity: 'camera.nest_cam_2',
    motion_sensor: 'binary_sensor.nest_cam_2_person_occupancy',
    priority: 60,
    border_color: KIS_TOKENS.night.accent || '#00d4f0',
    glow_rgba: 'rgba(0,212,240,0.25)',
    popup_elements: ['cam_close', 'cam_ctrl_mic', 'cam_ctrl_speaker'],
  },
  {
    id: 'nanit_benjamin',
    label: 'NANIT BENJAMIN',
    entity: 'camera.nanit_benjamin',
    motion_sensor: 'binary_sensor.nanit_benjamin_person_occupancy',
    priority: 40,
    border_color: KIS_TOKENS.night.accent || '#00d4f0',
    glow_rgba: 'rgba(0,212,240,0.25)',
    popup_elements: ['cam_close', 'cam_ctrl_mic', 'cam_ctrl_speaker'],
  },
  {
    id: 'nanit_travel',
    label: 'NANIT TRAVEL',
    entity: 'camera.nanit_travel',
    motion_sensor: 'binary_sensor.nanit_travel_person_occupancy',
    priority: 20,
    border_color: KIS_TOKENS.night.accent || '#00d4f0',
    glow_rgba: 'rgba(0,212,240,0.25)',
    popup_elements: ['cam_close', 'cam_ctrl_mic', 'cam_ctrl_speaker'],
  },
];

const DEFAULT_ITEMS = [
  {
    type: 'vehicle',
    id: 'porsche_911',
    label: 'PORSCHE 911',
    icon: 'mdi:car-sports',
    icon_color: '#10d090',
    subtitle: 'Setup Required',
    entity: null,
  },
  {
    type: 'vehicle',
    id: 'tesla_model_y',
    label: 'TESLA MODEL Y',
    icon: 'mdi:car-electric',
    icon_color: '#e81c24',
    entity: 'sensor.tesla_battery_level',
    range_entity: 'sensor.tesla_range',
  },
  {
    type: 'vehicle',
    id: 'mercedes_g580',
    label: 'MERCEDES G580',
    icon: 'mdi:car-estate',
    icon_color: '#00d4f0',
    subtitle: 'Setup Required',
    entity: null,
  },
  {
    type: 'weather',
    id: 'weather',
    label: 'WEATHER',
    entity: 'weather.forecast_home',
  },
  {
    type: 'weather_radar',
    id: 'weather_radar',
    label: 'WEATHER RADAR',
  },
];

const PRIORITY_SENSOR = 'sensor.priority_camera';
const STICKY_DURATION_MS = 120000; // 2-minute client-side sticky-on
const SWIPE_THRESHOLD = 40; // px minimum to register a swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms

const WX_ICON_MAP = {
  'sunny': 'mdi:weather-sunny',
  'clear-night': 'mdi:weather-night',
  'cloudy': 'mdi:weather-cloudy',
  'partlycloudy': 'mdi:weather-partly-cloudy',
  'rainy': 'mdi:weather-pouring',
  'pouring': 'mdi:weather-pouring',
  'snowy': 'mdi:weather-snowy',
  'fog': 'mdi:weather-fog',
  'windy': 'mdi:weather-windy',
  'lightning': 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy',
  'hail': 'mdi:weather-hail',
};

const WX_COLOR_MAP = {
  'sunny': '#f5a623',
  'clear-night': '#9d6ef0',
  'cloudy': '#8a9ab8',
  'partlycloudy': '#8a9ab8',
  'rainy': '#4d8ef0',
  'pouring': '#4d8ef0',
  'snowy': '#e0e8f0',
  'fog': '#8a9ab8',
  'windy': '#8a9ab8',
  'lightning': '#f5a623',
  'lightning-rainy': '#f5a623',
  'hail': '#8a9ab8',
};

class KisPriorityView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._built = false;

    // State machine
    this._mode = 'default'; // 'default' | 'motion' | 'sticky'
    this._defaultIndex = 0;
    this._activeCameraId = null;
    this._stickyTimer = null;
    this._swipeAwayCooldown = {};

    // Touch tracking
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._isSwiping = false;
    this._currentTranslate = 0;

    // DOM refs
    this._labelEl = null;
    this._sliderEl = null;
    this._viewportEl = null;
    this._dotsEl = null;
    this._slides = [];

    // Radar card ref
    this._radarCard = null;
    this._radarPatched = false;

    // Camera element cache for hass propagation
    this._cameraElements = new Map();

    // Dots auto-fade timer
    this._dotsFadeTimer = null;
  }

  connectedCallback() { if (window.KIS_REGISTER_CARD) window.KIS_REGISTER_CARD(this); }
  disconnectedCallback() { if (window.KIS_UNREGISTER_CARD) window.KIS_UNREGISTER_CARD(this); }

  setConfig(config) {
    this._config = config || {};
  }

  static getStubConfig() {
    return {};
  }

  getCardSize() {
    return 8;
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;

    if (!this._built) {
      this._build();
      this._built = true;
    }

    for (const el of this._cameraElements.values()) {
      el.hass = hass;
    }

    this._updatePriorityState(prev);
    this._updateSlideContent();
    this._patchRadarCard();
  }

  // ── Priority state machine ──────────────────────────────────────────────────
  _updatePriorityState(prevHass) {
    if (!this._hass) return;
    const ps = this._hass.states[PRIORITY_SENSOR];
    const camKey = ps ? ps.state : 'none';
    const prevPs = prevHass?.states?.[PRIORITY_SENSOR];
    const prevKey = prevPs ? prevPs.state : 'none';

    const camDef = CAMERAS.find(c => c.id === camKey);

    if (camDef) {
      // Camera is active
      if (this._mode === 'default' || this._activeCameraId !== camKey) {
        // Check swipe-away cooldown
        const cooldownUntil = this._swipeAwayCooldown[camKey] || 0;
        if (Date.now() < cooldownUntil) {
          return;
        }
        this._clearStickyTimer();
        this._mode = 'motion';
        this._activeCameraId = camKey;
        this._renderCurrentView();
      }
    } else if (camKey === 'none' && this._activeCameraId) {
      // Camera cleared — start sticky timer if in motion mode
      if (this._mode === 'motion') {
        this._mode = 'sticky';
        this._clearStickyTimer();
        this._stickyTimer = setTimeout(() => {
          this._mode = 'default';
          this._activeCameraId = null;
          this._renderCurrentView();
        }, STICKY_DURATION_MS);
        this._renderCurrentView();
      }
    }

    // If sensor changed from a camera to 'none' while already in sticky, keep sticky
    // If sensor changed from 'none' to 'none', no-op
  }

  _clearStickyTimer() {
    if (this._stickyTimer) {
      clearTimeout(this._stickyTimer);
      this._stickyTimer = null;
    }
  }

  _exitMotionMode() {
    // User swiped past camera — revert to default carousel
    if (this._activeCameraId) {
      this._swipeAwayCooldown[this._activeCameraId] = Date.now() + STICKY_DURATION_MS;
    }
    this._clearStickyTimer();
    this._mode = 'default';
    this._activeCameraId = null;
    this._renderCurrentView();
  }

  // ── Build ───────────────────────────────────────────────────────────────────
  _build() {
    const s = this.shadowRoot;

    const style = document.createElement('style');
    style.textContent = this._getCSS();
    s.appendChild(style);

    // Section label
    this._labelEl = document.createElement('div');
    this._labelEl.className = 'section-label';
    s.appendChild(this._labelEl);

    // Carousel viewport
    this._viewportEl = document.createElement('div');
    this._viewportEl.className = 'carousel-viewport';

    this._sliderEl = document.createElement('div');
    this._sliderEl.className = 'carousel-slider';
    this._viewportEl.appendChild(this._sliderEl);

    this._dotsEl = document.createElement('div');
    this._dotsEl.className = 'dots';
    this._viewportEl.appendChild(this._dotsEl);

    s.appendChild(this._viewportEl);

    // Touch handlers on viewport
    this._viewportEl.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: true });
    this._viewportEl.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    this._viewportEl.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: true });

    this._renderCurrentView();
  }

  async _renderCurrentView() {
    if (!this._sliderEl) return;

    if (this._mode === 'motion' || this._mode === 'sticky') {
      await this._renderCameraView();
    } else {
      this._renderDefaultCarousel();
    }

    this._updateLabel();
    this._updateDots();
  }

  async _renderCameraView() {
    const cam = CAMERAS.find(c => c.id === this._activeCameraId);
    if (!cam) return;

    this._sliderEl.innerHTML = '';
    this._slides = [];

    const slide = await this._createCameraSlide(cam);
    this._sliderEl.appendChild(slide);
    this._slides.push(slide);

    this._sliderEl.style.transform = 'translateX(0)';
    this._sliderEl.style.transition = 'none';

    this._viewportEl.style.border = `2px solid ${cam.border_color}`;
    this._viewportEl.style.boxShadow = `0 0 12px ${cam.glow_rgba}`;
  }

  _renderDefaultCarousel() {
    this._sliderEl.innerHTML = '';
    this._slides = [];
    this._radarCard = null;
    this._radarPatched = false;

    // Clear camera border
    this._viewportEl.style.border = '1px solid var(--ha-card-border-color, rgba(255,255,255,0.06))';
    this._viewportEl.style.boxShadow = 'none';

    for (const item of DEFAULT_ITEMS) {
      const slide = this._createDefaultSlide(item);
      this._sliderEl.appendChild(slide);
      this._slides.push(slide);
    }

    // Clamp index
    if (this._defaultIndex >= DEFAULT_ITEMS.length) this._defaultIndex = 0;
    this._goToSlide(this._defaultIndex, false);
  }

  // ── Slide creation ──────────────────────────────────────────────────────────
  async _createCameraSlide(cam) {
    const slide = document.createElement('div');
    slide.className = 'slide camera-slide';
    slide.dataset.camId = cam.id;

    const camConfig = {
      type: 'picture-entity',
      entity: cam.entity,
      camera_image: cam.entity,
      camera_view: 'auto',
      show_state: false,
      show_name: false,
      aspect_ratio: '16:9',
      tap_action: { action: 'none' },
    };

    try {
      const helpers = await window.loadCardHelpers();
      const pe = await helpers.createCardElement(camConfig);
      pe.hass = this._hass;
      this._cameraElements.set(cam.id, pe);
      slide.appendChild(pe);
    } catch (e) {
      const fallback = document.createElement('div');
      fallback.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8a9ab8;font-size:12px;';
      fallback.textContent = 'Camera unavailable';
      slide.appendChild(fallback);
    }

    slide.addEventListener('click', () => this._openCameraPopup(cam));

    return slide;
  }

  _createDefaultSlide(item) {
    const slide = document.createElement('div');
    slide.className = 'slide default-slide';
    slide.dataset.itemId = item.id;

    if (item.type === 'vehicle') {
      slide.innerHTML = this._renderVehicleContent(item);
    } else if (item.type === 'weather') {
      slide.innerHTML = this._renderWeatherContent(item);
    } else if (item.type === 'weather_radar') {
      slide.appendChild(this._createRadarCard());
    }

    // Tap: open more-info for entities that have one
    if (item.entity) {
      slide.addEventListener('click', () => {
        const ha = document.querySelector('home-assistant');
        if (ha) {
          ha.dispatchEvent(new CustomEvent('hass-more-info', {
            bubbles: true, composed: true,
            detail: { entityId: item.entity },
          }));
        }
      });
      slide.style.cursor = 'pointer';
    }

    return slide;
  }

  _renderVehicleContent(item) {
    let subtitle = item.subtitle || 'Setup Required';
    if (item.id === 'tesla_model_y' && this._hass) {
      const bat = this._hass.states[item.entity];
      const range = this._hass.states[item.range_entity];
      if (bat) {
        subtitle = bat.state + '%';
        if (range) subtitle += ' · ' + Math.round(parseFloat(range.state)) + ' mi';
      }
    }

    return `
      <div class="vehicle-content">
        <ha-icon icon="${item.icon}" style="--mdc-icon-size: 56px; color: ${item.icon_color};"></ha-icon>
        <div class="vehicle-name">${item.label.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</div>
        <div class="vehicle-subtitle">${subtitle}</div>
      </div>
    `;
  }

  _renderWeatherContent() {
    if (!this._hass) return '<div class="vehicle-content"><div class="vehicle-name">Weather</div></div>';
    const wx = this._hass.states['weather.forecast_home'];
    if (!wx) return '<div class="vehicle-content"><div class="vehicle-name">Weather</div><div class="vehicle-subtitle">Unavailable</div></div>';

    const temp = wx.attributes.temperature;
    const tempStr = temp != null ? Math.round(temp) + '°F' : '--';
    const cond = wx.state || '';
    const condLabel = cond.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const humidity = wx.attributes.humidity;
    const wind = wx.attributes.wind_speed;
    const icon = WX_ICON_MAP[cond] || 'mdi:weather-cloudy';
    const iconColor = WX_COLOR_MAP[cond] || '#8a9ab8';

    let details = condLabel;
    if (humidity != null) details += ' · ' + humidity + '% hum';
    if (wind != null) details += ' · ' + Math.round(wind) + ' mph';

    return `
      <div class="vehicle-content">
        <ha-icon icon="${icon}" style="--mdc-icon-size: 56px; color: ${iconColor};"></ha-icon>
        <div class="vehicle-name">${tempStr}</div>
        <div class="vehicle-subtitle">${details}</div>
      </div>
    `;
  }

  _createRadarCard() {
    const el = document.createElement('weather-radar-card');
    if (el.setConfig) {
      el.setConfig({
        data_source: 'RainViewer',
        center_latitude: 32.814,
        center_longitude: -96.94,
        zoom_level: 7,
        frame_delay: 400,
        past_minutes: 120,
        map_style: 'Dark',
        show_marker: true,
        show_playback: false,
        show_zoom: false,
        show_recenter: false,
        show_scale: false,
        show_color_bar: false,
        radar_opacity: 0.7,
      });
    }
    if (this._hass) el.hass = this._hass;
    this._radarCard = el;
    return el;
  }

  _patchRadarCard() {
    if (!this._radarCard || this._radarPatched) return;
    if (!this._radarCard.shadowRoot) return;
    this._radarPatched = true;

    this._radarCard.style.height = '100%';
    this._radarCard.style.width = '100%';
    this._radarCard.style.display = 'block';
    this._radarCard.style.borderRadius = '14px';
    this._radarCard.style.overflow = 'hidden';

    const sr = this._radarCard.shadowRoot;
    const patchStyle = document.createElement('style');
    patchStyle.id = 'kis-radar-patch';
    patchStyle.textContent = `
      ha-card { height: 100% !important; width: 100% !important; border-radius: 14px; overflow: hidden; }
      .leaflet-container { background: var(--ha-card-background, rgba(16,21,31,0.72)) !important; }
      #bottom-container { display: none !important; }
    `;
    if (!sr.querySelector('#kis-radar-patch')) {
      sr.appendChild(patchStyle);
    }
  }

  // ── Camera popup ────────────────────────────────────────────────────────────
  _openCameraPopup(cam) {
    if (!this._hass) return;
    const ha = document.querySelector('home-assistant');
    if (!ha) return;

    ha.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true,
      detail: { entityId: cam.entity },
    }));
  }

  // ── Touch/swipe handling ────────────────────────────────────────────────────
  _onTouchStart(e) {
    if (!e.touches.length) return;
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
    this._touchStartTime = Date.now();
    this._isSwiping = false;
    this._showDots();
    this._sliderEl.style.transition = 'none';
  }

  _onTouchMove(e) {
    if (!e.touches.length) return;
    const dx = e.touches[0].clientX - this._touchStartX;
    const dy = e.touches[0].clientY - this._touchStartY;

    // Only engage horizontal swipe if horizontal movement > vertical
    if (!this._isSwiping) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        this._isSwiping = true;
      } else if (Math.abs(dy) > 10) {
        return; // Vertical scroll — don't intercept
      } else {
        return;
      }
    }

    e.preventDefault();

    if (this._mode === 'default') {
      const slideW = this._viewportEl.offsetWidth;
      const base = -this._defaultIndex * slideW;
      this._currentTranslate = base + dx;
      this._sliderEl.style.transform = `translateX(${this._currentTranslate}px)`;
    } else {
      // In motion/sticky mode — allow swipe to hint at exiting
      this._currentTranslate = dx * 0.4; // resistance
      this._sliderEl.style.transform = `translateX(${this._currentTranslate}px)`;
    }
  }

  _onTouchEnd(e) {
    if (!this._isSwiping) return;

    const dx = (e.changedTouches?.[0]?.clientX || 0) - this._touchStartX;
    const dt = Date.now() - this._touchStartTime;
    const velocity = Math.abs(dx) / dt;

    if (this._mode === 'default') {
      const swipeDetected = Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
      if (swipeDetected) {
        if (dx < 0 && this._defaultIndex < DEFAULT_ITEMS.length - 1) {
          this._defaultIndex++;
        } else if (dx > 0 && this._defaultIndex > 0) {
          this._defaultIndex--;
        }
      }
      this._goToSlide(this._defaultIndex, true);
    } else {
      // In motion/sticky mode — swipe past threshold exits to default
      if (Math.abs(dx) > SWIPE_THRESHOLD * 2) {
        this._exitMotionMode();
      } else {
        // Snap back
        this._sliderEl.style.transition = 'transform 0.3s ease';
        this._sliderEl.style.transform = 'translateX(0)';
      }
    }

    this._isSwiping = false;
  }

  _goToSlide(index, animate) {
    const slideW = this._viewportEl?.offsetWidth || 0;
    if (!slideW) return;
    this._sliderEl.style.transition = animate ? 'transform 0.3s ease' : 'none';
    this._sliderEl.style.transform = `translateX(${-index * slideW}px)`;
    this._updateLabel();
    this._updateDots();
  }

  // ── Label + dots ────────────────────────────────────────────────────────────
  _updateLabel() {
    if (!this._labelEl) return;

    let label = '';
    if (this._mode === 'motion' || this._mode === 'sticky') {
      const cam = CAMERAS.find(c => c.id === this._activeCameraId);
      label = cam ? cam.label : '';
    } else {
      const item = DEFAULT_ITEMS[this._defaultIndex];
      label = item ? item.label : '';
    }

    if (this._labelEl.textContent !== label) {
      this._labelEl.textContent = label;
    }
  }

  _updateDots() {
    if (!this._dotsEl) return;

    if (this._mode !== 'default') {
      this._dotsEl.style.display = 'none';
      return;
    }

    this._dotsEl.style.display = 'flex';
    const count = DEFAULT_ITEMS.length;

    if (this._dotsEl.children.length !== count) {
      this._dotsEl.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        this._dotsEl.appendChild(dot);
      }
    }

    for (let i = 0; i < this._dotsEl.children.length; i++) {
      this._dotsEl.children[i].classList.toggle('active', i === this._defaultIndex);
    }

    this._showDots();
  }

  _showDots() {
    if (!this._dotsEl) return;
    this._dotsEl.classList.remove('fade-out');
    clearTimeout(this._dotsFadeTimer);
    this._dotsFadeTimer = setTimeout(() => {
      this._dotsEl.classList.add('fade-out');
    }, 3000);
  }

  // ── Content updates (targeted, not full rebuild) ────────────────────────────
  _updateSlideContent() {
    if (!this._built || !this._hass) return;

    // Update camera slide hass
    if (this._mode === 'motion' || this._mode === 'sticky') {
      const pe = this._sliderEl?.querySelector('hui-picture-entity-card');
      if (pe) pe.hass = this._hass;
      return;
    }

    // Update default slides
    for (let i = 0; i < this._slides.length; i++) {
      const item = DEFAULT_ITEMS[i];
      if (!item) continue;

      if (item.type === 'vehicle' && item.id === 'tesla_model_y') {
        const nameEl = this._slides[i].querySelector('.vehicle-name');
        const subEl = this._slides[i].querySelector('.vehicle-subtitle');
        if (subEl) {
          const bat = this._hass.states[item.entity];
          const range = this._hass.states[item.range_entity];
          let subtitle = 'Setup Required';
          if (bat) {
            subtitle = bat.state + '%';
            if (range) subtitle += ' · ' + Math.round(parseFloat(range.state)) + ' mi';
          }
          if (subEl.textContent !== subtitle) subEl.textContent = subtitle;
        }
      } else if (item.type === 'weather') {
        const wx = this._hass.states['weather.forecast_home'];
        if (wx) {
          const nameEl = this._slides[i].querySelector('.vehicle-name');
          const subEl = this._slides[i].querySelector('.vehicle-subtitle');
          const temp = wx.attributes.temperature;
          const tempStr = temp != null ? Math.round(temp) + '°F' : '--';
          if (nameEl && nameEl.textContent !== tempStr) nameEl.textContent = tempStr;
          if (subEl) {
            const cond = wx.state || '';
            const condLabel = cond.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const h = wx.attributes.humidity;
            const w = wx.attributes.wind_speed;
            let details = condLabel;
            if (h != null) details += ' · ' + h + '% hum';
            if (w != null) details += ' · ' + Math.round(w) + ' mph';
            if (subEl.textContent !== details) subEl.textContent = details;
          }
          const iconEl = this._slides[i].querySelector('ha-icon');
          if (iconEl) {
            const icon = WX_ICON_MAP[wx.state] || 'mdi:weather-cloudy';
            const iconColor = WX_COLOR_MAP[wx.state] || '#8a9ab8';
            if (iconEl.getAttribute('icon') !== icon) iconEl.setAttribute('icon', icon);
            iconEl.style.color = iconColor;
          }
        }
      } else if (item.type === 'weather_radar' && this._radarCard) {
        if (this._radarCard.hass !== this._hass) {
          this._radarCard.hass = this._hass;
        }
        this._patchRadarCard();
      }
    }
  }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  _getCSS() {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      .section-label {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: ${KIS_TOKENS.fontSize.chipText};
        font-weight: ${KIS_TOKENS.fontWeight.semibold};
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--kis-section-label, ${KIS_TOKENS.night.sectionLabel});
        padding: 4px 2px;
        margin: 0 0 4px 0;
        border-bottom: 1px solid var(--kis-section-rule, rgba(255,255,255,0.06));
      }

      .carousel-viewport {
        position: relative;
        width: 100%;
        overflow: hidden;
        border-radius: ${KIS_TOKENS.radius.card};
        background: var(--ha-card-background, ${KIS_TOKENS.night.bgCard});
        border: 1px solid var(--ha-card-border-color, ${KIS_TOKENS.night.borderCard});
        aspect-ratio: 16 / 9;
        transition: border 0.3s ease, box-shadow 0.3s ease;
      }

      .carousel-slider {
        display: flex;
        height: 100%;
        will-change: transform;
      }

      .slide {
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }

      .camera-slide {
        display: flex;
        align-items: stretch;
      }

      .camera-slide hui-picture-entity-card {
        width: 100%;
        height: 100%;
        display: block;
      }

      .default-slide {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .vehicle-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 18px 16px;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      .vehicle-name {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: ${KIS_TOKENS.fontSize.cardName};
        font-weight: ${KIS_TOKENS.fontWeight.semibold};
        color: var(--kis-text-primary, ${KIS_TOKENS.night.textPrimary});
        letter-spacing: 0.03em;
      }

      .vehicle-subtitle {
        font-family: ${KIS_TOKENS.fontFamily};
        font-size: ${KIS_TOKENS.fontSize.cardLabel};
        letter-spacing: ${KIS_TOKENS.letterSpacing.label};
        text-transform: uppercase;
        color: rgba(138,154,184,0.7);
      }

      /* Weather radar slide */
      .slide weather-radar-card {
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 0;
        overflow: hidden;
      }

      /* Pagination dots — overlaid on viewport */
      .dots {
        position: absolute;
        bottom: 10%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        display: flex;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.35);
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
        transition: opacity 400ms ease;
      }

      .dots.fade-out {
        opacity: 0;
        pointer-events: none;
      }

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.45);
        transition: background 0.2s ease, transform 0.2s ease;
      }

      .dot.active {
        background: rgba(255, 255, 255, 1);
        transform: scale(1.3);
      }

      /* Sticky indicator */
      :host([data-sticky]) .carousel-viewport::after {
        content: '';
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--kis-accent, #00d4f0);
        animation: pulse-sticky 2s ease-in-out infinite;
        z-index: 2;
      }

      @keyframes pulse-sticky {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
      }
    `;
  }
}

customElements.define('kis-priority-view', KisPriorityView);
