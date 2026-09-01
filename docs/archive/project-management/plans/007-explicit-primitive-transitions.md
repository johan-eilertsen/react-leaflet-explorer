# 007 — Avgrens primitive-overganger eksplisitt

- **Status**: DONE
- **Commit**: 2297563
- **Severity**: MEDIUM
- **Category**: Performance / cohesion
- **Estimated scope**: 3 filer, liten endring

## Problem

Tre shadcn-primitives bruker `transition-all`, som kan animere utilsiktede
layout- og komposisjonsegenskaper.

```tsx
// src/components/ui/button.tsx:7 — current
"... transition-all ..."

// src/components/ui/badge.tsx:8 — current
"... transition-all ..."

// src/components/ui/tabs.tsx:61 — current
"... transition-all ..."
```

## Target

- Button: `transition-[color,background-color,border-color,box-shadow,transform]`
- Badge: `transition-[color,background-color,border-color,box-shadow]`
- TabsTrigger: `transition-[color,background-color,border-color,box-shadow]`

Behold eksisterende hover-, fokus-, aktiv- og disabled-tilstander.

## Repo conventions to follow

- Primitive-styling ligger i `src/components/ui`.
- Tailwinds vilkårlige transition-property-lister brukes når standardklassene
  ikke dekker hele den nødvendige listen.

## Steps

1. Erstatt `transition-all` i `button.tsx` med målrettet liste inkludert transform.
2. Erstatt `transition-all` i `badge.tsx` og `tabs.tsx` med målrettede lister.
3. Søk repoet på nytt og bekreft at ingen `transition-all` gjenstår.

## Boundaries

- Ikke endre variant-API, markup, farger eller varigheter.
- Ikke legg til avhengigheter.

## Verification

- **Mechanical**: `npm run lint && npm run build`; `rg "transition-all" src`
  skal gi null treff.
- **Feel check**: Hover, fokus og knappetrykk ser uendret ut. Ingen layoutverdi
  blir interpolert.
- **Done when**: Alle tre primitives bruker eksplisitte egenskapslister.

## Result

Implementert i Hysvær commit `8583375`. Rendret QA viser eksplisitte
transition-properties på Meny-knappen og kartkontrollene; repo-søket gir ingen
`transition-all`.
