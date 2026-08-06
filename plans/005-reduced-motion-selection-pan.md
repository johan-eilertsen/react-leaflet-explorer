# 005 — Stopp programstyrt panorering ved redusert bevegelse

- **Status**: DONE
- **Commit**: 01b9cdf
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 3 files, liten endring

## Problem

Valg utenfor kartutsnittet bruker alltid Leaflets 200 ms panorering. CSS-reglene
for `prefers-reduced-motion` kan ikke påvirke denne JavaScript-animasjonen.

```ts
// src/motion.ts:8 — current
export const selectionPanOptions = {
  animate: true,
  duration: 0.2,
  easeLinearity: 0.25,
  noMoveStart: true,
} as const satisfies PanOptions;
```

```ts
// src/index.tsx:787 — current
map.stop();
map.panTo(selectedBounds.getCenter(), selectionPanOptions);
```

## Target

Les `window.matchMedia("(prefers-reduced-motion: reduce)").matches` når et valg
skal panoreres. Returner `{ animate: false }` når preferansen er aktiv, ellers
den eksisterende 200 ms-kontrakten. Direkte gester forblir umiddelbare.

## Repo conventions to follow

- Delte motion-valg ligger i `src/motion.ts`.
- `src/motion.test.ts` tester kontrakten uten DOM.
- Kartet evaluerer brukerpreferansen ved handlingen, slik at en endret
  systempreferanse gjelder ved neste valg.

## Steps

1. Legg til en ren hjelpefunksjon i `src/motion.ts` som velger pan-options.
2. Bruk den i valg-effekten i `src/index.tsx` med `window.matchMedia`.
3. Test både vanlig og redusert bevegelse i `src/motion.test.ts`.
4. Presiser reduced-motion-kontrakten i `README.md`.

## Boundaries

- Ikke endre direkte trackpad-, touch-, pinch- eller zoomoppførsel.
- Ikke endre zoomnivå eller offentlig API.
- Ikke legg til avhengigheter.

## Verification

- **Mechanical**: `npm run check` skal bestå.
- **Feel check**: Med vanlig motion flyttes et valg utenfor viewport på 200 ms.
  Med redusert bevegelse flyttes kartet straks. Farge og opacity beholdes.
- **Done when**: JavaScript-pan respekterer systempreferansen, og begge grener
  er dekket av test.

## Result

Implementert i `0.2.1`. En ren options-funksjon dekker begge motion-grener i
test, og `MapCanvas` leser systempreferansen ved hvert programstyrte valg.
