/**
 * kis-nav.js — KIS Fixed Bottom Navigation + Fixed Header Bar  v9
 * Loaded via frontend: extra_module_url in configuration.yaml.
 * Injects real DOM elements into document.body (completely outside HA's
 * shadow DOM tree), so position:fixed is always viewport-relative.
 * Only visible when on the /dashboard-mobilev1/ dashboard.
 *
 * v9 changes:
 *  - Dynamic header clearance: measures actual rendered header height via
 *    getBoundingClientRect().height and injects padding-top into #view.
 *  - Re-measures on every resize and orientationchange.
 *  - Removed all static HEADER_H / padding-top / margin-top values that
 *    were previously fighting this fix.
 */
(function () {
  'use strict';

  const DASHBOARD_PREFIX = '/dashboard-mobilev1';
  const NAV_H = 80; // px — bottom nav bar height + safe-area buffer

  const PAGES = [
    { label: 'Home',    icon: 'mdi:home-variant',   slug: 'home' },
    { label: 'Climate', icon: 'mdi:thermometer',     slug: 'climate' },
    { label: 'Lights',  icon: 'mdi:lightbulb-group', slug: 'lights' },
    { label: 'Cameras', icon: 'mdi:cctv',            slug: 'cameras' },
    { label: 'Media',   icon: 'mdi:music-note',      slug: 'media' },
  ];

  // ─── Styles: bottom nav ────────────────────────────────────────────────────
  const NAV_CSS = `
    #kis-nav-bar {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 9999999 !important;
      display: flex;
      align-items: stretch;
      background: rgba(7, 9, 16, 0.97);
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      min-height: 62px;
      box-sizing: border-box;
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
    }
    #kis-nav-bar[hidden] { display: none !important; }
    #kis-nav-bar .knb-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px 4px 6px;
      color: #4a5570;
      -webkit-tap-highlight-color: transparent;
      outline: none;
      position: relative;
      transition: color 0.15s ease;
    }
    #kis-nav-bar .knb-btn.knb-active { color: #00d4f0; }
    #kis-nav-bar .knb-btn ha-icon { --mdc-icon-size: 24px; display: block; }
    #kis-nav-bar .knb-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1;
    }
    #kis-nav-bar .knb-pill {
      position: absolute;
      bottom: 5px;
      width: 28px;
      height: 3px;
      background: #00d4f0;
      border-radius: 3px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    #kis-nav-bar .knb-btn.knb-active .knb-pill { opacity: 1; }
  `;

  // ─── Styles: top header bar ────────────────────────────────────────────────
  const HEADER_CSS = `
    #kis-header-bar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 10000001 !important;
      background: #0f1117;
      padding: 10px 16px 18px;
      padding-top: calc(10px + var(--sait, 0px));
      box-sizing: border-box;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #kis-header-bar[hidden] { display: none !important; }
    #kis-header-bar .kh-row1 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    #kis-header-bar .kh-clock {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    #kis-header-bar .kh-ampm {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
    }
    #kis-header-bar .kh-date {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #475569;
      margin-top: 2px;
    }
    #kis-header-bar .kh-alarm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 20px;
      border: 1px solid rgba(100,116,139,0.3);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      color: #94a3b8;
      background: rgba(100,116,139,0.15);
    }
    #kis-header-bar .kh-alarm-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      flex-shrink: 0;
    }
    #kis-header-bar .kh-row2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 7px;
    }
    #kis-header-bar .kh-weather {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #kis-header-bar .kh-weather-icon { font-size: 18px; line-height: 1; }
    #kis-header-bar .kh-weather-temp {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }
    #kis-header-bar .kh-weather-desc {
      font-size: 10px;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    #kis-header-bar .kh-presence { display: flex; gap: 5px; align-items: center; }
    #kis-header-bar .kh-person {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      background: rgba(100,116,139,0.1);
      color: #64748b;
      border: 2px solid #334155;
    }
    #kis-header-bar .kh-person.home {
      background: rgba(16,208,144,0.15);
      color: #10d090;
      border-color: rgba(16,208,144,0.6);
    }
  `;

  // ─── Shadow CSS patches ────────────────────────────────────────────────────
  function getHuiRootCSS() {
    return `
      app-header { display: none !important; }
      ha-app-layout {
        --header-height: 0px !important;
        --app-header-height: 0px !important;
      }
      #view {
        height: calc(100vh - ${NAV_H}px) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        padding-bottom: ${NAV_H}px !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
        box-sizing: border-box;
      }
      hui-sections-view, hui-masonry-view, hui-panel-view {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    `;
  }

  function getAppLayoutCSS() {
    return `
      :host {
        --header-height: 0px !important;
        --app-header-height: 0px !important;
      }
      #contentContainer, [part="content"], .content {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-y: visible !important;
      }
    `;
  }

  function getSectionsViewCSS() {
    return `
      :host {
        display: block;
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-bottom: ${NAV_H}px !important;
        box-sizing: border-box;
      }
      .container, .sections-container, [class*="container"] {
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-bottom: ${NAV_H}px !important;
      }
    `;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function injectShadowCSS(shadowRoot, id, css) {
    if (!shadowRoot) return false;
    const existing = shadowRoot.querySelector('#' + id);
    if (existing) { existing.textContent = css; return true; }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    shadowRoot.appendChild(style);
    return true;
  }

  function onMobileDashboard() {
    return window.location.pathname.startsWith(DASHBOARD_PREFIX);
  }

  function getActiveSlug() {
    const match = window.location.pathname.match(/\/dashboard-mobilev1\/(\w+)/);
    return match ? match[1] : 'home';
  }

  function navigate(slug) {
    const path = `${DASHBOARD_PREFIX}/${slug}`;
    window.history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
  }

  function fixBodyScroll() {
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
  }

  // ─── Safe area inset top (WKWebView fix) ──────────────────────────────────
  // WKWebView with contentInsetAdjustmentBehavior=never does not expose
  // env(safe-area-inset-top) at page load time, so CSS-only usage returns 0.
  // Fix: inject --sait via env() then read the computed value after 500ms
  // once WKWebView has settled, then lock it in as a hardcoded px value.
  function initSafeAreaTop() {
    const existing = document.getElementById('kis-sait');
    if (existing) return;
    const saitStyle = document.createElement('style');
    saitStyle.id = 'kis-sait';
    saitStyle.textContent = ':root { --sait: env(safe-area-inset-top, 0px); }';
    document.head.appendChild(saitStyle);

    setTimeout(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--sait').trim();
      const px = parseFloat(raw) || 0;
      document.documentElement.style.setProperty('--sait', px + 'px');
      applyDynamicHeaderClearance();
    }, 500);
  }

  // ─── Dynamic header clearance ──────────────────────────────────────────────
  // Measures the actual rendered bottom edge of the fixed header and injects
  // that value as padding-top on #view so content is never hidden behind it.
  // No hardcoded pixel values — works across all devices and orientations.
  function getHuiShadow() {
    try {
      const ha = document.querySelector('home-assistant');
      const main = ha?.shadowRoot?.querySelector('home-assistant-main');
      let panel = null;
      const drawer = main?.shadowRoot?.querySelector('ha-drawer');
      if (drawer) panel = drawer.querySelector('ha-panel-lovelace');
      if (!panel) panel = main?.shadowRoot?.querySelector('ha-panel-lovelace');
      const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
      return huiRoot?.shadowRoot || null;
    } catch (e) {
      return null;
    }
  }

  function applyDynamicHeaderClearance() {
    if (!onMobileDashboard()) return;

    const header = document.getElementById('kis-header-bar');
    if (!header || header.hasAttribute('hidden')) return;

    // getBoundingClientRect().height gives the actual rendered height of the header bar.
    const clearance = header.getBoundingClientRect().height;
    if (!clearance) {
      // Header not yet rendered — retry shortly
      setTimeout(applyDynamicHeaderClearance, 100);
      return;
    }

    const huiShadow = getHuiShadow();
    if (!huiShadow) {
      setTimeout(applyDynamicHeaderClearance, 200);
      return;
    }

    const css = `#view { padding-top: ${clearance}px !important; }`;
    injectShadowCSS(huiShadow, 'kis-header-clearance', css);
  }

  // ─── Header content rendering ──────────────────────────────────────────────
  function getHass() {
    try { return document.querySelector('home-assistant').hass; } catch (e) { return null; }
  }

  function getState(hass, entity) {
    return hass && hass.states && hass.states[entity];
  }

  function renderHeaderContent() {
    const bar = document.getElementById('kis-header-bar');
    if (!bar) return;

    const hass = getHass();

    // Clock + date
    const now = new Date();
    const h12 = now.getHours() % 12 || 12;
    const min = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dateStr = DAYS[now.getDay()] + ' · ' + MONTHS[now.getMonth()] + ' ' + now.getDate();

    // Alarm
    const alarmEnt = getState(hass, 'alarm_control_panel.kuprycz_home');
    const alarmState = alarmEnt ? alarmEnt.state : null;
    const ALARM_COLORS = {
      disarmed:   { bg:'rgba(16,208,144,0.1)',  color:'#10d090', border:'rgba(16,208,144,0.3)',  label:'Disarmed'   },
      armed_away: { bg:'rgba(239,68,68,0.15)',  color:'#ef4444', border:'rgba(239,68,68,0.3)',   label:'Armed Away' },
      armed_home: { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'rgba(245,158,11,0.3)',  label:'Armed Home' },
      arming:     { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'rgba(245,158,11,0.3)',  label:'Arming'     },
      pending:    { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'rgba(245,158,11,0.3)',  label:'Pending'    },
      triggered:  { bg:'rgba(239,68,68,0.25)',  color:'#ef4444', border:'rgba(239,68,68,0.4)',   label:'TRIGGERED'  },
    };
    const alarm = ALARM_COLORS[alarmState] || { bg:'rgba(100,116,139,0.15)', color:'#94a3b8', border:'rgba(100,116,139,0.3)', label:'Unknown' };

    // Weather
    const wxEnt = getState(hass, 'weather.forecast_home');
    const temp = wxEnt && wxEnt.attributes && wxEnt.attributes.temperature;
    const tempStr = temp != null ? Math.round(temp) + '°' : '--°';
    const cond = wxEnt ? wxEnt.state : '';
    const WX_LABELS = {sunny:'Sunny','clear-night':'Clear',partlycloudy:'Partly Cloudy',cloudy:'Cloudy',fog:'Foggy',rainy:'Rainy',pouring:'Heavy Rain',snowy:'Snowy','snowy-rainy':'Sleet',hail:'Hail',lightning:'Lightning','lightning-rainy':'Storms',windy:'Windy','windy-variant':'Windy',exceptional:'Unusual'};
    const WX_ICONS  = {sunny:'☀️','clear-night':'🌙',partlycloudy:'⛅',cloudy:'☁️',fog:'🌫️',rainy:'🌧️',pouring:'⛈️',snowy:'❄️','snowy-rainy':'🌨️',hail:'🌨️',lightning:'⚡','lightning-rainy':'⛈️',windy:'🌬️','windy-variant':'🌬️',exceptional:'🌡️'};
    const condLabel = WX_LABELS[cond] || cond || '--';
    const wxIcon    = WX_ICONS[cond]  || '🌤️';

    // Presence
    function personHome(entity) {
      const ent = getState(hass, entity);
      return ent && ent.state === 'home';
    }

    // Build DOM content
    bar.innerHTML = `
      <div class="kh-row1">
        <div>
          <div class="kh-clock">${h12}:${min} <span class="kh-ampm">${ampm}</span></div>
          <div class="kh-date">${dateStr}</div>
        </div>
        <div class="kh-alarm" style="background:${alarm.bg};color:${alarm.color};border-color:${alarm.border};">
          <span class="kh-alarm-dot"></span>${alarm.label}
        </div>
      </div>
      <div class="kh-row2">
        <div class="kh-weather">
          <span class="kh-weather-icon">${wxIcon}</span>
          <span class="kh-weather-temp">${tempStr}</span>
          <span class="kh-weather-desc">Dallas · ${condLabel}</span>
        </div>
        <div class="kh-presence">
          <div class="kh-person${personHome('person.chris')    ? ' home' : ''}">C</div>
          <div class="kh-person${personHome('person.claire')   ? ' home' : ''}">CL</div>
          <div class="kh-person${personHome('person.benjamin') ? ' home' : ''}">B</div>
        </div>
      </div>
    `;

    // Re-measure after content renders (innerHTML changes height)
    requestAnimationFrame(applyDynamicHeaderClearance);
  }

  // ─── Layout patches ────────────────────────────────────────────────────────
  function patchHALayout(attempt) {
    attempt = attempt || 0;
    const maxAttempts = 30;

    if (!onMobileDashboard()) return;

    fixBodyScroll();

    try {
      const ha = document.querySelector('home-assistant');
      if (!ha?.shadowRoot) throw new Error('no ha root');

      const main = ha.shadowRoot.querySelector('home-assistant-main');
      if (!main?.shadowRoot) throw new Error('no main');

      let panel = null;
      const drawer = main.shadowRoot.querySelector('ha-drawer');
      if (drawer) panel = drawer.querySelector('ha-panel-lovelace');
      if (!panel) panel = main.shadowRoot.querySelector('ha-panel-lovelace');
      if (!panel?.shadowRoot) throw new Error('no panel');

      const huiRoot = panel.shadowRoot.querySelector('hui-root');
      if (!huiRoot?.shadowRoot) throw new Error('no hui-root');

      const huiShadow = huiRoot.shadowRoot;

      injectShadowCSS(huiShadow, 'kis-hui-patch', getHuiRootCSS());

      const appLayout = huiShadow.querySelector('ha-app-layout');
      if (appLayout?.shadowRoot) {
        injectShadowCSS(appLayout.shadowRoot, 'kis-applayout-patch', getAppLayoutCSS());
      }

      const viewEl = huiShadow.querySelector('#view');
      if (viewEl) {
        const sectionsView = viewEl.querySelector('hui-sections-view');
        if (sectionsView?.shadowRoot) {
          injectShadowCSS(sectionsView.shadowRoot, 'kis-sections-patch', getSectionsViewCSS());
        }
        if (sectionsView && !sectionsView._kisPadded) {
          sectionsView.style.setProperty('padding-bottom', NAV_H + 'px', 'important');
          sectionsView._kisPadded = true;
        }
      }

      // Layout is ready — apply dynamic header clearance
      applyDynamicHeaderClearance();

    } catch (e) {
      if (attempt < maxAttempts) {
        const delay = Math.min(300 * (attempt + 1), 2000);
        setTimeout(() => patchHALayout(attempt + 1), delay);
      }
    }
  }

  // ─── Sync visibility / active state ───────────────────────────────────────
  function syncState() {
    const nav    = document.getElementById('kis-nav-bar');
    const header = document.getElementById('kis-header-bar');
    if (!nav || !header) return;

    if (onMobileDashboard()) {
      nav.removeAttribute('hidden');
      header.removeAttribute('hidden');
      const activeSlug = getActiveSlug();
      nav.querySelectorAll('.knb-btn').forEach((btn) => {
        btn.classList.toggle('knb-active', btn.dataset.slug === activeSlug);
      });
      renderHeaderContent();
      setTimeout(() => {
        document.querySelectorAll('hui-sections-view').forEach(el => {
          delete el._kisPadded;
        });
        patchHALayout(0);
      }, 100);
    } else {
      nav.setAttribute('hidden', '');
      header.setAttribute('hidden', '');
    }
  }

  // ─── Injection ─────────────────────────────────────────────────────────────
  function inject() {
    if (document.getElementById('kis-nav-bar')) {
      syncState();
      return;
    }

    // Resolve safe-area-inset-top via CSS custom property (WKWebView fix)
    initSafeAreaTop();

    // Inject shared styles + global app-header hide
    const styleEl = document.createElement('style');
    styleEl.id = 'kis-styles';
    styleEl.textContent = NAV_CSS + HEADER_CSS + `
      app-header { display: none !important; }
    `;
    document.head.appendChild(styleEl);

    // Build bottom nav
    const nav = document.createElement('div');
    nav.id = 'kis-nav-bar';
    if (!onMobileDashboard()) nav.setAttribute('hidden', '');
    PAGES.forEach((page) => {
      const btn = document.createElement('button');
      btn.className = 'knb-btn';
      btn.dataset.slug = page.slug;
      btn.setAttribute('aria-label', page.label);
      btn.innerHTML = `<ha-icon icon="${page.icon}"></ha-icon><span class="knb-label">${page.label}</span><div class="knb-pill"></div>`;
      btn.addEventListener('click', () => navigate(page.slug));
      nav.appendChild(btn);
    });
    document.body.appendChild(nav);

    // Build top header
    const header = document.createElement('div');
    header.id = 'kis-header-bar';
    if (!onMobileDashboard()) header.setAttribute('hidden', '');
    document.body.appendChild(header);

    syncState();

    window.addEventListener('location-changed', syncState);
    window.addEventListener('popstate', syncState);

    // Re-measure header clearance on any resize or orientation change
    window.addEventListener('resize', applyDynamicHeaderClearance);
    window.addEventListener('orientationchange', () => {
      // Brief delay for orientation change to complete layout reflow
      setTimeout(applyDynamicHeaderClearance, 150);
    });

    // Update header content every second (live clock + entity states)
    setInterval(() => {
      if (onMobileDashboard()) renderHeaderContent();
    }, 1000);

    // Initial layout patch with retry
    setTimeout(() => patchHALayout(0), 500);

    // Additional re-measurements to catch env(safe-area-inset-top) timing issues
    setTimeout(applyDynamicHeaderClearance, 1000);
    setTimeout(applyDynamicHeaderClearance, 2000);
    setTimeout(applyDynamicHeaderClearance, 3500);
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    if (customElements.get('ha-icon')) {
      inject();
    } else {
      customElements.whenDefined('ha-icon').then(() => setTimeout(inject, 200));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    setTimeout(() => { if (!document.getElementById('kis-nav-bar')) inject(); }, 600);
  });
})();
