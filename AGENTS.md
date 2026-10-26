# react-leaflet-explorer

Reusable, accessible React/Leaflet library for exploring GeoJSON features. Read
[README.md](README.md), [package.json](package.json) and the assigned Issue before changes.

- Keep application data, local place names and product-specific styling in the
  consuming application. Hysvær owns its website, content and release approval;
  this repository owns the general library API and behaviour.
- Library work belongs in this repository’s [Issues](https://github.com/johan-eilertsen/react-leaflet-explorer/issues).
  Use native milestones for shared delivery outcomes, not milestone Issues or
  local task lists. Consumer work remains with its owner, including
  [Hysvær #1](https://github.com/johan-eilertsen/hysvaer/issues/1).
- Run `npm run check` for unit tests and the package build. For map interaction
  changes, also run `npm run test:browser`; see README for the browser setup.

## Påkrevd repo-kontekst

- Før endring av domenebegreper eller datamodell: les [GLOSSARY.md](GLOSSARY.md) og [domenekontrakten](docs/agents/domain.md).
- Før oppgavestyring: les [issue-kontrakten](docs/agents/issue-tracker.md); ved triage også [rollekoblingen](docs/agents/triage-labels.md).
- Ved kodereview: les [CODING_STANDARDS.md](CODING_STANDARDS.md) og følg pekeren til felles kilde.
- Ved varige arkitekturvalg: følg [beslutningskontrakten](docs/adr/README.md). Vedlikehold relevante begreper og pekere sammen med endringen.
