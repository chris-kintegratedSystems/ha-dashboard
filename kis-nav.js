/**
 * kis-nav.js — KIS Fixed Bottom Navigation + Fixed Header Bar  v34
 * Loaded via frontend: extra_module_url in configuration.yaml.
 * Injects real DOM elements into document.body (completely outside HA's
 * shadow DOM tree), so position:fixed is always viewport-relative.
 * Only visible when on the /dashboard-mobilev1/ dashboard.
 *
 * v34 changes (camera loading flash fix):
 *  - Camera placeholder: paint <video> element's OWN background to match
 *    the placeholder (via shadow-root CSS). Neutralizes Android WebView
 *    146's UA-default black on empty <video>, which was the "black" phase
 *    of the black→white→video flash during the 300ms overlay fade-out.
 *    Not opacity — just background-color. WebView-safe.
 *  - Feed-ready gate: reveal only on `playing` (dropped `loadeddata` +
 *    `canplay`). `loadeddata` fires on one buffered frame which on Nest
 *    SDM is often a black I-frame; `playing` fires only once frames are
 *    actually decoding. readyState check raised from >= 2 to >= 3 && !paused.
 *
 * v23 changes (phase 5b fixes):
 *  - Expose window.KIS_NAV_VERSION so the Settings → About card can read
 *    the running version dynamically (no more stale hardcoded "v16").
 *  - Edge-to-edge: also zero out .wrapper padding (32px → 0) inside
 *    hui-sections-view so all 5 sections-type views (Home, Climate, Lights,
 *    Media, Settings) sit flush with the viewport. Previous fix only hit
 *    the inner .container which left the outer .wrapper gutter behind.
 *  - hui-panel-view / hui-sections-view: zero padding-left/right so panel
 *    views (Cameras) stay full-width too.
 *
 * v20 changes (phase 5b):
 *  - Swipe-hint overlay: first-visit centered pill "‹ › Swipe to explore" over
 *    any <simple-swipe-card>. Fades after 3.5s or first touch/pointer;
 *    localStorage flag kis-swipe-hint-shown gates subsequent showings.
 *
 * v19 changes (phase 5b):
 *  - Edge-to-edge: override HA sections container max-width + side padding so
 *    cards fill viewport with a uniform 12px side gap (matches card-to-card).
 *
 * v18 changes:
 *  - Day/night: input_select.theme_mode (Auto/Day/Night) + sun.sun auto switch
 *  - Reason: hass.themes.theme is static (frontend_default_dark_theme = null),
 *    so kis-nav now drives its own day/night attribute from sun + override.
 *
 * v16 changes:
 *  - Nav bar: background highlight indicator replaces pill (iOS 17+ style)
 *  - Nav bar: expanded tap targets (12px 4px 10px padding)
 *  - Nav bar: notification badge on Settings icon (urgent red / advisory amber)
 *  - Mini-player: persistent Now Playing bar above nav on all pages
 *  - Performance: targeted DOM updates instead of innerHTML rebuild every second
 *  - Performance: throttled clearance measurement (resize/orientation only)
 *
 * v12 changes:
 *  - Day/night theme-aware: detects hass.themes.darkMode, applies day palette
 *  - Alarm pill tappable: opens HA more-info dialog via event delegation
 */
(function () {
  'use strict';

  // Expose version so the Settings → About card can read it dynamically
  // via a custom:button-card [[[ ]]] template. Bump this whenever the
  // ?v=N cache-bust in configuration.yaml goes up.
  window.KIS_NAV_VERSION = 46;

  const DASHBOARD_PREFIX = '/dashboard-mobilev1';
  const NAV_H = 80; // px — bottom nav bar height + safe-area buffer
  const MEDIA_PLAYER_ENTITY = 'media_player.benjamins_hatch_media_player';

  // Badge entity groups — urgent (red) conditions
  const BADGE_LOCKS = ['lock.front_door_lock', 'lock.back_door_lock', 'lock.gemelli_door_lock'];
  const BADGE_GARAGES = ['cover.ratgdov25i_1746c3_door', 'cover.ratgdov25i_1746b4_door'];

  const PAGES = [
    { label: 'Home',     icon: 'mdi:home-variant',   slug: 'home' },
    { label: 'Climate',  icon: 'mdi:thermometer',     slug: 'climate' },
    { label: 'Lights',   icon: 'mdi:lightbulb-group', slug: 'lights' },
    { label: 'Cameras',  icon: 'mdi:cctv',            slug: 'cameras' },
    { label: 'Media',    icon: 'mdi:music-note',      slug: 'media' },
    { label: 'Settings', icon: 'mdi:cog',             slug: 'settings' },
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
      background: rgba(7,9,16,0.95);
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      min-height: 68px;
      box-sizing: border-box;
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      backdrop-filter: blur(24px) saturate(200%);
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
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 12px 4px 10px;
      margin: 4px 2px;
      color: #4a5570;
      -webkit-tap-highlight-color: transparent;
      outline: none;
      position: relative;
      transition: color 0.15s ease, background 0.15s ease;
      border-radius: 12px;
    }
    #kis-nav-bar .knb-btn.knb-active {
      color: #00d4f0;
      background: rgba(0,212,240,0.08);
    }
    #kis-nav-bar .knb-btn ha-icon { --mdc-icon-size: 22px; display: block; }
    #kis-nav-bar .knb-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1;
    }

    /* ── Notification badge ── */
    #kis-nav-bar .knb-badge {
      position: absolute;
      top: 4px;
      right: calc(50% - 18px);
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid rgba(7,9,16,0.92);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1;
      pointer-events: none;
    }
    #kis-nav-bar .knb-badge.urgent { background: #f04060; }
    #kis-nav-bar .knb-badge.advisory { background: #f5a623; }
    #kis-nav-bar .knb-badge[hidden] { display: none; }

    /* ── Day mode overrides ── */
    #kis-nav-bar[data-kis-day] {
      background: rgba(255,255,255,0.96);
      border-top: 1px solid rgba(0,0,0,0.04);
      box-shadow: 0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03);
    }
    #kis-nav-bar[data-kis-day] .knb-btn { color: #7a8698; }
    #kis-nav-bar[data-kis-day] .knb-btn.knb-active {
      color: #0088a8;
      background: rgba(0,136,168,0.08);
    }
    #kis-nav-bar[data-kis-day] .knb-badge { border-color: rgba(255,255,255,0.96); }
    #kis-nav-bar[data-kis-day] .knb-badge.urgent { background: #c02840; }
    #kis-nav-bar[data-kis-day] .knb-badge.advisory { background: #c07808; }

    /* ── Mini-player ── */
    #kis-mini-player {
      position: fixed !important;
      bottom: 80px !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 9999998 !important;
      background: rgba(11,14,23,0.95);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      padding: 8px 14px;
      gap: 10px;
      height: 52px;
      box-sizing: border-box;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      transition: transform 0.25s ease-out, opacity 0.25s ease-out;
    }
    #kis-mini-player[hidden] {
      transform: translateY(100%);
      opacity: 0;
      pointer-events: none;
    }
    #kis-mini-player .kmp-art {
      width: 36px; height: 36px; border-radius: 6px;
      background: #151c2a; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; overflow: hidden;
    }
    #kis-mini-player .kmp-art img {
      width: 100%; height: 100%; object-fit: cover;
    }
    #kis-mini-player .kmp-info { flex: 1; min-width: 0; }
    #kis-mini-player .kmp-track {
      font-size: 12px; font-weight: 600; color: #eef2f8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #kis-mini-player .kmp-artist {
      font-size: 10px; color: #8a9ab8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #kis-mini-player .kmp-play {
      background: none; border: none; cursor: pointer;
      -webkit-tap-highlight-color: transparent; flex-shrink: 0;
      padding: 4px; display: flex; align-items: center;
    }
    #kis-mini-player .kmp-play ha-icon {
      --mdc-icon-size: 24px; color: #00d4f0;
    }
    #kis-mini-player .kmp-progress {
      position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
      background: #1c2438;
    }
    #kis-mini-player .kmp-progress-fill {
      height: 100%; background: #00d4f0; border-radius: 1px;
      transition: width 1s linear;
    }

    /* ── Mini-player day mode ── */
    #kis-mini-player[data-kis-day] {
      background: rgba(255,255,255,0.96);
      border-top: 1px solid rgba(0,0,0,0.04);
      box-shadow: 0 -1px 3px rgba(0,0,0,0.06);
    }
    #kis-mini-player[data-kis-day] .kmp-art { background: #e4e8f0; }
    #kis-mini-player[data-kis-day] .kmp-track { color: #1a2030; }
    #kis-mini-player[data-kis-day] .kmp-artist { color: #4a5a72; }
    #kis-mini-player[data-kis-day] .kmp-play ha-icon { color: #0088a8; }
    #kis-mini-player[data-kis-day] .kmp-progress { background: #c0c8d4; }
    #kis-mini-player[data-kis-day] .kmp-progress-fill { background: #0088a8; }
  `;

  // ─── Styles: top header bar (v11 single-row) ────────────────────────────────
  const HEADER_CSS = `
    #kis-header-bar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 10000001 !important;
      background: rgba(7,9,16,0.92);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 16px;
      padding-top: calc(env(safe-area-inset-top, 0px));
      min-height: 68px;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;
    }
    #kis-header-bar[hidden] { display: none !important; }

    /* Left side: clock + weather */
    #kis-header-bar .kh-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    #kis-header-bar .kh-clock-wrap {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    #kis-header-bar .kh-clock {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #eef2f8;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    #kis-header-bar .kh-ampm {
      font-size: 11px;
      font-weight: 600;
      color: #8a9ab8;
    }
    #kis-header-bar .kh-date {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4a5570;
      margin-top: 1px;
    }
    #kis-header-bar .kh-weather {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #kis-header-bar .kh-weather-icon { font-size: 16px; line-height: 1; }
    #kis-header-bar .kh-weather-temp {
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }

    /* Right side: person pills + alarm pill */
    #kis-header-bar .kh-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 1;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    #kis-header-bar .kh-right::-webkit-scrollbar { display: none; }

    #kis-header-bar .kh-person-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px 3px 5px;
      border-radius: 14px;
      background: rgba(16,21,31,0.72);
      border: 1px solid rgba(255,255,255,0.06);
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    #kis-header-bar .kh-pdot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    #kis-header-bar .kh-pdot.home {
      background: #10d090;
      box-shadow: 0 0 4px #10d090;
    }
    #kis-header-bar .kh-pdot.away {
      background: #4d8ef0;
    }
    #kis-header-bar .kh-pdot.unknown {
      background: #4a5570;
    }
    #kis-header-bar .kh-pname {
      font-size: 10px;
      font-weight: 600;
      color: #eef2f8;
    }

    #kis-header-bar .kh-alarm {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 16px;
      border: 1px solid rgba(100,116,139,0.3);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      color: #94a3b8;
      background: rgba(100,116,139,0.15);
      flex-shrink: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    #kis-header-bar .kh-alarm-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      flex-shrink: 0;
      animation: kh-pulse 2s ease-in-out infinite;
    }
    @keyframes kh-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.7); }
    }

    /* ── Day mode overrides ── */
    #kis-header-bar[data-kis-day] {
      background: rgba(255,255,255,0.96);
      border-bottom: 1px solid rgba(0,0,0,0.04);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03);
    }
    #kis-header-bar[data-kis-day] .kh-clock { color: #1a2030; }
    #kis-header-bar[data-kis-day] .kh-ampm { color: #4a5a72; }
    #kis-header-bar[data-kis-day] .kh-date { color: #7a8698; }
    #kis-header-bar[data-kis-day] .kh-weather-temp { color: #1a2030; }
    #kis-header-bar[data-kis-day] .kh-person-pill {
      background: rgba(255,255,255,0.88);
      border-color: rgba(0,0,0,0.05);
    }
    #kis-header-bar[data-kis-day] .kh-pdot.home {
      background: #089464;
      box-shadow: 0 0 4px #089464;
    }
    #kis-header-bar[data-kis-day] .kh-pdot.away { background: #2d6bc4; }
    #kis-header-bar[data-kis-day] .kh-pdot.unknown { background: #7a8698; }
    #kis-header-bar[data-kis-day] .kh-pname { color: #1a2030; }
  `;

  // ─── Swipe-hint overlay CSS ───────────────────────────────────────────────
  const SWIPE_HINT_CSS = `
    #kis-swipe-hint {
      position: fixed;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(0,212,240,0.12);
      border: 1px solid rgba(0,212,240,0.22);
      color: rgba(0,212,240,0.95);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 2147483640;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.96);
      transition: opacity 260ms ease, transform 260ms ease;
      white-space: nowrap;
    }
    #kis-swipe-hint[data-visible] {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    #kis-swipe-hint .kish-arrow {
      display: inline-block;
      animation: kish-arrow-pulse 1.6s ease-in-out infinite;
    }
    #kis-swipe-hint .kish-arrow.kish-right { animation-delay: 0.3s; }
    @keyframes kish-arrow-pulse {
      0%, 100% { transform: translateX(0); opacity: 0.75; }
      50%      { transform: translateX(4px); opacity: 1; }
    }
    #kis-swipe-hint .kish-arrow.kish-left {
      animation-name: kish-arrow-pulse-left;
    }
    @keyframes kish-arrow-pulse-left {
      0%, 100% { transform: translateX(0); opacity: 0.75; }
      50%      { transform: translateX(-4px); opacity: 1; }
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
        box-sizing: border-box;
      }
      hui-masonry-view, hui-panel-view {
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      hui-sections-view {
        padding-top: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        /* margin-top applied dynamically by applyDynamicHeaderClearance */
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
        /* margin-top controlled from outside via element.style */
        padding-bottom: ${NAV_H}px !important;
        box-sizing: border-box;
        /* Edge-to-edge: neutralize HA's column max-width / min-width clamps so
           sections fill the available viewport width. */
        --ha-view-sections-column-max-width: none !important;
        --column-max-width: none !important;
        /* Column + row gap between sections must equal the 12px edge padding
           below on .container, so left-edge = column-gap = right-edge and
           top-edge = row-gap. HA's default is 32px which makes the center
           gutter visibly wider than the side gutters. */
        --ha-view-sections-column-gap: 12px !important;
        --ha-view-sections-row-gap: 12px !important;
      }
      /* .wrapper is hui-sections-view's outer shell; HA gives it 32px side
         padding which is where the visible page-edge gutter comes from. Drop
         it to 0 so .container below can apply a single 12px gutter. */
      .wrapper {
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-top: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        max-width: 100% !important;
      }
      .container, .sections-container, [class*="container"] {
        margin-top: 0 !important;
        padding-bottom: ${NAV_H}px !important;
        /* Edge-to-edge: HA's sections layout applies its own max-width + side
           padding (~60-80px on tablet). Match the 12px inter-card gap so the
           dashboard-to-edge gap equals card-to-card gap. */
        max-width: 100% !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      /* Zero out HA's default 80px spacer for view headers (we use #kis-header-bar instead) */
      .wrapper.top-margin, .top-margin {
        margin-top: 0 !important;
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

    // TODO: Nest camera autoplay on iOS — parked for future investigation.
    // Nest WebRTC streams don't auto-start on non-initial views due to iOS
    // autoplay policy. Streams work on tap. Muted autoplay approach tested
    // but didn't resolve. Cameras work fine on the single-view dashboard.
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
  // Fix: inject --sait via env() so CSS uses it immediately, then after 500ms
  // use a probe element to read the resolved px value (getComputedStyle on a
  // custom property returns the literal token, not a resolved px value, so we
  // must read a concrete CSS property like 'top' to get the actual number).
  // Only lock in as a hardcoded px value if non-zero — never override with 0,
  // because that would strip the notch padding the CSS env() already applied.
  function initSafeAreaTop() {
    const existing = document.getElementById('kis-sait');
    if (existing) return;
    const saitStyle = document.createElement('style');
    saitStyle.id = 'kis-sait';
    saitStyle.textContent = ':root { --sait: env(safe-area-inset-top, 0px); }';
    document.head.appendChild(saitStyle);

    setTimeout(() => {
      // Read env(safe-area-inset-top) via a probe element so the browser
      // resolves env() into a concrete px value (reliable across WebKit versions).
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:0;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(probe);
      const px = parseFloat(getComputedStyle(probe).top) || 0;
      probe.remove();
      // Only lock in the inline value if non-zero. If env() returned 0 (device
      // has no notch, or WKWebView hasn't settled yet), leave the CSS rule in
      // place so it remains live — never override with 0 and strip notch padding.
      if (px > 0) {
        document.documentElement.style.setProperty('--sait', px + 'px');
      }
      applyDynamicHeaderClearance();
    }, 500);
  }

  // ─── Dynamic header clearance ──────────────────────────────────────────────
  // #kis-header-bar is position:fixed at viewport top. hui-sections-view needs
  // margin-top equal to the header's rendered height so content starts below it.
  // HA's internal .wrapper.top-margin (default 80px for view headers) is zeroed
  // out via getSectionsViewCSS() and --ha-view-sections-extra-top-margin: 0px.
  // Re-runs on every page change, resize, and orientation change.
  function getHuiRoot() {
    try {
      const ha = document.querySelector('home-assistant');
      const main = ha?.shadowRoot?.querySelector('home-assistant-main');
      let panel = null;
      const drawer = main?.shadowRoot?.querySelector('ha-drawer');
      if (drawer) panel = drawer.querySelector('ha-panel-lovelace');
      if (!panel) panel = main?.shadowRoot?.querySelector('ha-panel-lovelace');
      return panel?.shadowRoot?.querySelector('hui-root') || null;
    } catch (e) {
      return null;
    }
  }

  function getHuiShadow() {
    const root = getHuiRoot();
    return root?.shadowRoot || null;
  }

  function applyDynamicHeaderClearance(attempt) {
    attempt = attempt || 0;
    if (!onMobileDashboard()) return;

    const header = document.getElementById('kis-header-bar');
    if (!header || header.hasAttribute('hidden')) return;

    // Measure actual rendered header height — works across all devices/orientations.
    const clearance = Math.ceil(header.getBoundingClientRect().height);
    if (!clearance) {
      // Header not yet rendered — retry shortly.
      setTimeout(() => applyDynamicHeaderClearance(attempt), 100);
      return;
    }

    const huiShadow = getHuiShadow();
    if (!huiShadow) {
      if (attempt < 20) setTimeout(() => applyDynamicHeaderClearance(attempt + 1), 200);
      return;
    }

    const viewEl = huiShadow.querySelector('#view');
    const sectionsView = viewEl && viewEl.querySelector('hui-sections-view');

    if (sectionsView) {
      // PRIMARY FIX: apply clearance directly to the sections-view ELEMENT, not
      // inside its shadow root. This moves the entire scroll container (including
      // its own internal sticky elements) below the fixed header bar.
      // Sticky cards inside sections-view use :host as their scroll container;
      // with :host starting at clearance from viewport top, top:0 sticky elements
      // naturally stick at the bottom of kis-header-bar. ✓
      sectionsView.style.setProperty('margin-top', clearance + 'px', 'important');
      sectionsView.style.setProperty('height', `calc(100vh - ${NAV_H + clearance}px)`, 'important');
      sectionsView.style.setProperty('overflow-y', 'auto', 'important');

      // Zero out HA's default view-header spacer variable (no HA view header — we use #kis-header-bar)
      sectionsView.style.setProperty('--ha-view-sections-extra-top-margin', '0px');

      // Remove any stale .wrapper injection from prior approach.
      if (sectionsView.shadowRoot) {
        const old = sectionsView.shadowRoot.querySelector('#kis-sections-clearance');
        if (old) old.remove();
        const oldVh = sectionsView.shadowRoot.querySelector('#kis-view-header-clearance');
        if (oldVh) oldVh.remove();
      }

      // Zero out #view padding-top to prevent any double-stacking.
      injectShadowCSS(huiShadow, 'kis-header-clearance', '#view { padding-top: 0 !important; }');
    } else {
      // Sections view not yet in DOM (page still loading) — retry.
      // Also apply #view padding-top as fallback for masonry/panel view types.
      const viewCSS = `#view { padding-top: ${clearance}px !important; }`;
      injectShadowCSS(huiShadow, 'kis-header-clearance', viewCSS);
      const clearanceEl = huiShadow.querySelector('#kis-header-clearance');
      if (clearanceEl) huiShadow.appendChild(clearanceEl);
      if (attempt < 15) setTimeout(() => applyDynamicHeaderClearance(attempt + 1), 200);
    }
  }

  // ─── Header content rendering ──────────────────────────────────────────────
  // Track weather state to detect first load and re-trigger clearance measurement.
  let _prevWeatherKey = null;

  function getHass() {
    try { return document.querySelector('home-assistant').hass; } catch (e) { return null; }
  }

  function getState(hass, entity) {
    return hass && hass.states && hass.states[entity];
  }

  // ─── Badge computation ────────────────────────────────────────────────────
  function updateBadge(hass) {
    const badge = document.querySelector('#kis-nav-bar .knb-badge');
    if (!badge) return;

    let urgent = 0;
    let advisory = 0;

    if (hass) {
      // Unlocked doors → urgent
      BADGE_LOCKS.forEach(id => {
        const ent = getState(hass, id);
        if (ent && ent.state === 'unlocked') urgent++;
      });
      // Open garages → urgent
      BADGE_GARAGES.forEach(id => {
        const ent = getState(hass, id);
        if (ent && ent.state === 'open') urgent++;
      });
      // Alarm disarmed while everyone is away → urgent
      const alarm = getState(hass, 'alarm_control_panel.kuprycz_home');
      const chris = getState(hass, 'person.chris');
      const claire = getState(hass, 'person.claire');
      if (alarm && alarm.state === 'disarmed') {
        const allAway = (!chris || chris.state !== 'home') && (!claire || claire.state !== 'home');
        if (allAway) urgent++;
      }
    }

    const total = urgent + advisory;
    if (total === 0) {
      badge.setAttribute('hidden', '');
    } else {
      badge.removeAttribute('hidden');
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.className = 'knb-badge ' + (urgent > 0 ? 'urgent' : 'advisory');
    }
  }

  // ─── Mini-player rendering ──────────────────────────────────────────────────
  let _prevMediaState = null;

  function updateMiniPlayer(hass, isDayMode) {
    const player = document.getElementById('kis-mini-player');
    if (!player) return;

    // Propagate day mode
    if (isDayMode) {
      player.setAttribute('data-kis-day', '');
    } else {
      player.removeAttribute('data-kis-day');
    }

    const ent = hass ? getState(hass, MEDIA_PLAYER_ENTITY) : null;
    const state = ent ? ent.state : 'off';
    const isActive = state === 'playing' || state === 'paused';

    if (!isActive) {
      if (_prevMediaState !== 'hidden') {
        player.setAttribute('hidden', '');
        _prevMediaState = 'hidden';
      }
      return;
    }

    if (_prevMediaState === 'hidden') {
      player.removeAttribute('hidden');
    }
    _prevMediaState = state;

    const attrs = ent.attributes || {};
    const track = attrs.media_title || 'Unknown';
    const artist = attrs.media_artist || '';
    const art = attrs.entity_picture || '';

    // Targeted updates — only touch changed elements
    const trackEl = player.querySelector('.kmp-track');
    if (trackEl && trackEl.textContent !== track) trackEl.textContent = track;

    const artistEl = player.querySelector('.kmp-artist');
    if (artistEl && artistEl.textContent !== artist) artistEl.textContent = artist;

    // Album art
    const artBox = player.querySelector('.kmp-art');
    if (artBox) {
      if (art) {
        const img = artBox.querySelector('img');
        if (img) {
          if (img.src !== art) img.src = art;
        } else {
          artBox.innerHTML = `<img src="${art}" alt="">`;
        }
      } else {
        if (!artBox.querySelector('ha-icon')) {
          artBox.innerHTML = '<ha-icon icon="mdi:music-note"></ha-icon>';
        }
      }
    }

    // Play/pause icon
    const playIcon = player.querySelector('.kmp-play ha-icon');
    const targetIcon = state === 'playing' ? 'mdi:pause' : 'mdi:play';
    if (playIcon && playIcon.getAttribute('icon') !== targetIcon) {
      playIcon.setAttribute('icon', targetIcon);
    }

    // Progress bar
    const duration = attrs.media_duration || 0;
    const position = attrs.media_position || 0;
    const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
    const fill = player.querySelector('.kmp-progress-fill');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
  }

  // Alarm color maps (hoisted out of render loop for performance)
  const ALARM_NIGHT = {
    disarmed:   { bg:'rgba(16,208,144,0.12)', color:'#10d090', border:'rgba(16,208,144,0.3)',  label:'Disarmed'   },
    armed_away: { bg:'rgba(77,142,240,0.12)', color:'#4d8ef0', border:'rgba(77,142,240,0.3)',  label:'Armed Away' },
    armed_home: { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Armed Home' },
    arming:     { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Arming'     },
    pending:    { bg:'rgba(245,166,35,0.12)', color:'#f5a623', border:'rgba(245,166,35,0.3)',  label:'Pending'    },
    triggered:  { bg:'rgba(240,64,96,0.15)',  color:'#f04060', border:'rgba(240,64,96,0.3)',   label:'TRIGGERED'  },
  };
  const ALARM_DAY = {
    disarmed:   { bg:'rgba(8,148,100,0.10)',  color:'#089464', border:'rgba(8,148,100,0.35)',  label:'Disarmed'   },
    armed_away: { bg:'rgba(45,107,196,0.10)', color:'#2d6bc4', border:'rgba(45,107,196,0.35)', label:'Armed Away' },
    armed_home: { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Armed Home' },
    arming:     { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Arming'     },
    pending:    { bg:'rgba(192,120,8,0.10)',  color:'#c07808', border:'rgba(192,120,8,0.35)',  label:'Pending'    },
    triggered:  { bg:'rgba(192,40,64,0.10)',  color:'#c02840', border:'rgba(192,40,64,0.35)',  label:'TRIGGERED'  },
  };
  const ALARM_UNKNOWN_NIGHT = { bg:'rgba(100,116,139,0.15)', color:'#94a3b8', border:'rgba(100,116,139,0.3)',  label:'Unknown' };
  const ALARM_UNKNOWN_DAY   = { bg:'rgba(122,134,152,0.10)', color:'#4a5a72', border:'rgba(122,134,152,0.25)', label:'Unknown' };

  const WX_LABELS = {sunny:'Sunny','clear-night':'Clear',partlycloudy:'Partly Cloudy',cloudy:'Cloudy',fog:'Foggy',rainy:'Rainy',pouring:'Heavy Rain',snowy:'Snowy','snowy-rainy':'Sleet',hail:'Hail',lightning:'Lightning','lightning-rainy':'Storms',windy:'Windy','windy-variant':'Windy',exceptional:'Unusual'};
  const WX_ICONS  = {sunny:'☀️','clear-night':'🌙',partlycloudy:'⛅',cloudy:'☁️',fog:'🌫️',rainy:'🌧️',pouring:'⛈️',snowy:'❄️','snowy-rainy':'🌨️',hail:'🌨️',lightning:'⚡','lightning-rainy':'⛈️',windy:'🌬️','windy-variant':'🌬️',exceptional:'🌡️'};

  let _headerInitialized = false;

  function personState(hass, entity) {
    const ent = getState(hass, entity);
    if (!ent) return 'unknown';
    return ent.state === 'home' ? 'home' : 'away';
  }

  function renderHeaderContent() {
    const bar = document.getElementById('kis-header-bar');
    if (!bar) return;

    const hass = getHass();

    // Theme detection — input_select.theme_mode override + sun.sun auto fallback.
    // Mode options: Auto (follows sunrise/sunset), Day (force light), Night (force dark).
    // Why: HA's frontend_default_dark_theme is null, so hass.themes.theme is static.
    // We drive kis-nav's day/night look directly from sun.sun + user override.
    const sunEnt = getState(hass, 'sun.sun');
    const sunBelow = sunEnt && sunEnt.state === 'below_horizon';
    const themeModeEnt = getState(hass, 'input_select.theme_mode');
    const themeMode = themeModeEnt ? themeModeEnt.state : 'Auto';
    let isDayMode;
    if (themeMode === 'Day') isDayMode = true;
    else if (themeMode === 'Night') isDayMode = false;
    else isDayMode = !sunBelow;
    const navBar = document.getElementById('kis-nav-bar');
    if (isDayMode) {
      bar.setAttribute('data-kis-day', '');
      if (navBar) navBar.setAttribute('data-kis-day', '');
      document.body.setAttribute('data-kis-day', '');
      document.documentElement.style.setProperty('--kis-section-label', '#7a8698');
      document.documentElement.style.setProperty('--kis-section-rule', 'rgba(0,0,0,0.06)');
      // Camera placeholder day palette (consumed by CAM_PLACEHOLDER_CSS via
      // CSS var inheritance through shadow DOM — see installCameraPlaceholder).
      document.documentElement.style.setProperty('--kis-cam-placeholder-bg', '#f0f2f5');
      document.documentElement.style.setProperty('--kis-cam-placeholder-text', '#7a8698');
      document.documentElement.style.setProperty('--kis-cam-placeholder-border', 'rgba(0,0,0,0.06)');
      // Lights page day palette — glass-morph flips to a warm-white pane,
      // text darkens to dark-gray. Amber fill stays amber in both modes.
      document.documentElement.style.setProperty('--kis-lights-room-bg', 'rgba(255,255,255,0.85)');
      document.documentElement.style.setProperty('--kis-lights-room-border', 'rgba(0,0,0,0.08)');
      document.documentElement.style.setProperty('--kis-lights-room-name', '#1b2230');
      document.documentElement.style.setProperty('--kis-lights-room-count', '#6a7689');
      document.documentElement.style.setProperty('--kis-lights-row-rule', 'rgba(0,0,0,0.06)');
      document.documentElement.style.setProperty('--kis-lights-name', '#2b3142');
      document.documentElement.style.setProperty('--kis-lights-bar-track', 'rgba(0,0,0,0.09)');
      document.documentElement.style.setProperty('--kis-lights-bar-fill', '#f5a623');
    } else {
      bar.removeAttribute('data-kis-day');
      if (navBar) navBar.removeAttribute('data-kis-day');
      document.body.removeAttribute('data-kis-day');
      document.documentElement.style.setProperty('--kis-section-label', '#4a5570');
      document.documentElement.style.setProperty('--kis-section-rule', 'rgba(255,255,255,0.06)');
      document.documentElement.style.setProperty('--kis-cam-placeholder-bg', '#151c2a');
      document.documentElement.style.setProperty('--kis-cam-placeholder-text', '#4a5570');
      document.documentElement.style.setProperty('--kis-cam-placeholder-border', 'rgba(255,255,255,0.06)');
      // Lights page night palette — dark glass, light text.
      document.documentElement.style.setProperty('--kis-lights-room-bg', 'rgba(16,21,31,0.72)');
      document.documentElement.style.setProperty('--kis-lights-room-border', 'rgba(255,255,255,0.06)');
      document.documentElement.style.setProperty('--kis-lights-room-name', '#eef2f8');
      document.documentElement.style.setProperty('--kis-lights-room-count', '#8a95a6');
      document.documentElement.style.setProperty('--kis-lights-row-rule', 'rgba(255,255,255,0.04)');
      document.documentElement.style.setProperty('--kis-lights-name', '#cfd5e0');
      document.documentElement.style.setProperty('--kis-lights-bar-track', 'rgba(255,255,255,0.08)');
      document.documentElement.style.setProperty('--kis-lights-bar-fill', '#f5a623');
    }

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
    const ALARM_COLORS = isDayMode ? ALARM_DAY : ALARM_NIGHT;
    const alarm = ALARM_COLORS[alarmState] || (isDayMode ? ALARM_UNKNOWN_DAY : ALARM_UNKNOWN_NIGHT);

    // Weather
    const wxEnt = getState(hass, 'weather.forecast_home');
    const temp = wxEnt && wxEnt.attributes && wxEnt.attributes.temperature;
    const tempStr = temp != null ? Math.round(temp) + '°' : '--°';
    const cond = wxEnt ? wxEnt.state : '';
    const wxIcon = WX_ICONS[cond] || '🌤️';

    // Presence
    const chrisSt  = personState(hass, 'person.chris');
    const claireSt = personState(hass, 'person.claire');

    // ── Initial render (once) — build the DOM skeleton ──
    if (!_headerInitialized) {
      bar.innerHTML = `
        <div class="kh-left">
          <div class="kh-clock-wrap">
            <div class="kh-clock"><span data-kis="time">${h12}:${min}</span> <span class="kh-ampm" data-kis="ampm">${ampm}</span></div>
            <div class="kh-date" data-kis="date">${dateStr}</div>
          </div>
          <div class="kh-weather">
            <span class="kh-weather-icon" data-kis="wx-icon">${wxIcon}</span>
            <span class="kh-weather-temp" data-kis="wx-temp">${tempStr}</span>
          </div>
        </div>
        <div class="kh-right">
          <div class="kh-person-pill" data-entity="person.chris"><span class="kh-pdot ${chrisSt}" data-kis="chris-dot"></span><span class="kh-pname">Chris</span></div>
          <div class="kh-person-pill" data-entity="person.claire"><span class="kh-pdot ${claireSt}" data-kis="claire-dot"></span><span class="kh-pname">Claire</span></div>
          <div class="kh-alarm" data-kis="alarm" style="background:${alarm.bg};color:${alarm.color};border-color:${alarm.border};">
            <span class="kh-alarm-dot"></span><span data-kis="alarm-label">${alarm.label}</span>
          </div>
        </div>
      `;
      _headerInitialized = true;
      requestAnimationFrame(applyDynamicHeaderClearance);
    } else {
      // ── Targeted updates — only touch changed text/styles ──
      const q = (sel) => bar.querySelector(sel);

      const timeEl = q('[data-kis="time"]');
      const timeStr = h12 + ':' + min;
      if (timeEl && timeEl.textContent !== timeStr) timeEl.textContent = timeStr;

      const ampmEl = q('[data-kis="ampm"]');
      if (ampmEl && ampmEl.textContent !== ampm) ampmEl.textContent = ampm;

      const dateEl = q('[data-kis="date"]');
      if (dateEl && dateEl.textContent !== dateStr) dateEl.textContent = dateStr;

      const wxIconEl = q('[data-kis="wx-icon"]');
      if (wxIconEl && wxIconEl.textContent !== wxIcon) wxIconEl.textContent = wxIcon;

      const wxTempEl = q('[data-kis="wx-temp"]');
      if (wxTempEl && wxTempEl.textContent !== tempStr) wxTempEl.textContent = tempStr;

      // Alarm pill — update style + label
      const alarmEl = q('[data-kis="alarm"]');
      if (alarmEl) {
        alarmEl.style.background = alarm.bg;
        alarmEl.style.color = alarm.color;
        alarmEl.style.borderColor = alarm.border;
        const labelEl = q('[data-kis="alarm-label"]');
        if (labelEl && labelEl.textContent !== alarm.label) labelEl.textContent = alarm.label;
      }

      // Person dots — update class
      const chrisDot = q('[data-kis="chris-dot"]');
      if (chrisDot) chrisDot.className = 'kh-pdot ' + chrisSt;

      const claireDot = q('[data-kis="claire-dot"]');
      if (claireDot) claireDot.className = 'kh-pdot ' + claireSt;
    }

    // Re-measure when weather state changes (covers async first-load)
    const weatherKey = cond + '|' + tempStr;
    if (weatherKey !== _prevWeatherKey) {
      _prevWeatherKey = weatherKey;
      requestAnimationFrame(applyDynamicHeaderClearance);
      setTimeout(applyDynamicHeaderClearance, 200);
    }

    // Update badge + mini-player on each tick
    updateBadge(hass);
    updateMiniPlayer(hass, isDayMode);
  }

  // ─── Swipe-hint overlay ───────────────────────────────────────────────────
  // On first visit to a page containing a simple-swipe-card, briefly overlay a
  // centered pill reading "‹ › Swipe to explore" over the card. One-shot —
  // localStorage flag gates future showings. Fades after 3.5s or on first touch.
  const SWIPE_HINT_STORAGE_KEY = 'kis-swipe-hint-shown';
  let _swipeHintAttempts = 0;
  let _swipeHintScheduled = false;

  function findSwipeCardEl(root) {
    // Deep shadow-DOM search for the first <simple-swipe-card> element.
    if (!root) return null;
    if (root.tagName && root.tagName.toLowerCase() === 'simple-swipe-card') return root;
    const direct = root.querySelector && root.querySelector('simple-swipe-card');
    if (direct) return direct;
    const walker = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of walker) {
      if (el.shadowRoot) {
        const found = findSwipeCardEl(el.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  function dismissSwipeHint(reason) {
    const hint = document.getElementById('kis-swipe-hint');
    if (!hint) return;
    hint.removeAttribute('data-visible');
    setTimeout(() => { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 320);
    try { localStorage.setItem(SWIPE_HINT_STORAGE_KEY, '1'); } catch (e) { /* private mode */ }
    window.removeEventListener('touchstart', onHintInteract, true);
    window.removeEventListener('pointerdown', onHintInteract, true);
  }

  function onHintInteract() { dismissSwipeHint('touch'); }

  function maybeShowSwipeHint() {
    if (_swipeHintScheduled) return;
    if (!onMobileDashboard()) return;
    try {
      if (localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === '1') return;
    } catch (e) { /* private mode — always show */ }

    _swipeHintAttempts = 0;
    _swipeHintScheduled = true;

    const tryShow = () => {
      _swipeHintScheduled = false;
      const swipeCard = findSwipeCardEl(document.body);
      if (!swipeCard) {
        if (_swipeHintAttempts++ < 20) {
          _swipeHintScheduled = true;
          setTimeout(tryShow, 300);
        }
        return;
      }
      const rect = swipeCard.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        if (_swipeHintAttempts++ < 20) {
          _swipeHintScheduled = true;
          setTimeout(tryShow, 300);
        }
        return;
      }

      // Already shown / not fully dismissed?
      if (document.getElementById('kis-swipe-hint')) return;

      const hint = document.createElement('div');
      hint.id = 'kis-swipe-hint';
      hint.innerHTML = '<span class="kish-arrow kish-left">‹</span><span>Swipe to explore</span><span class="kish-arrow kish-right">›</span>';
      hint.style.left = (rect.left + rect.width / 2) + 'px';
      hint.style.top  = (rect.top  + rect.height / 2) + 'px';
      document.body.appendChild(hint);
      // Next frame: mark visible so transition fires.
      requestAnimationFrame(() => hint.setAttribute('data-visible', ''));

      window.addEventListener('touchstart', onHintInteract, { capture: true, passive: true });
      window.addEventListener('pointerdown', onHintInteract, { capture: true });

      setTimeout(() => dismissSwipeHint('timeout'), 3500);
    };

    // Give the dashboard a moment to mount the swipe-card after patchHALayout.
    setTimeout(tryShow, 600);
  }

  // ─── Priority-zone carousel slide-index tracker ────────────────────────────
  // simple-swipe-card v2.8.2 exposes `currentIndex` as a direct property on
  // the element. It doesn't dispatch `slide-changed` and its `.active-slide`
  // class is vertical-only. Multiple reader strategies below — we use
  // whichever is most authoritative at call time.
  //
  // Signals on every swipe (real-device verified):
  //   - pointerup / touchend on the card (we add our own handlers)
  //   - .slider element transform mutation (animation frames)
  //   - transitionend on .slider when the animation settles
  //   - cardEl.currentIndex property after settle
  //
  const PRIORITY_SLIDE_ENTITY = 'input_number.priority_slide_index';
  let _swipeObserverEl = null;
  let _swipeObserverInstance = null;
  let _swipeTransitionCleanup = null;
  let _swipePollTimer = null;
  let _swipePointerCleanup = null;
  let _swipeObserverAttempts = 0;
  let _lastPushedSlideIndex = -1;

  // Read the active slide index using whichever signal is available,
  // in order of authority. Returns -1 if none yield a valid number.
  function readSwipeIndex(cardEl) {
    if (!cardEl) return -1;

    if (typeof cardEl.currentIndex === 'number' && cardEl.currentIndex >= 0) {
      return cardEl.currentIndex;
    }

    const sr = cardEl.shadowRoot;
    if (!sr) return -1;

    const active = sr.querySelector('.active-slide');
    if (active) {
      const parent = active.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (n) => n.classList && n.classList.contains('slide')
        );
        const idx = siblings.indexOf(active);
        if (idx >= 0) return idx;
      }
    }

    // Fallback: derive index from .slider transform matrix / slide width.
    const slider = sr.querySelector('.slider');
    const firstSlide = sr.querySelector('.slide');
    if (slider && firstSlide) {
      const w = firstSlide.getBoundingClientRect().width || 0;
      if (w > 0) {
        const t = getComputedStyle(slider).transform;
        let tx = 0;
        if (t && t !== 'none') {
          const m = t.match(/matrix.*\((.+)\)/);
          if (m) {
            const parts = m[1].split(',').map(parseFloat);
            tx = parts.length === 6 ? parts[4] : (parts[12] || 0);
          }
        }
        const idx = Math.round(Math.abs(tx) / w);
        if (!Number.isNaN(idx) && idx >= 0) return idx;
      }
    }

    return -1;
  }

  function pushSlideIndex(idx) {
    if (idx < 0 || idx === _lastPushedSlideIndex) return;
    const hass = getHass();
    if (!hass) return;
    const ent = getState(hass, PRIORITY_SLIDE_ENTITY);
    if (!ent) return;
    const current = Math.round(parseFloat(ent.state));
    _lastPushedSlideIndex = idx;
    if (current === idx) return;
    hass.callService('input_number', 'set_value', {
      entity_id: PRIORITY_SLIDE_ENTITY,
      value: idx,
    });
  }

  function observeSwipeSlideIndex() {
    if (!onMobileDashboard()) return;

    const teardown = () => {
      if (_swipeObserverInstance) {
        try { _swipeObserverInstance.disconnect(); } catch (e) {}
      }
      _swipeObserverInstance = null;
      if (_swipeTransitionCleanup) {
        try { _swipeTransitionCleanup(); } catch (e) {}
      }
      _swipeTransitionCleanup = null;
      if (_swipePointerCleanup) {
        try { _swipePointerCleanup(); } catch (e) {}
      }
      _swipePointerCleanup = null;
      if (_swipePollTimer) {
        clearInterval(_swipePollTimer);
        _swipePollTimer = null;
      }
      _swipeObserverEl = null;
    };

    const tryAttach = () => {
      const swipeCard = findSwipeCardEl(document.body);
      if (!swipeCard) {
        if (_swipeObserverAttempts++ < 30) setTimeout(tryAttach, 400);
        return;
      }
      if (_swipeObserverEl === swipeCard && _swipeObserverInstance) {
        return;
      }
      teardown();
      _swipeObserverEl = swipeCard;
      _lastPushedSlideIndex = -1;

      // Initial push so HA reflects the mounted carousel's starting slide.
      pushSlideIndex(readSwipeIndex(swipeCard));

      let debounceTimer = null;
      const schedule = (reason) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const idx = readSwipeIndex(swipeCard);
          pushSlideIndex(idx);
        }, 80);
      };

      // 1) Mutation observer on the shadow root subtree — fires on transform
      //    updates (.slider style attr) and class/attribute flips.
      const mo = new MutationObserver(() => schedule('mutation'));
      const sr = swipeCard.shadowRoot;
      if (sr) {
        mo.observe(sr, {
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'data-visible-index', 'data-index'],
        });
      }
      _swipeObserverInstance = mo;

      // 2) transitionend on the slider — authoritative settle signal.
      const slider = sr ? sr.querySelector('.slider') : null;
      if (slider) {
        const onTransitionEnd = () => {
          const idx = readSwipeIndex(swipeCard);
          pushSlideIndex(idx);
        };
        slider.addEventListener('transitionend', onTransitionEnd, true);
        _swipeTransitionCleanup = () => slider.removeEventListener('transitionend', onTransitionEnd, true);
      }

      // 3) Pointer/touch handlers on the card itself — catches every swipe
      //    the user makes, even if other signals don't fire. Also powers the
      //    60s swipe-away cooldown: if the user swipes off the active camera
      //    tile (rendered-index 0 during priority motion), we record the
      //    cooldown timestamp so autoSnapPriorityCamera won't yank them back.
      const onPointerUp = () => {
        const preIdx = readSwipeIndex(swipeCard);
        setTimeout(() => {
          const postIdx = readSwipeIndex(swipeCard);
          pushSlideIndex(postIdx);
          if (preIdx === 0 && postIdx !== 0 && postIdx > 0) {
            const h = getHass();
            if (h) {
              const ps = getState(h, 'sensor.priority_camera');
              const cam = ps && ps.state;
              if (PRIORITY_CAMERA_MAP[cam]) {
                _cameraCooldownUntil[cam] = Date.now() + SWIPE_AWAY_COOLDOWN_MS;
              }
            }
          }
        }, 120);
      };
      swipeCard.addEventListener('pointerup', onPointerUp, true);
      swipeCard.addEventListener('touchend', onPointerUp, true);
      _swipePointerCleanup = () => {
        swipeCard.removeEventListener('pointerup', onPointerUp, true);
        swipeCard.removeEventListener('touchend', onPointerUp, true);
      };

      // 4) Fallback poll at 750ms — belt-and-suspenders for any path the
      //    observer misses (theme remount, transient reflow).
      _swipePollTimer = setInterval(() => {
        const idx = readSwipeIndex(swipeCard);
        pushSlideIndex(idx);
      }, 750);
    };

    _swipeObserverAttempts = 0;
    setTimeout(tryAttach, 600);
  }

  // Opportunistic re-attach: if the page re-renders the swipe-card after
  // initial attach (e.g. after a theme reload or HA re-render), the cached
  // _swipeObserverEl becomes stale. Called from the 1-s tick in addRoots().
  function maybeReattachSwipeObserver() {
    if (!onMobileDashboard()) return;
    const swipeCard = findSwipeCardEl(document.body);
    if (!swipeCard) {
      if (_swipeObserverEl) {
        // Card was present but now isn't — tear down.
        if (_swipeObserverInstance) try { _swipeObserverInstance.disconnect(); } catch (e) {}
        if (_swipeTransitionCleanup) try { _swipeTransitionCleanup(); } catch (e) {}
        if (_swipePointerCleanup) try { _swipePointerCleanup(); } catch (e) {}
        if (_swipePollTimer) clearInterval(_swipePollTimer);
        _swipeObserverEl = null;
        _swipeObserverInstance = null;
        _swipeTransitionCleanup = null;
        _swipePointerCleanup = null;
        _swipePollTimer = null;
      }
      return;
    }
    if (swipeCard !== _swipeObserverEl || !_swipeObserverInstance) {
      _swipeObserverAttempts = 0;
      observeSwipeSlideIndex();
    }
  }

  // ─── Priority-display zone height observer (Home page only) ──────────────
  // Right-column width W drives the carousel height (16:9 camera aspect) and
  // the left-column lock/cover card heights, so both columns end at the exact
  // same bottom edge. Runs only on /home and only when the sections-view is
  // in 2-column layout (portrait phone → 1-column stacked gets natural rows).
  //
  // Math:
  //   W      = right hui-grid-section contentRect.width
  //   swipeH = W * 9/16                     (camera-aspect zone height)
  //   labelH = measured section_label height
  //   gapH   = measured grid row-gap (HA default ≈ 8px)
  //   cardH  = (swipeH - labelH - 4*gapH) / 4
  //
  // Publishes --kis-zone-h and --kis-card-h on <html>. Custom properties
  // inherit through every shadow root, so button-card `extra_styles` hooks
  // (`:host { height: var(--kis-card-h) }`) pick them up without per-shadow
  // injection. Also writes inline height on the simple-swipe-card element
  // since its grid row is auto-sized once grid_options.rows is removed.
  let _zoneObserver = null;
  let _zoneRightSection = null;
  let _zoneSwipeCard = null;

  // Walk up from the swipe-card (across shadow boundaries) to the enclosing
  // hui-grid-section. That element's contentRect is the right-column width
  // used by the zone-height math. Querying from sectionsView downward misses
  // hui-grid-section because it's inside a shadow root.
  function findPriorityZoneSection() {
    const swipe = findSwipeCardEl(document.body);
    if (!swipe) return null;
    let el = swipe;
    for (let i = 0; i < 30; i++) {
      if (!el) break;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'hui-grid-section' || tag === 'hui-section') return el;
      const next = el.parentElement
        || (el.getRootNode && el.getRootNode() !== document ? el.getRootNode().host : null);
      if (!next || next === document.body || next === document.documentElement) break;
      el = next;
    }
    return swipe.parentElement || swipe;
  }

  function zoneIs2ColumnMode(rightSection) {
    if (!rightSection) return false;
    const sectionW = rightSection.getBoundingClientRect().width;
    return sectionW > 100 && sectionW < window.innerWidth * 0.75;
  }

  function measureZoneLabelHeight(section) {
    if (!section) return 20;
    const first = section.firstElementChild;
    if (first) {
      const r = first.getBoundingClientRect();
      if (r.height > 0 && r.height < 60) return Math.ceil(r.height);
    }
    return 20;
  }

  function measureZoneGap(section) {
    if (!section) return 8;
    const s = getComputedStyle(section);
    const g = parseFloat(s.rowGap) || parseFloat(s.gap);
    return isFinite(g) && g > 0 ? g : 8;
  }

  function clearZoneVars() {
    const ds = document.documentElement.style;
    ds.removeProperty('--kis-zone-h');
    ds.removeProperty('--kis-card-h');
    if (_zoneSwipeCard) _zoneSwipeCard.style.removeProperty('height');
  }

  function recomputeZoneHeight() {
    if (!_zoneRightSection) return;
    const W = _zoneRightSection.getBoundingClientRect().width;
    if (!W || W < 100) return;
    const swipeH = Math.round(W * 9 / 16);
    const labelH = measureZoneLabelHeight(_zoneRightSection);
    const gapH = measureZoneGap(_zoneRightSection);
    const cardH = Math.max(48, Math.round((swipeH - labelH - 4 * gapH) / 4));
    const ds = document.documentElement.style;
    const zonePx = swipeH + 'px';
    const cardPx = cardH + 'px';
    if (ds.getPropertyValue('--kis-zone-h') !== zonePx) {
      ds.setProperty('--kis-zone-h', zonePx);
    }
    if (ds.getPropertyValue('--kis-card-h') !== cardPx) {
      ds.setProperty('--kis-card-h', cardPx);
    }
    // Re-find swipe-card if we lost it (or never had it) — the first observer
    // attach often beats the swipe-card's shadow-dom mount.
    if (!_zoneSwipeCard || !_zoneSwipeCard.isConnected) {
      _zoneSwipeCard = findSwipeCardEl(_zoneRightSection) || findSwipeCardEl(document.body);
    }
    if (_zoneSwipeCard && _zoneSwipeCard.style.height !== zonePx) {
      _zoneSwipeCard.style.height = zonePx;
      // Force Android WebView reflow so percent-height descendants re-evaluate.
      void _zoneSwipeCard.offsetHeight;
    }
  }

  function installZoneHeightObserver() {
    if (!onMobileDashboard() || getActiveSlug() !== 'home') {
      if (_zoneObserver) { try { _zoneObserver.disconnect(); } catch (e) {} }
      _zoneObserver = null;
      _zoneRightSection = null;
      _zoneSwipeCard = null;
      clearZoneVars();
      return;
    }
    const rightSection = findPriorityZoneSection();
    if (!rightSection) return;

    if (rightSection !== _zoneRightSection) {
      if (_zoneObserver) { try { _zoneObserver.disconnect(); } catch (e) {} }
      _zoneRightSection = rightSection;
      _zoneSwipeCard = findSwipeCardEl(rightSection);
      _zoneObserver = new ResizeObserver(() => {
        recomputeZoneHeight();
      });
      try { _zoneObserver.observe(_zoneRightSection); } catch (e) {}
    } else if (!_zoneSwipeCard) {
      _zoneSwipeCard = findSwipeCardEl(rightSection);
    }

    // ResizeObserver's initial fire is sometimes skipped on Android WebView
    // mid-attach — run a synchronous compute pass so the first paint is right.
    recomputeZoneHeight();
  }

  // ─── Priority-camera auto-snap (camera-as-carousel-tile) ───────────────────
  // Cameras live as conditional tiles inside the simple-swipe-card priority
  // zone (dashboard_mobilev1.json home view). When a camera's sticky motion
  // sensor is ON its tile appears in the carousel; when it clears the tile
  // disappears. The tier-priority state machine (see configuration.yaml +
  // automations.yaml) guarantees the highest-priority active camera is the
  // first rendered tile, so auto-snap target is always rendered-index 0.
  //
  // PRIORITY_CAMERA_MAP is the public contract shared with sensor.priority_camera
  // — do NOT change the key alphabet (doorbell / living_room / izzy / none).
  //
  // Swipe-away cooldown: if the user actively swipes off the active camera
  // tile (pointer-up transitions carousel from index 0 to a later tile
  // while a camera is priority), we record a 60s cooldown for that camera
  // entity. During that window autoSnapPriorityCamera won't force-snap
  // back to the same camera — the user wanted a break.
  const PRIORITY_CAMERA_MAP = {
    doorbell: 'camera.doorbell',
    living_room: 'camera.nest_cam_2',
    izzy: 'camera.nest_cam_1',
    nanit_benjamin: 'camera.nanit_benjamin',
    nanit_travel: 'camera.nanit_travel',
  };
  const SWIPE_AWAY_COOLDOWN_MS = 60000;
  const _cameraCooldownUntil = Object.create(null);
  let _lastSnappedPriorityCamera = null;

  function saveAndRestoreScroll() {
    var huiShadow = getHuiShadow();
    if (!huiShadow) return;
    var viewEl = huiShadow.querySelector('#view');
    if (!viewEl) return;
    var sectionsView = viewEl.querySelector('hui-sections-view');
    var scrollEl = sectionsView || viewEl;
    var saved = scrollEl.scrollTop;
    if (!saved || saved <= 0) return;
    console.log('[KIS scroll fix]', 'scrollEl:', scrollEl.tagName,
      'saved:', saved, 'scrollBehavior:', getComputedStyle(scrollEl).scrollBehavior);
    var prevBehavior = scrollEl.style.scrollBehavior;
    scrollEl.style.scrollBehavior = 'auto';
    setTimeout(function () {
      scrollEl.style.scrollBehavior = 'auto';
      scrollEl.scrollTop = saved;
      setTimeout(function () {
        scrollEl.scrollTop = saved;
        scrollEl.style.scrollBehavior = prevBehavior || '';
      }, 100);
    }, 200);
  }

  function autoSnapPriorityCamera() {
    if (!onMobileDashboard()) return;
    const hass = getHass();
    if (!hass) return;
    const ps = getState(hass, 'sensor.priority_camera');
    if (!ps) return;
    const cam = ps.state;

    if (!PRIORITY_CAMERA_MAP[cam]) {
      if (_lastSnappedPriorityCamera !== null) {
        saveAndRestoreScroll();
      }
      _lastSnappedPriorityCamera = null;
      return;
    }

    // Already snapped (or acknowledged) this priority-state — don't re-snap
    // on every tick. Lets the user navigate manually during a takeover.
    if (cam === _lastSnappedPriorityCamera) return;

    // Cooldown: mark as acknowledged so we don't snap the moment the
    // cooldown window expires. Only a transition through `none` back to a
    // camera will trigger another snap.
    if (Date.now() < (_cameraCooldownUntil[cam] || 0)) {
      _lastSnappedPriorityCamera = cam;
      return;
    }

    if (_lastSnappedPriorityCamera === null) {
      saveAndRestoreScroll();
    }

    const swipeCard = findSwipeCardEl(document.body);
    if (!swipeCard || typeof swipeCard.goToSlide !== 'function') return;
    try {
      swipeCard.goToSlide(0);
      _lastSnappedPriorityCamera = cam;
    } catch (e) {}
  }

  // ─── Cameras stagger removed (2026-04-22) ──────────────────────────────────
  // All cameras now stream via Frigate's embedded go2rtc (local RTSP).
  // No Nest SDM rate limits — stagger logic no longer needed.

  // ─── Camera placeholder (no-flash stream init) ────────────────────────────
  // v31 approach — hoist the fix to the earliest possible point: patch
  // hui-picture-entity-card.prototype.connectedCallback so EVERY instance
  // receives our placeholder CSS the moment it connects, BEFORE its own
  // first paint. v29's DOM-injected overlay and v30's post-hoc shadow CSS
  // both lost the race against picture-entity's first render on FKB. The
  // prototype patch wins the race by being part of the same connection
  // sequence as the element's render.
  //
  // Two-layer defense:
  //  1. Host opacity: 0 at connectedCallback start, transitioned to 1 once
  //     the shadow-root CSS is in place and the host is flagged as one of
  //     our cameras (data-kis-cam). Keeps the bare-ha-card flash off-screen
  //     during the first frames.
  //  2. Shadow-root CSS gated on :host([data-kis-cam]) paints the placeholder
  //     via ha-card::before and holds hui-image/video/img at opacity: 0
  //     until :host([data-kis-cam].kis-feed-ready) flips on.
  //
  // markFeedReady adds the `kis-feed-ready` class on the host when the
  // underlying video/img fires loadeddata/playing/load. This is a CLASS,
  // not an attribute — requested by Chris 2026-04-21 and matches the user-
  // spec selector hui-picture-entity-card.kis-feed-ready { opacity: 1 }.
  //
  // Day/night colors come from documentElement CSS variables set in
  // renderHeaderContent (--kis-cam-placeholder-bg/-text/-border). CSS
  // custom properties inherit through shadow-DOM boundaries.
  const PLACEHOLDER_CAM_ENTITIES = [
    'camera.doorbell',
    'camera.nest_cam_2',
    'camera.nest_cam_1',
    'camera.nanit_benjamin',
    'camera.nanit_travel',
  ];
  const CAM_PLACEHOLDER_CSS_ID = 'kis-cam-placeholder';
  // Applied unconditionally to every hui-picture-entity-card shadow root via
  // the prototype patch below. Every picture-entity card on this dashboard
  // is one of our 5 cameras (verified 2026-04-21), so unconditional is safe;
  // the flip gate is the `kis-feed-ready` class that JS adds once the feed
  // element fires loadeddata/playing/load.
  const CAM_PLACEHOLDER_CSS = `
    /* Overlay-only approach: we DON'T touch hui-image / video / img
       rendering — picture-entity keeps its native layout and the stream
       paints pixels normally. We just paint a ha-card::before overlay ON
       TOP of the feed until markFeedReady adds .kis-feed-ready to the host.
       Safer than hiding internals — doesn't starve the WebView of rendering
       signals (which was the v31/v32 Tab S9 regression). */
    ha-card {
      background: var(--kis-cam-placeholder-bg, #151c2a) !important;
    }
    /* v34: paint the <video> element's OWN background to match the
       placeholder. Android WebView 146 paints empty <video> black by UA
       default — visible during the 300ms overlay fade-out as a flash
       between placeholder and live frames. Setting background-color is
       safe (not opacity — doesn't starve the decoder the way v31/v32
       did). Covers WebRTC (ha-web-rtc-player), HLS (ha-hls-player), and
       any nested hui-image/ha-camera-stream render tree. */
    video,
    hui-image video,
    ha-camera-stream video,
    ha-hls-player video,
    ha-web-rtc-player video {
      background-color: var(--kis-cam-placeholder-bg, #151c2a) !important;
    }
    ha-card::before {
      content: var(--kis-cam-label-text, "CAMERA");
      position: absolute;
      inset: 0;
      z-index: 5;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 6px;
      background: var(--kis-cam-snapshot, none) center/100% 100% no-repeat;
      background-color: var(--kis-cam-placeholder-bg, #151c2a);
      color: rgba(255,255,255,0.5);
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,0.6);
      pointer-events: none;
      border-radius: inherit;
      transition: opacity 100ms ease;
    }
    :host(.kis-feed-ready) ha-card::before {
      opacity: 0;
      animation: none;
    }
  `;

  function findAllCameraPictureEntities() {
    const out = [];
    const seen = new Set();
    function walk(root) {
      if (!root || seen.has(root)) return;
      seen.add(root);
      const pes = root.querySelectorAll
        ? root.querySelectorAll('hui-picture-entity-card')
        : [];
      for (const pe of pes) {
        const cfg = pe._config || pe.config;
        if (cfg && PLACEHOLDER_CAM_ENTITIES.indexOf(cfg.entity) !== -1) {
          out.push(pe);
        }
      }
      const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of all) {
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    }
    walk(document.body);
    return out;
  }

  function findFeedElement(peShadowRoot) {
    function walk(root) {
      if (!root) return null;
      const hit = root.querySelector('video, img');
      if (hit) return hit;
      const all = root.querySelectorAll('*');
      for (const el of all) {
        if (el.shadowRoot) {
          const hit2 = walk(el.shadowRoot);
          if (hit2) return hit2;
        }
      }
      return null;
    }
    return walk(peShadowRoot);
  }

  function cameraFriendlyName(entityId) {
    const hass = getHass();
    if (hass && hass.states && hass.states[entityId]) {
      const s = hass.states[entityId];
      if (s.attributes && s.attributes.friendly_name) return s.attributes.friendly_name;
    }
    return (entityId || '')
      .replace(/^camera\./, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function markFeedReady(pe) {
    if (!pe || pe.classList.contains('kis-feed-ready')) return;
    pe.classList.add('kis-feed-ready');
    if (pe._kisCamPoll) { clearInterval(pe._kisCamPoll); pe._kisCamPoll = null; }
    if (pe._kisCamSafetyTimer) { clearTimeout(pe._kisCamSafetyTimer); pe._kisCamSafetyTimer = null; }
  }

  function installPlaceholderCSS(pe) {
    if (!pe || !pe.shadowRoot) return false;
    return injectShadowCSS(pe.shadowRoot, CAM_PLACEHOLDER_CSS_ID, CAM_PLACEHOLDER_CSS);
  }

  // Walk shadow tree rooted at `root`, invoking `fn(pe)` for every
  // hui-picture-entity-card host encountered. Used to retroactively reach
  // instances that were already connected before we patched the prototype.
  function walkPictureEntities(root, fn) {
    if (!root) return;
    const seen = new Set();
    function walk(r) {
      if (!r || seen.has(r)) return;
      seen.add(r);
      const pes = r.querySelectorAll ? r.querySelectorAll('hui-picture-entity-card') : [];
      for (const pe of pes) fn(pe);
      const all = r.querySelectorAll ? r.querySelectorAll('*') : [];
      for (const el of all) if (el.shadowRoot) walk(el.shadowRoot);
    }
    walk(root);
  }

  function armPictureEntityHost(pe) {
    if (!pe || pe._kisCamArmed) return;
    pe._kisCamArmed = true;
    // Install the shadow-root CSS as soon as a shadow root exists. For
    // lit-element based cards (all HA cards), shadowRoot is created in the
    // constructor, so this succeeds on the first tick. The CSS paints the
    // ha-card placeholder background + ::before label AND holds hui-image/
    // video/img at opacity:0 — host stays visible so the placeholder shows.
    installPlaceholderCSS(pe);
    armEntityOnceConfigReady(pe, 0);
  }

  function armEntityOnceConfigReady(pe, attempts) {
    const cfg = pe._config || pe.config;
    if (!cfg || !cfg.entity) {
      if (attempts < 50) {
        setTimeout(() => armEntityOnceConfigReady(pe, attempts + 1), 60);
      }
      return;
    }
    installPlaceholderCSS(pe);
    const isOurs = PLACEHOLDER_CAM_ENTITIES.indexOf(cfg.entity) !== -1;
    if (!isOurs) {
      // Not one of our allowlist — skip placeholder wiring. CSS applied to its
      // shadow root is still harmless (just hides internals until
      // kis-feed-ready). Mark feed-ready immediately so the feed shows.
      markFeedReady(pe);
      return;
    }
    if (!pe._kisCamLabelSet) {
      const label = cameraFriendlyName(cfg.entity);
      const safe = String(label).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      pe.style.setProperty('--kis-cam-label-text', '"' + safe + '"');
      const camName = cfg.entity.replace(/^camera\./, '');
      const snapUrl = 'http://192.168.51.179:5000/api/' + camName + '/latest.jpg?t=' + Date.now();
      pe.style.setProperty('--kis-cam-snapshot', 'url("' + snapUrl + '")');
      pe._kisCamLabelSet = true;
    }
    watchFeedReady(pe);
  }

  // v34: reveal gate tightened to `playing` only (dropped `loadeddata` +
  // `canplay`). loadeddata fires as soon as the decoder has ONE frame
  // buffered — on Nest SDM WebRTC that first buffered frame is typically a
  // black I-frame, so revealing on loadeddata cross-dissolves the
  // placeholder into a black video element. `playing` fires only once the
  // stream is actually producing subsequent frames, so the 300ms overlay
  // fade now crosses into live pixels. For <img> feeds (Nanit MJPEG, Vivint
  // snapshot) the `load` event is unchanged — still the right signal.
  // readyState check moved from >= 2 (HAVE_CURRENT_DATA) to >= 3
  // (HAVE_FUTURE_DATA) and conjunct with !paused to approximate "is
  // currently playing" for initial / polled checks. Safety timer (3s) and
  // interval cap (5s) preserved as the hard backstop.
  function videoIsPlaying(v) {
    return !!v && v.readyState >= 3 && !v.paused;
  }

  function watchFeedReady(pe) {
    if (!pe || !pe.shadowRoot) return;
    if (pe.classList.contains('kis-feed-ready')) return;
    if (pe._kisCamPoll) return;

    const sr = pe.shadowRoot;
    const feedNow = findFeedElement(sr);
    if (feedNow) {
      const nowReady = feedNow.tagName === 'VIDEO'
        ? videoIsPlaying(feedNow)
        : (feedNow.tagName === 'IMG' ? (feedNow.complete && feedNow.naturalHeight > 0) : false);
      if (nowReady) { markFeedReady(pe); return; }
    }

    // Fire-and-forget ceiling: no matter what, reveal the feed within 3 s.
    // Android WebView doesn't reliably fire `playing` for some stream
    // types (rare, but exists) nor `load` for MJPEG image streams that
    // re-use a connection, so waiting beyond this risks a permanently-
    // hidden feed. 3 s is enough to cover the first-frame paint in
    // practice; if the stream hasn't started yet the user sees the native
    // loading spinner which is fine.
    pe._kisCamSafetyTimer = setTimeout(() => markFeedReady(pe), 3000);

    let tries = 0;
    pe._kisCamPoll = setInterval(() => {
      tries++;
      const feed = findFeedElement(sr);
      let ready = false;
      if (feed) {
        if (feed.tagName === 'VIDEO') {
          ready = videoIsPlaying(feed);
          if (!ready && !feed._kisReadyHandler) {
            feed._kisReadyHandler = () => markFeedReady(pe);
            feed.addEventListener('playing', feed._kisReadyHandler);
          }
        } else if (feed.tagName === 'IMG') {
          ready = feed.complete && feed.naturalHeight > 0;
          if (!ready && !feed._kisReadyHandler) {
            feed._kisReadyHandler = () => markFeedReady(pe);
            feed.addEventListener('load', feed._kisReadyHandler);
          }
        }
      }
      if (ready) {
        markFeedReady(pe);
      } else if (tries > 10) {
        // 5 s hard cap via interval count (belt-and-suspenders with timer).
        markFeedReady(pe);
      }
    }, 500);
  }

  function updateCameraPlaceholders() {
    if (!onMobileDashboard()) return;
    const slug = getActiveSlug();
    if (slug !== 'cameras' && slug !== 'home') return;
    walkPictureEntities(document.body, (pe) => armPictureEntityHost(pe));
  }

  // Monkey-patch hui-picture-entity-card.connectedCallback to inject the
  // placeholder CSS at the earliest possible point — before HA's own render
  // pipeline paints the first black <video>. Shadow-root CSS paints the
  // ha-card placeholder bg + ::before label AND holds hui-image/video at
  // opacity:0. Host opacity stays at 1 so the placeholder shows.
  let _pictureEntityProtoPatched = false;
  function patchPictureEntityPrototype() {
    if (_pictureEntityProtoPatched) return;
    const Ctor = customElements.get('hui-picture-entity-card');
    if (!Ctor || !Ctor.prototype) return;
    _pictureEntityProtoPatched = true;
    const origConnected = Ctor.prototype.connectedCallback;
    Ctor.prototype.connectedCallback = function() {
      // Shadow root is created in the constructor for lit-element cards —
      // so it already exists here and we can inject CSS before any render.
      installPlaceholderCSS(this);
      this._kisCamArmed = true;
      const r = origConnected ? origConnected.apply(this, arguments) : undefined;
      // Config lands via setConfig (separate call from HA). Poll for it.
      armEntityOnceConfigReady(this, 0);
      return r;
    };
    // Catch any instances that connected BEFORE we patched the prototype
    // (script-load timing).
    walkPictureEntities(document.body, (pe) => armPictureEntityHost(pe));
  }

  let _camPlaceholderBurstTimer = null;
  function startCameraPlaceholderBurst() {
    if (_camPlaceholderBurstTimer) clearInterval(_camPlaceholderBurstTimer);
    let ticks = 0;
    _camPlaceholderBurstTimer = setInterval(() => {
      ticks++;
      updateCameraPlaceholders();
      if (ticks >= 100) { // 100 * 60ms = 6 s
        clearInterval(_camPlaceholderBurstTimer);
        _camPlaceholderBurstTimer = null;
      }
    }, 60);
  }

  let _camPlaceholderDefinedHooked = false;
  function hookPictureEntityDefinition() {
    if (_camPlaceholderDefinedHooked) return;
    _camPlaceholderDefinedHooked = true;
    try {
      customElements.whenDefined('hui-picture-entity-card').then(() => {
        patchPictureEntityPrototype();
        startCameraPlaceholderBurst();
      });
    } catch (e) { /* older browsers — burst still covers us */ }
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
        maybeShowSwipeHint();
        observeSwipeSlideIndex();
        autoSnapPriorityCamera();
        updateCameraPlaceholders();
        startCameraPlaceholderBurst();
        installZoneHeightObserver();
      }, 100);
    } else {
      nav.setAttribute('hidden', '');
      header.setAttribute('hidden', '');
      const player = document.getElementById('kis-mini-player');
      if (player) player.setAttribute('hidden', '');
      _headerInitialized = false;
      _prevMediaState = null;
    }
  }

  // ─── Injection ─────────────────────────────────────────────────────────────
  function inject() {
    if (document.getElementById('kis-nav-bar')) {
      syncState();
      return;
    }

    // Clean up leftover v27 swipe debug surface (pill + localStorage flags).
    try {
      const stale = document.getElementById('kis-swipe-debug');
      if (stale) stale.remove();
      localStorage.removeItem('kis_swipe_debug');
      localStorage.removeItem('kis_swipe_debug_auto_v27');
    } catch (e) {}

    // Resolve safe-area-inset-top via CSS custom property (WKWebView fix)
    initSafeAreaTop();

    // Kick the camera-placeholder pipeline the moment hui-picture-entity-card
    // is defined — earliest opportunity to inject shadow-root CSS before any
    // instance paints a black <video> element.
    hookPictureEntityDefinition();

    // Inject shared styles + global app-header hide
    const styleEl = document.createElement('style');
    styleEl.id = 'kis-styles';
    styleEl.textContent = NAV_CSS + HEADER_CSS + SWIPE_HINT_CSS + `
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
      btn.innerHTML = `<ha-icon icon="${page.icon}"></ha-icon><span class="knb-label">${page.label}</span>`;
      if (page.slug === 'settings') {
        const badge = document.createElement('span');
        badge.className = 'knb-badge';
        badge.setAttribute('hidden', '');
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => navigate(page.slug));
      nav.appendChild(btn);
    });
    document.body.appendChild(nav);

    // Build mini-player (above nav bar, below header)
    const player = document.createElement('div');
    player.id = 'kis-mini-player';
    player.setAttribute('hidden', '');
    player.innerHTML = `
      <div class="kmp-art"><ha-icon icon="mdi:music-note"></ha-icon></div>
      <div class="kmp-info">
        <div class="kmp-track">Not playing</div>
        <div class="kmp-artist"></div>
      </div>
      <button class="kmp-play" aria-label="Play/Pause">
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
      <div class="kmp-progress"><div class="kmp-progress-fill" style="width:0%"></div></div>
    `;
    player.querySelector('.kmp-play').addEventListener('click', () => {
      const hass = getHass();
      if (!hass) return;
      const ent = getState(hass, MEDIA_PLAYER_ENTITY);
      if (!ent) return;
      hass.callService('media_player', ent.state === 'playing' ? 'media_pause' : 'media_play', {
        entity_id: MEDIA_PLAYER_ENTITY,
      });
    });
    // Tap anywhere on mini-player (except play button) opens more-info
    player.addEventListener('click', (e) => {
      if (e.target.closest('.kmp-play')) return;
      const ha = document.querySelector('home-assistant');
      if (ha) {
        ha.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true, composed: true,
          detail: { entityId: MEDIA_PLAYER_ENTITY },
        }));
      }
    });
    document.body.appendChild(player);

    // Build top header
    const header = document.createElement('div');
    header.id = 'kis-header-bar';
    if (!onMobileDashboard()) header.setAttribute('hidden', '');
    document.body.appendChild(header);

    // Event delegation: pill clicks → open HA more-info dialog
    header.addEventListener('click', (e) => {
      let entityId = null;

      // Alarm pill → alarm control panel
      const alarmEl = e.target.closest('.kh-alarm');
      if (alarmEl) {
        entityId = 'alarm_control_panel.kuprycz_home';
      }

      // Person pill → person entity (shows map location)
      const personEl = e.target.closest('.kh-person-pill');
      if (personEl && personEl.dataset.entity) {
        entityId = personEl.dataset.entity;
      }

      if (entityId) {
        const ha = document.querySelector('home-assistant');
        if (ha) {
          ha.dispatchEvent(new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: entityId },
          }));
        }
      }
    });

    syncState();

    window.addEventListener('location-changed', syncState);
    window.addEventListener('popstate', syncState);

    // Re-measure header clearance on any resize or orientation change
    window.addEventListener('resize', () => {
      applyDynamicHeaderClearance();
      // Re-patch HA layout after resize to handle section column reflow
      setTimeout(() => {
        patchHALayout(0);
        installZoneHeightObserver();
      }, 200);
    });
    window.addEventListener('orientationchange', () => {
      // Orientation change: delay for reflow, then re-measure + re-patch fully.
      // HA sections-view may need a fresh patch for new column count.
      setTimeout(() => {
        applyDynamicHeaderClearance();
        // Clear stale padding flags so patchHALayout re-applies
        document.querySelectorAll('hui-sections-view').forEach(el => {
          delete el._kisPadded;
        });
        patchHALayout(0);
        installZoneHeightObserver();
        // Second pass after HA finishes internal reflow
        setTimeout(() => {
          applyDynamicHeaderClearance();
          patchHALayout(0);
          installZoneHeightObserver();
        }, 500);
      }, 150);
    });

    // Event-driven priority camera subscription — reacts instantly to
    // sensor.priority_camera state changes instead of waiting for 1s poll.
    (function installPriorityCameraSubscription() {
      if (!window.hassConnection) {
        setTimeout(installPriorityCameraSubscription, 500);
        return;
      }
      window.hassConnection.then(function (result) {
        var conn = result.conn;
        if (!conn || !conn.subscribeEvents) return;
        conn.subscribeEvents(function (event) {
          if (event.data && event.data.entity_id === 'sensor.priority_camera') {
            autoSnapPriorityCamera();
          }
        }, 'state_changed');
      }).catch(function () {});
    })();

    // Update header content every second (live clock + entity states).
    // Also opportunistically re-attach the swipe-card observer, and refresh
    // camera placeholders, in case elements remounted since last syncState.
    setInterval(() => {
      if (onMobileDashboard()) {
        renderHeaderContent();
        maybeReattachSwipeObserver();
        updateCameraPlaceholders();
        installZoneHeightObserver();
      }
    }, 1000);

    // Instant theme sync: watch for CSS variable changes on documentElement.
    // When HA switches themes, it updates inline style on <html> — this fires
    // immediately (no 1-second polling delay for header/nav bar theme toggle).
    const themeObserver = new MutationObserver(() => {
      if (onMobileDashboard()) renderHeaderContent();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    // Also observe the home-assistant element for theme attribute changes
    const haEl = document.querySelector('home-assistant');
    if (haEl) {
      themeObserver.observe(haEl, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }

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

  // Kick the picture-entity prototype patch as early as kis-nav.js can run,
  // BEFORE boot() waits for ha-icon. customElements.whenDefined resolves as
  // soon as HA's bundle registers hui-picture-entity-card — at that moment
  // we patch connectedCallback to hide the host + inject placeholder CSS
  // on every future connection, and walk the tree to cover any instances
  // that connected before this script loaded. This is the earliest point
  // at which we can intercept picture-entity renders.
  hookPictureEntityDefinition();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    setTimeout(() => { if (!document.getElementById('kis-nav-bar')) inject(); }, 600);
  });
})();
