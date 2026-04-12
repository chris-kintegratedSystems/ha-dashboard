# HA Dashboard Redesign — Tasks

**Project:** Home Assistant Dashboard Redesign
**Status:** Kickoff — Product spec in progress
**Owner:** Chris (KIntegrated Systems)
**Lead Agent:** Product → Dev → QA

---

## Phase 1: Product Spec & Mockups

- [x] Project folder created
- [x] Product Agent produces PRD with visual mockups
- [x] Chris approves spec / mockups

## Phase 2: Design & Build

- [x] dashboard_mobilev1.json designed and deployed to Pi
- [x] Kiosk mode — admin users now hidden (header/sidebar/tab)
- [x] System Status card — 3-chip row (security, lights count, temp)
- [x] Scene grid — 3-col with mixed colors per scene type
- [x] Dimmer light buttons — orange gradient fill proportional to brightness %, tap=toggle, hold=slider
- [x] Nav bar — cyan pill active indicator on all 5 tabs
- [ ] QA sign-off from Chris on all devices (Tab S9+, iPhone, iPad)

## Phase 3: Ship

- [ ] Chris confirms on all devices
- [ ] Tag release commit

---

## Context

**Target devices:**
- Samsung Galaxy Tab S9+ (wall-mounted kiosk — primary)
- iPhone (Chris — Companion app)
- iPad (Companion app)

**Source of truth for devices/entities:** C:\Projects\ha-config\CLAUDE.md

**Stack:**
- Custom cards: button-card, mushroom, card_mod, bubble-card, kiosk-mode, clock-weather-card, browser_mod
- YAML deploy: SCP from Windows → Pi, no restart needed for Lovelace
- Validation: `sudo docker exec homeassistant ha core check`

---

*Created: 2026-04-11*
