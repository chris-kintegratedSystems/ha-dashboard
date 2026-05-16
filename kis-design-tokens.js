/**
 * KIS Design Tokens — mobilev2
 * K Integrated Systems | Owner: Chris Kuprycz | Irving TX
 *
 * Single source of truth for all sizing, spacing, color, and responsive
 * constants across mobilev2 custom cards. All custom cards import from
 * this file. Change here = change everywhere.
 *
 * Extracted from mobilev1 dashboard_mobilev1.json + kis-nav.js v52.
 * See docs/KIS-DESIGN-LANGUAGE-V2.md for the full design language reference.
 */

export const KIS_TOKENS = {

  // ── Typography ──────────────────────────────────────────────────────────────
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Helvetica Neue', Roboto, Arial, sans-serif",

  fontSize: {
    heroTemp:     '52px',
    largeTemp:    '48px',
    clock:        '22px',
    cardName:     '15px',
    cardValue:    '14px',
    settingsTitle:'13px',
    cardLabel:    '11px',
    ampm:         '11px',
    sectionLabel: '10px',
    personName:   '10px',
    badge:        '10px',
    navLabel:     '9px',
    chipText:     '9px',
    dateText:     '9px',
    camLabel:     '9px',
  },

  fontWeight: {
    light:    '300',
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },

  letterSpacing: {
    tight:      '-0.04em',
    slightTight:'-0.02em',
    normal:     '0',
    wide:       '0.03em',
    wider:      '0.06em',
    label:      '0.08em',
    chip:       '0.12em',
    section:    '0.18em',
    roomLabel:  '0.2em',
  },

  // ── Spacing ─────────────────────────────────────────────────────────────────
  padding: {
    card:       '18px 16px',
    cardCompact:'14px 16px',
    climate:    '12px 14px',
    themeBtn:   '12px 8px',
    chipInner:  '2px 8px',
    personPill: '3px 8px 3px 5px',
    alarmPill:  '4px 9px',
    miniPlayer: '8px 14px',
    navBtn:     '12px 4px 10px',
  },

  gap: {
    scene:       '10px',
    header:      '8px',
    headerLeft:  '12px',
    pills:       '6px',
    pillInner:   '4px',
    miniPlayer:  '10px',
    navBtn:      '4px',
    alarmInner:  '5px',
    weatherInner:'5px',
  },

  // ── Fixed Dimensions ────────────────────────────────────────────────────────
  size: {
    navHeight:      '80px',
    navMinHeight:   '68px',
    headerMinHeight:'68px',
    miniPlayerH:    '52px',
    miniPlayerBot:  '80px',
    iconNav:        '22px',
    iconTheme:      '20px',
    iconScene:      '26px',
    iconLock:       '26px',
    iconCar:        '56px',
    climateBtn:     '40px',
    mediaArt:       '52px',
    miniArt:        '36px',
    personDot:      '7px',
    alarmDot:       '5px',
    badgeMin:       '16px',
    toggleTrackW:   '40px',
    toggleTrackH:   '22px',
    toggleKnob:     '18px',
    progressH:      '3px',
    progressHMini:  '2px',
  },

  // ── Border Radii ────────────────────────────────────────────────────────────
  radius: {
    card:       '14px',
    btn:        '12px',
    chip:       '20px',
    pill:       '14px',
    alarm:      '16px',
    art:        '10px',
    climateBtn: '8px',
    miniArt:    '6px',
    toggle:     '11px',
    progressBar:'3px',
    badge:      '8px',
  },

  // ── Colors: Night Mode (Default) ───────────────────────────────────────────
  night: {
    bgApp:           '#070910',
    bgCard:          'rgba(16,21,31,0.72)',
    bgCardSolid:     '#10151f',
    bgEmpty:         '#0b0e17',
    bgNav:           'rgba(7,9,16,0.95)',
    bgHeader:        'rgba(7,9,16,0.92)',
    bgMiniPlayer:    'rgba(11,14,23,0.95)',
    bgProgressTrack: '#1c2438',
    bgCamPlaceholder:'#151c2a',
    bgMiniArt:       '#151c2a',

    borderCard:      'rgba(255,255,255,0.06)',
    borderCardWeak:  'rgba(255,255,255,0.04)',
    borderFocus:     'rgba(0,212,240,0.22)',

    textPrimary:     '#eef2f8',
    textSecondary:   '#8a9ab8',
    textDisabled:    '#4a5570',
    textMuted:       '#2a3448',

    accent:          '#00d4f0',
    accentActiveBg:  'rgba(0,212,240,0.08)',
    green:           '#10d090',
    greenGlow:       '0 0 4px #10d090',
    blue:            '#4d8ef0',
    orange:          '#f5a623',
    red:             '#f04060',
    purple:          '#9d6ef0',

    sectionLabel:    '#4a5570',
    sectionRule:     'rgba(255,255,255,0.06)',

    lightsRoomBg:    'rgba(16,21,31,0.72)',
    lightsRoomBorder:'rgba(255,255,255,0.06)',
    lightsRoomName:  '#eef2f8',
    lightsRoomCount: '#8a95a6',
    lightsRowRule:   'rgba(255,255,255,0.04)',
    lightsName:      '#cfd5e0',
    lightsBarTrack:  'rgba(255,255,255,0.08)',
    lightsBarFill:   '#f5a623',
  },

  // ── Colors: Day Mode ───────────────────────────────────────────────────────
  day: {
    bgNav:           'rgba(255,255,255,0.96)',
    bgHeader:        'rgba(255,255,255,0.96)',
    bgMiniPlayer:    'rgba(255,255,255,0.96)',
    bgMiniArt:       '#e4e8f0',
    bgPersonPill:    'rgba(255,255,255,0.88)',
    bgProgressTrack: '#c0c8d4',
    bgCamPlaceholder:'#f0f2f5',

    borderNav:       'rgba(0,0,0,0.04)',
    borderPerson:    'rgba(0,0,0,0.05)',
    shadowNav:       '0 -1px 3px rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.03)',
    shadowHeader:    '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)',

    textPrimary:     '#1a2030',
    textSecondary:   '#4a5a72',
    textTertiary:    '#7a8698',

    accent:          '#0088a8',
    accentActiveBg:  'rgba(0,136,168,0.08)',
    green:           '#089464',
    greenGlow:       '0 0 4px #089464',
    blue:            '#2d6bc4',
    badgeUrgent:     '#c02840',
    badgeAdvisory:   '#c07808',

    sectionLabel:    '#7a8698',
    sectionRule:     'rgba(0,0,0,0.06)',

    lightsRoomBg:    'rgba(255,255,255,0.85)',
    lightsRoomBorder:'rgba(0,0,0,0.08)',
    lightsRoomName:  '#1b2230',
    lightsRoomCount: '#6a7689',
    lightsRowRule:   'rgba(0,0,0,0.06)',
    lightsName:      '#2b3142',
    lightsBarTrack:  'rgba(0,0,0,0.09)',
    lightsBarFill:   '#f5a623',
  },

  // ── State Chip Colors ──────────────────────────────────────────────────────
  stateChip: {
    locked:   { border: 'rgba(16,208,144,0.35)',  bg: 'rgba(16,208,144,0.08)',  text: '#10d090' },
    unlocked: { border: 'rgba(240,64,96,0.35)',   bg: 'rgba(240,64,96,0.08)',   text: '#f04060' },
    cool:     { border: 'rgba(77,142,240,0.35)',   bg: 'rgba(77,142,240,0.08)',  text: '#4d8ef0' },
    heat:     { border: 'rgba(245,166,35,0.35)',   bg: 'rgba(245,166,35,0.08)',  text: '#f5a623' },
    auto:     { border: 'rgba(16,208,144,0.35)',   bg: 'rgba(16,208,144,0.08)',  text: '#10d090' },
    off:      { border: 'rgba(74,85,112,0.20)',    bg: 'rgba(74,85,112,0.08)',   text: '#4a5570' },
    fan:      { border: 'rgba(0,212,240,0.35)',    bg: 'rgba(0,212,240,0.08)',   text: '#00d4f0' },
    playing:  { border: 'rgba(77,142,240,0.35)',   bg: 'rgba(77,142,240,0.10)',  text: '#4d8ef0' },
    paused:   { border: 'rgba(245,166,35,0.35)',   bg: 'rgba(245,166,35,0.10)',  text: '#f5a623' },
  },

  // ── Gradients ──────────────────────────────────────────────────────────────
  gradient: {
    cool: 'linear-gradient(to right, #4d8ef0, #00d4f0)',
    heat: 'linear-gradient(to right, #f0a030, #f06040)',
  },

  // ── Glassmorphism ──────────────────────────────────────────────────────────
  blur: {
    nav:    'blur(24px) saturate(200%)',
    header: 'blur(20px) saturate(180%)',
    mini:   'blur(20px) saturate(180%)',
  },

  // ── Responsive Breakpoints ─────────────────────────────────────────────────
  breakpoints: {
    singleColumn: '(max-width: 1099px)',
    twoColumn:    '(min-width: 1100px)',
  },

  // ── Transitions ────────────────────────────────────────────────────────────
  transition: {
    fast:    '0.15s ease',
    medium:  '0.2s ease',
    slow:    '0.25s ease-out',
    progress:'1s linear',
    camFade: '100ms ease',
  },
};

export const KIS_SECTION_LABEL_CSS = `
  .kis-section-label {
    font-family: ${KIS_TOKENS.fontFamily};
    font-size: 0.78rem;
    font-weight: ${KIS_TOKENS.fontWeight.semibold};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--kis-text-secondary, ${KIS_TOKENS.night.textSecondary});
    margin: 0 0 var(--kis-spacing-h, 5px) 0;
    padding: 0;
  }
`;
