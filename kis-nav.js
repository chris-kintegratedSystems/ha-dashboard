/**
 * kis-nav.js — KIS Fixed Bottom Navigation + Fixed Header Bar  v23
 * Loaded via frontend: extra_module_url in configuration.yaml.
 * Injects real DOM elements into document.body (completely outside HA's
 * shadow DOM tree), so position:fixed is always viewport-relative.
 * Only visible when on the /dashboard-mobilev1/ dashboard.
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
  window.KIS_NAV_VERSION = 23;

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
    } else {
      bar.removeAttribute('data-kis-day');
      if (navBar) navBar.removeAttribute('data-kis-day');
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

    // Resolve safe-area-inset-top via CSS custom property (WKWebView fix)
    initSafeAreaTop();

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
      setTimeout(() => patchHALayout(0), 200);
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
        // Second pass after HA finishes internal reflow
        setTimeout(() => {
          applyDynamicHeaderClearance();
          patchHALayout(0);
        }, 500);
      }, 150);
    });

    // Update header content every second (live clock + entity states)
    setInterval(() => {
      if (onMobileDashboard()) renderHeaderContent();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    setTimeout(() => { if (!document.getElementById('kis-nav-bar')) inject(); }, 600);
  });
})();
