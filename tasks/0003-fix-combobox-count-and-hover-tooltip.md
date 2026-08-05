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
- Tester, bygg, pakking og Hysvær-integrasjon består.

## Result

- Valgt sted setter placeholderen til tom streng, så Base UI ikke rendrer to
  tekster i samme inputflate.
- Positioner bruker hele komboboksen som eksplisitt anchor. Filter og treff får
  eget innrykk som følger inputteksten.
- Aktivt søk eller typefilter viser deduplisert antall treff i viewporten.
- Kartlagene deler én tooltip med 90 ms fade og forsinket lukking.
- Tester og TypeScript-bygg består.
- Gjenstår: publisering av `0.1.7`, Hysvær staging og rendret QA.
