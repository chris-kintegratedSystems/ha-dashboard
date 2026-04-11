# HA Dashboard Redesign — Tasks

**Project:** Home Assistant Dashboard Redesign
**Status:** Kickoff — Product spec in progress
**Owner:** Chris (KIntegrated Systems)
**Lead Agent:** Product → Dev → QA

---

## Phase 1: Product Spec & Mockups

- [x] Project folder created
- [ ] Product Agent produces PRD with visual mockups
- [ ] Chris approves spec / mockups

## Phase 2: Design & Build

- [ ] Final lovelace.yaml designed and validated
- [ ] Deployed to Pi and tested on all devices (Tab S9+, iPhone, iPad)
- [ ] QA sign-off

## Phase 3: Ship

- [ ] Backup taken before deploy
- [ ] lovelace.yaml pushed to Pi
- [ ] Chris confirms on all devices

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
