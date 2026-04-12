/**
 * kis-nav.js — KIS Fixed Bottom Navigation Bar  v5
 * Loaded via frontend: extra_module_url in configuration.yaml.
 * Injects a real DOM element into document.body (completely outside HA's
 * shadow DOM tree), so position:fixed is always viewport-relative.
 * Only visible when on the /dashboard-mobilev1/ dashboard.
 *
 * v5 changes:
 *  - Targeted fix for hui-sections-view scroll (HA 2024+ sections layout).
 *  - Added overflow-y: auto + -webkit-overflow-scrolling: touch to the
 *    ha-app-layout content container so iOS can scroll.
 *  - Also resets html/body overflow so iOS WebView doesn't block scroll.
 *  - Traverses into hui-sections-view shadow root if accessible.
 */
(function () {
  'use strict';

  const DASHBOARD_PREFIX = '/dashboard-mobilev1';
  const NAV_H = 80; // px — nav bar height + safe-area buffer

  const PAGES = [
    { label: 'Home',    icon: 'mdi:home-variant',   slug: 'home' },
    { label: 'Climate', icon: 'mdi:thermometer',     slug: 'climate' },
    { label: 'Lights',  icon: 'mdi:lightbulb-group', slug: 'lights' },
    { label: 'Cameras', icon: 'mdi:cctv',            slug: 'cameras' },
    { label: 'Media',   icon: 'mdi:music-note',      slug: 'media' },
  ];

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
    #kis-nav-bar[hidden] {
      display: none !important;
    }
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
    #kis-nav-bar .knb-btn.knb-active {
      color: #00d4f0;
    }
    #kis-nav-bar .knb-btn ha-icon {
      --mdc-icon-size: 24px;
      display: block;
    }
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
    #kis-nav-bar .knb-btn.knb-active .knb-pill {
      opacity: 1;
    }
  `;

  // Injected into hui-root shadow: hide HA header, make #view scrollable
  function getHuiRootCSS() {
    return `
      app-header,
      .header,
      [id="header"] {
        display: none !important;
      }
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
      hui-sections-view,
      hui-masonry-view,
      hui-panel-view {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    `;
  }

  // Injected into ha-app-layout shadow: fix content container height + scroll
  function getAppLayoutCSS() {
    return `
      :host {
        --header-height: 0px !important;
        --app-header-height: 0px !important;
      }
      #contentContainer,
      [part="content"],
      .content {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-y: visible !important;
      }
    `;
  }

  // Injected into hui-sections-view shadow (if accessible): add bottom padding
  function getSectionsViewCSS() {
    return `
      :host {
        display: block;
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-bottom: ${NAV_H}px !important;
        box-sizing: border-box;
      }
      .container,
      .sections-container,
      [class*="container"] {
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-bottom: ${NAV_H}px !important;
      }
    `;
  }

  /**
   * Inject a <style> tag into a shadow root, keyed by id to avoid duplicates.
   */
  function injectShadowCSS(shadowRoot, id, css) {
    if (!shadowRoot) return false;
    if (shadowRoot.querySelector('#' + id)) return true; // already injected
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

  /**
   * Ensure html/body don't block iOS scroll.
   * HA sometimes sets overflow:hidden on body to prevent double-scroll.
   */
  function fixBodyScroll() {
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
  }

  /**
   * Traverse HA's shadow DOM and inject CSS patches.
   * Retried with backoff because HA renders asynchronously.
   */
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

      // HA drawer wraps the panel on newer versions; fall back to direct query
      let panel = null;
      const drawer = main.shadowRoot.querySelector('ha-drawer');
      if (drawer) panel = drawer.querySelector('ha-panel-lovelace');
      if (!panel) panel = main.shadowRoot.querySelector('ha-panel-lovelace');
      if (!panel?.shadowRoot) throw new Error('no panel');

      const huiRoot = panel.shadowRoot.querySelector('hui-root');
      if (!huiRoot?.shadowRoot) throw new Error('no hui-root');

      const huiShadow = huiRoot.shadowRoot;

      // Patch 1: hui-root — hide header, make #view the scroll container
      injectShadowCSS(huiShadow, 'kis-hui-patch', getHuiRootCSS());

      // Patch 2: ha-app-layout content container — clear top padding
      const appLayout = huiShadow.querySelector('ha-app-layout');
      if (appLayout?.shadowRoot) {
        injectShadowCSS(appLayout.shadowRoot, 'kis-applayout-patch', getAppLayoutCSS());
      }

      // Patch 3: hui-sections-view — add bottom clearance inside sections shadow
      const viewEl = huiShadow.querySelector('#view');
      if (viewEl) {
        const sectionsView = viewEl.querySelector('hui-sections-view');
        if (sectionsView?.shadowRoot) {
          injectShadowCSS(sectionsView.shadowRoot, 'kis-sections-patch', getSectionsViewCSS());
        }
        // If sections-view doesn't have shadow root, add padding to the element directly
        if (sectionsView && !sectionsView._kisPadded) {
          sectionsView.style.setProperty('padding-bottom', NAV_H + 'px', 'important');
          sectionsView._kisPadded = true;
        }
      }

    } catch (e) {
      if (attempt < maxAttempts) {
        const delay = Math.min(300 * (attempt + 1), 2000);
        setTimeout(() => patchHALayout(attempt + 1), delay);
      }
    }
  }

  function syncState() {
    const nav = document.getElementById('kis-nav-bar');
    if (!nav) return;

    if (onMobileDashboard()) {
      nav.removeAttribute('hidden');
      const activeSlug = getActiveSlug();
      nav.querySelectorAll('.knb-btn').forEach((btn) => {
        btn.classList.toggle('knb-active', btn.dataset.slug === activeSlug);
      });
      // Re-patch on every navigation — HA re-renders view elements
      // Reset _kisPadded so sections-view inline style re-applies on new view renders
      setTimeout(() => {
        // Clear cached patch flags so re-navigation re-applies patches
        document.querySelectorAll('hui-sections-view').forEach(el => {
          delete el._kisPadded;
        });
        patchHALayout(0);
      }, 100);
    } else {
      nav.setAttribute('hidden', '');
    }
  }

  function inject() {
    if (document.getElementById('kis-nav-bar')) {
      syncState();
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'kis-nav-styles';
    styleEl.textContent = NAV_CSS;
    document.head.appendChild(styleEl);

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
    syncState();

    window.addEventListener('location-changed', syncState);
    window.addEventListener('popstate', syncState);

    // Initial layout patch with retry
    setTimeout(() => patchHALayout(0), 500);
  }

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
