# 006 — Fjern appens globale motion-bryter

- **Status**: DONE
- **Commit**: 2297563
- **Severity**: MEDIUM
- **Category**: Accessibility / cohesion
- **Estimated scope**: 1 fil, liten endring

## Problem

Hysvær-appen setter alle transitions og animasjoner til `0.01ms`. Regelen
overstyrer kartpakkens målrettede reduced-motion-kontrakt og fjerner nyttig
opacity- og fargefeedback.

```css
/* src/app/globals.css:155 — current */
*,
*::before,
*::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  transition-duration: 0.01ms !important;
}
```

## Target

Behold bare `scroll-behavior: auto` på `html`. Komponentene eier sine egne
reduced-motion-varianter, slik kartpakken allerede gjør for popup, panel og
press-feedback.

## Repo conventions to follow

- Globale regler ligger i `src/app/globals.css`.
- Komponentnær motion skal reduseres der bevegelsen er definert.

## Steps

1. Fjern universalvelgeren fra reduced-motion-media query.
2. Behold `html { scroll-behavior: auto; }`.

## Boundaries

- Ikke endre produkttekst eller layout.
- Ikke endre kartpakkens CSS i denne planen.
- Ikke legg til avhengigheter.

## Verification

- **Mechanical**: `npm run lint && npm run build` skal bestå.
- **Feel check**: Emuler redusert bevegelse. Kartets popup og panel har ingen
  romlig transform, mens korte opacity- og fargeoverganger fortsatt virker.
- **Done when**: Appen overstyrer ikke lenger komponentenes motion-kontrakter.

## Result

Implementert i Hysvær commit `8583375`. Den globale bryteren er fjernet.
Romlig app-motion har målrettede `motion-reduce`-varianter, mens kartpakken
beholder korte opacity- og fargeoverganger.
