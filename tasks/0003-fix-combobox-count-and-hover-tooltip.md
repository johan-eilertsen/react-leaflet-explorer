# 0003 - Rett komboboks, teller og hover-tooltip

Status: READY_FOR_QC
Owner: codex
Created: 2026-08-05
Updated: 2026-08-05

## Goal

Rett de siste regresjonene i kartkontrollen og sørg for at hover i kartet bare
viser én stabil tooltip.

## User and content contract

- Placeholder og valgt stedsnavn skal aldri overlappe.
- Dropdownen følger feltets ytterkant, mens innholdet følger tekstlinjen i
  inputfeltet.
- Aktivt søk eller typefilter viser antall treff i gjeldende kartutsnitt.
- Hover viser maksimalt én tooltip om gangen, med en kort og rolig fade.
- Produkttekst er kort og lokaliserbar fra appen.

## Acceptance

- Valgt stedsnavn skjuler placeholderen via kontrollens state.
- Dropdownens ramme og tekst har riktig, separat innrykk.
- Telleren dedupliserer objekter med flere geometriedeler.
- Telleren vises bare når søk eller typefilter er aktivt.
- Kartet gjenbruker én hover-tooltip og rydder tidsur og lag ved oppdatering.
- Viewport-telleren oppdaterer state bare når ID-listen faktisk er endret, og
  standardverdier skal ha stabil referanse mellom renders.
- Tester, bygg, pakking og Hysvær-integrasjon består.

## Result

- Valgt sted setter placeholderen til tom streng, så Base UI ikke rendrer to
  tekster i samme inputflate.
- Positioner bruker hele komboboksen som eksplisitt anchor. Filter og treff får
  eget innrykk som følger inputteksten.
- Aktivt søk eller typefilter viser deduplisert antall treff i viewporten.
- Kartlagene deler én tooltip med 90 ms fade og forsinket lukking.
- Tester og TypeScript-bygg består.
- `react-leaflet-explorer@0.1.7` er publisert med Trusted Publishing.
- Hysvær staging bruker `0.1.7` i deployment
  `dpl_4qJQDA8o7uJTv7LCVL89nnjudLoj`.
- Den innledende rendringen er kontrollert. Browser-relayet timet ut under
  siste hover- og klikkmåling, så fysisk hover-QA gjenstår hos Johan.
- En render-loop i `0.1.7` ble funnet etter stagingrapport: en ny tom
  `editableFeatureIds`-liste per render utløste full omtegning etter hver
  viewport-state. `0.1.8` bruker stabil standardreferanse og dedupliserer
  uendrede viewport-callbacker.
