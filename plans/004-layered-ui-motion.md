# 004 — Animer kartets UI-lag uten å sinke kartet

- **Status**: DONE
- **Commit**: aeb6a01
- **Severity**: LOW
- **Category**: Physicality / missed opportunities
- **Estimated scope**: 2 files, middels endring

## Problem

Dropdown, valgt infoboks, valgt kartgeometri og kontrollenes hover/trykk skifter
momentant. Kartets direkte gestikk skal være rå og umiddelbar, men disse sjeldne
UI-tilstandene trenger korte overganger for romlig sammenheng og feedback.

```css
/* src/styles.css:39,65,76 — current */
.map-explorer__popup { /* no transition */ }
.map-explorer__selected { /* no transition */ }
.map-explorer__fullscreen:hover, .map-explorer__zoom button:hover { background: var(--map-explorer-accent); }
```

## Target

- Dropdown: `180ms` strong ease-out, `opacity: 0` + `scale(.97)` fra Base UIs
  `var(--transform-origin)` i lukket/starttilstand. Åpen: opacity 1, scale 1.
- Infoboks: `180ms` strong ease-out, opacity 0 + `translateY(-4px)` ved enter;
  opacity 1 + translateY(0) i åpen tilstand. Utgang må fullføres før unmount.
- Kartgeometri: `160ms` ease på `fill`, `fill-opacity`, `stroke`,
  `stroke-opacity` og `stroke-width`; aldri `transition: all`.
- Kontroller: `120ms ease` på background-color og color. Pekernedtrykk:
  `transform: scale(.97)` i `140ms` strong ease-out, bare for fine pointers.

## Repo conventions to follow

- Base UI-dataattributter (`data-open`, `data-closed`, `data-starting-style`,
  `data-ending-style`) styrer popupens livssyklus.
- CSS bruker bare prefiksede tokens fra plan 003.
- Valgt innhold kan være konsumentrendret via `renderSelected`; pakkens wrapper
  må eie eventuell presence, ikke produktinnholdet.

## Steps

1. Animer Base UI-popupen med dataattributter, transform-origin og motion-tokens.
2. Legg en egen presence-wrapper rundt `selectedOverlay` i `src/index.tsx` slik
   at både standard og custom `renderSelected` får samme enter/exit-livssyklus.
3. Legg målrettede SVG path-transitions til `.leaflet-interactive` innenfor
   `.map-explorer`.
4. Legg korte color/background-overganger og press-feedback på klikkbare
   kontroller.
5. Legg til målrettet reduced-motion-overstyring uten romlig transform.

## Boundaries

- Do NOT animere trackpad, touch, pinch, zoomknappens kartbevegelse eller native
  fullskjerm.
- Do NOT bruke `transition: all`, keyframes, layoutegenskaper eller scale(0).
- Do NOT legge til motion-bibliotek.
- Do NOT endre komponentenes offentlige API.

## Verification

- **Mechanical**: `npm run check` skal bestå.
- **Feel check**: Spill av i DevTools med 10 % hastighet. Dropdownen skal vokse
  fra triggeren, infoboksen skal bevege seg maksimalt 4 px, og rask åpne/lukke
  skal retargete uten restart. Kontroller fysisk Mac-trackpad uendret.
- **Done when**: Lagene føles sammenhengende, mens direkte kartgestikk og native
  fullskjerm er like umiddelbare som før.

## Result

Implementert i `0.1.11`. Staging bekrefter popupens 180 ms ease-out fra Base UI
transform-origin, eksplisitte geometri- og kontrolloverganger, og umiddelbar
direkte kartgestikk. Presence-livssyklusen har regresjonstest mot restart ved
vanlige React-renders.
