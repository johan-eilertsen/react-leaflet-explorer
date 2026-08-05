# 0004 - Finjuster kartlinje og trackpad-panorering

Status: READY_FOR_QC
Owner: codex
Created: 2026-08-05
Updated: 2026-08-05

## Goal

Finjuster dropdown, teller og Mac-trackpad uten å gjeninnføre render-loop eller
aggressiv kartbevegelse.

## User and content contract

- Dropdownrammen kan starte nærmere inputteksten, mens liste- og filtertekst
  fortsatt følger samme venstrekant som inputteksten.
- Antall objekter i kartutsnittet er alltid synlig i en fast bredde og endrer
  ikke inputfeltets bredde.
- Høyre innrykk i feltet balanserer søkeikonet på venstre side.
- To-fingerbevegelse på Mac-trackpad panorerer bare kartet mens pekeren er over
  kartet. Nettsiden skal ikke rulle samtidig.
- Infoboksens framtidige innholdsmodell avgjøres i Hysværs designkontrakt, ikke
  som generell kartmotorlogikk.

## Acceptance

- Popuptekst og inputtekst deler venstrekant med vanlig innvendig padding.
- Telleren har stabil bredde og vises med og uten filter.
- Pixelbaserte wheel-bevegelser panorerer kartet i begge akser og stopper
  scrolling av dokumentet.
- Pinch-zoom med `ctrlKey` beholder eksisterende fri zoom rundt pekeren.
- Ingen render-loop; tester, bygg, pakking og Hysvær-integrasjon består.

## Result

- Popupen er forskjøvet inn med vanlig innvendig padding, mens tekstlinjen
  fortsatt følger inputteksten.
- Telleren er alltid synlig i en absolutt, fast 10,5 rem bred flate på desktop
  og under feltet på mobil. Inputbredden er uavhengig av tallet.
- Feltet bruker likt høyre og venstre innrykk.
- Pixelbasert wheel panorerer kartet i begge akser og stopper dokumentscroll;
  pinch-zoom-grenen er urørt.
- Hysværs designkontrakt anbefaler beskrivelse som hovedinnhold i infoboksen og
  navn som fallback inntil flere beskrivelser finnes.
- Tester og TypeScript-bygg består.
- Gjenstår: publisering av `0.1.9`, Hysvær staging og fysisk Mac-QA.
