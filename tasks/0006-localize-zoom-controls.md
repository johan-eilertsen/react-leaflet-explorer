# 0006 - Localize zoom controls

Status: IN_PROGRESS
Owner: Codex
Project: react-leaflet-explorer
Created: 2026-08-10
Updated: 2026-08-10
Started: Added the public label field and its contract test.

## Goal

Let applications translate the accessible name of the zoom control group through the public labels API.

## Scope

- Add `zoomControls` to `MapExplorerLabels` with the English default `Zoom controls`.
- Render the zoom container as a named group.
- Document and test both the default and an application override.
- Publish version `0.2.2` after local checks and independent review.

## Public API and compatibility

`zoomControls: string` is added to `MapExplorerLabels`. The `labels` prop remains `Partial<MapExplorerLabels>`, so existing consumers keep the English default without changing their code.

## QA

- `npm run test`
- `npm run build`
- `npm run check`
- `npm pack --dry-run`
- Independent review of the diff and package contents

## Result

In progress. Release evidence will be recorded after publication.
