# 002 — Gjør tooltip-faden stabil og avbrytbar

- **Status**: DONE
- **Commit**: aeb6a01
- **Severity**: MEDIUM
- **Category**: Easing & duration / interruptibility
- **Estimated scope**: 2 files, liten endring

## Problem

Tooltipen bruker 90 ms fade og fjernes etter nøyaktig samme tidsrom. Dette er
kortere enn anbefalt 125–200 ms for små popovere, og gjør rask veksling mellom
kartobjekter sårbar for at et gammelt lukketidsur fjerner den aktive tooltipen.

```css
/* src/styles.css:82 — current */
.map-explorer__hover-tooltip { opacity: 0 !important; transition: opacity 90ms ease-out; }
```

```ts
// src/index.tsx:580 — current
tooltip.getElement()?.classList.remove("map-explorer__hover-tooltip--visible");
closeTooltipTimer = setTimeout(() => {
  if (map.hasLayer(tooltip)) map.removeLayer(tooltip);
}, 90);
```

## Target

Bruk 150 ms og den delte sterke ease-out-kurven:

```css
.map-explorer__hover-tooltip {
  opacity: 0 !important;
  transition: opacity var(--map-explorer-duration-tooltip) var(--map-explorer-ease-out);
}
```

`--map-explorer-duration-tooltip` skal være `150ms`. Lukketidsuret skal være
150 ms, settes til `null` etter kjøring, og både kanselleres og nullstilles ved
ny faktisk hover. Tooltipen skal fortsatt gjenbrukes slik at bare én finnes.

## Repo conventions to follow

- Én Leaflet-tooltip opprettes per lagrunde i `src/index.tsx`.
- Synlighet styres av klassen `map-explorer__hover-tooltip--visible`.
- Varigheter og easing hentes fra kartpakkens CSS-tokens.

## Steps

1. Bytt tooltip-overgangen i `src/styles.css` til tokenverdiene.
2. Bruk samme 150 ms-konstant i lukkelogikken i `src/index.tsx`.
3. Nullstill timerreferansen etter `clearTimeout` og etter utført callback.
4. Legg til regresjonstest for rask `mouseover → mouseout → mouseover`.

## Boundaries

- Do NOT opprette én tooltip per geometri.
- Do NOT animere posisjon, filter eller layout.
- Do NOT legge til hover-forsinkelse før innvisning.

## Verification

- **Mechanical**: `npm run check` skal bestå.
- **Feel check**: Beveg pekeren raskt mellom nærliggende polygoner. Bare én
  tooltip vises, den følger faktisk hover, og den fader raskt uten blinking.
- **Done when**: Ingen gammel timer kan fjerne en ny tooltip, og inn/ut-fade er
  150 ms.

## Result

Implementert i `0.1.11`. Staging viser én synlig tooltip ved rask veksling,
med 150 ms og `cubic-bezier(0.23, 1, 0.32, 1)`.
