# 001 — Panorer rolig til valg utenfor kartutsnittet

- **Status**: DONE
- **Commit**: aeb6a01
- **Severity**: MEDIUM
- **Category**: Purpose & frequency / easing & duration
- **Estimated scope**: 2 files, liten endring

## Problem

Når et valgt objekt ligger helt utenfor kartutsnittet, flyttes kartet momentant.
Dette er en sjelden, programstyrt forflytning hvor bevegelse bør forklare hvor
objektet ligger. Direkte trackpad-, touch- og pinch-bevegelse skal fortsatt være
umiddelbar.

```ts
// src/index.tsx:620 — current
if (selectedBounds.isValid() && !map.getBounds().intersects(selectedBounds)) {
  map.panTo(selectedBounds.getCenter(), { animate: false });
}
```

## Target

Bruk Leaflets avbrytbare pan-animasjon i 200 ms uten zoomendring:

```ts
map.panTo(selectedBounds.getCenter(), {
  animate: true,
  duration: 0.2,
  easeLinearity: 0.25,
  noMoveStart: true,
});
```

Før en ny programstyrt panorering starter, kall `map.stop()` slik at raske nye
valg fortsetter fra kartets nåværende posisjon. Ikke animer valg som allerede
skjærer kartutsnittet.

## Repo conventions to follow

- All kartnavigasjon ligger i `MapCanvas` i `src/index.tsx`.
- Direkte gestikk bruker fortsatt `animate: false` i wheel-handleren.
- Valg endrer aldri zoomnivået.

## Steps

1. Oppdater bare grenen for valgt objekt utenfor viewport i `src/index.tsx`.
2. Kall `map.stop()` før den nye `panTo`-operasjonen.
3. Legg til en test som bekrefter at direkte gestikk ikke er endret og at
   programstyrt valg bruker 0,2 sekund uten zoom.
4. Oppdater README bare hvis dokumentert valgoppførsel trenger presisering.

## Boundaries

- Do NOT endre trackpad-, touch-, pinch- eller zoomknappoppførsel.
- Do NOT endre zoomnivå ved valg.
- Do NOT legge til avhengigheter.

## Verification

- **Mechanical**: `npm run check` skal bestå.
- **Feel check**: Velg et synlig objekt: kartet står stille. Velg et objekt helt
  utenfor viewport: kartet bruker omtrent 200 ms på å flytte det inn. Velg raskt
  to forskjellige objekter: bevegelsen retargeter uten hopp.
- **Done when**: Bare programstyrt valg utenfor viewport animeres, og zoom er
  uendret før og etter.

## Result

Implementert i `0.1.11`. Direkte wheel-pan er rendret verifisert som umiddelbar
og blokkerer fortsatt dokumentscroll. Programstyrt valg bruker den avbrytbare
200 ms-kontrakten uten zoomendring.
