# 0005 - Optimaliser pakken og fjern legacy

Status: DONE
Owner: codex
Created: 2026-08-05
Updated: 2026-08-05
Started: read-only kodeaudit og baseline-måling startet 2026-08-05

## Goal

Reduser kjøretidskostnad, bundle og vedlikeholdsflate uten å endre den
godkjente kartopplevelsen eller bryte aktive konsumenter.

## Scope

- Offentlig API og dokumenterte kompatibilitetsaliaser
- React state, derived data og render-løp
- Leaflet kart-, lag-, geometri- og tooltip-livssyklus
- CSS, motion og døde selektorer
- Pakkeeksport, bundle og tester

## Out Of Scope

- Ny produktfunksjonalitet eller visuell retning
- Endring av Hysværs data eller innhold
- Produksjonssetting av Hysvær
- Brytende API-endringer uten verifisert fravær av aktive konsumenter

## Context Files

- `README.md`
- `ARCHITECTURE.md`
- `src/index.tsx`
- `src/styles.css`
- `src/motion.ts`

## Acceptance Criteria

- Bekreftet legacy uten aktive konsumenter er fjernet.
- Dyre beregninger og full lagoppbygging skjer ikke ved irrelevante renders.
- Viewport- og søkeberegninger bruker stabile, målbare grenser.
- Pakken har mindre eller lik bundle uten unødvendige eksportflater.
- Godkjent combobox, tooltip, trackpad/touch/pinch, selection-pan, motion og
  reduced-motion er bevart.
- Dokumentasjon beskriver faktisk oppførsel.

## User And Content Contract

- Primærbrukeren utforsker mange kartobjekter på desktop eller mobil.
- Kartet skal reagere direkte på gestikk og rolig på programstyrt navigasjon.
- Synlig tekst og kontrollnavn beholdes med mindre en konkret feil avdekkes.
- Implementasjon, QA og ytelsesmålinger forblir i oppgave og handoff.

## QA

- Baseline og etter-måling av pakketarball/bundle.
- Enhets- og regresjonstester, TypeScript-bygg og pack-kontroll.
- Hysvær lint, bygg og kartdatakontroller.
- Rendret desktop/mobil, tastatur, tooltip, valg og fysisk kartgestikk så langt
  automatisering kan kontrollere det.
- Egen produktinnholdsport: ingen prosess- eller QA-tekst i produktflaten.

## Result

- Leaflet-lag ligger nå persistent og gjenbrukes ved valg. Bare forrige og nytt
  valgt objekt får ny stil; en kontroll med 732 entries berørte 2, en reduksjon
  på 99,73 prosent i selection-stilsløyfen.
- Feature-bounds caches ved lagoppretting. Viewport-rapportering lager ikke
  lenger midlertidige GeoJSON-lag og sender ikke identiske ID-lister på nytt.
- Søk normaliseres og dedupliseres én gang per feature-sett.
- Tooltip RAF/timer, fullscreen-timeout, map recreation, labels og edit handles
  har fokuserte livssykluser og opprydding.
- Død `chevron`, ubrukt sr-only CSS, udokumenterte helper-eksporter og det
  ubrukte pre-release-aliaset `MapWorkspace` er fjernet. Generisk fallback-
  sentrum er `[0, 0]`; README beskriver faktisk trackpad- og 0.2-oppførsel.
- Pakken er klar som `0.2.0`. Tarball er 14,8 kB mot 13,7 kB før refaktoren;
  økningen på 1,1 kB er den testbare registry/cache-kjernen. Intern `.d.ts` er
  fjernet fra publisert filsett.
- `npm run check`: 14/14 tester og TypeScript-bygg består.
- `npm pack --dry-run` og `git diff --check` består.
- Lokalt pakket `0.2.0` består Hysvær lint, build, places:check og map:check.
- `react-leaflet-explorer@0.2.0` er publisert via Trusted Publishing.
- Hysvær staging bruker eksakt `0.2.0` i app-commit `2297563` og deployment
  `dpl_DoDqsAMcbDaoUyTr3UMaXYQeSmvM`.
- Rendret staging-QA bekrefter 732/732 bevarte DOM-lag og null child-list-
  mutasjoner ved valg, umiddelbar trackpad-pan uten dokumentscroll, 2 treff for
  søket «Nordøya», full gjenoppretting til 732 lag ved reset, én hover-tooltip
  og ingen konsollfeil.
- Produktinnholdsport: ingen synlig tekst ble endret; desktopflaten er uendret,
  og mobil-CSS ble ikke berørt utover fjerning av en ubrukt selektor.
- Publish-workflowen bruker nå `actions/checkout@v7` og `actions/setup-node@v7`
  i stedet for den utfasende Node 20-baserte v4-linjen.
