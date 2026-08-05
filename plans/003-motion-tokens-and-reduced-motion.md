# 003 — Samle motion-tokens og bevar nyttig feedback

- **Status**: READY_FOR_QC
- **Commit**: aeb6a01
- **Severity**: MEDIUM
- **Category**: Accessibility / cohesion & tokens
- **Estimated scope**: 1 fil, liten endring

## Problem

Pakken har enkeltstående varigheter og innebygde easing-verdier. Reduced-motion
setter alle overganger til 0,01 ms, også opacity og farge som hjelper brukeren å
forstå tilstandsendringer.

```css
/* src/styles.css:46,82,87 — current */
transition: opacity 120ms ease;
transition: opacity 90ms ease-out;
@media (prefers-reduced-motion: reduce) {
  .map-explorer *, .map-explorer *::before, .map-explorer *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
```

## Target

Legg disse tokenene i `.map-explorer`:

```css
--map-explorer-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--map-explorer-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--map-explorer-duration-feedback: 120ms;
--map-explorer-duration-tooltip: 150ms;
--map-explorer-duration-popup: 180ms;
```

Reduced-motion skal fjerne romlig bevegelse fra popup/panel/press-feedback, men
beholde opacity- og fargeoverganger på 120–150 ms. Ikke bruk en global regel som
setter alle transitions til nesten null.

## Repo conventions to follow

- Alle karttema-tokens ligger øverst i `.map-explorer` i `src/styles.css`.
- Tokenene har prefikset `--map-explorer-` og kan overstyres av konsumenten.

## Steps

1. Legg til de fem motion-tokenene i `.map-explorer`.
2. Erstatt de eksisterende 120 og 90 ms-literalene med tokens.
3. Erstatt den globale reduced-motion-regelen med målrettede regler som setter
   transform til `none`, men lar opacity og farger beholde kort feedback.
4. Dokumenter motion-tokenene i READMEs Theme-seksjon.

## Boundaries

- Do NOT endre farge-, radius- eller typografitokens.
- Do NOT slå av all feedback ved reduced motion.
- Do NOT legge til JavaScript for CSS-overganger.

## Verification

- **Mechanical**: `npm run check` skal bestå.
- **Feel check**: Emuler `prefers-reduced-motion: reduce`. Ingen popup eller
  panel flytter/skalerer seg, men tooltip og fargefeedback er fortsatt lesbar.
- **Done when**: Alle motion-verdier bruker tokens, og reduced motion reduserer
  bevegelse uten å fjerne forståelig feedback.
