# 0006 - Localize zoom controls

Status: DONE
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

Published `react-leaflet-explorer@0.2.2` from reviewed commit `8939344ef5bd3e5aab7ce8d682bff645a1deb167` through GitHub Actions run `31399921572`.

- The regression test failed against the former hardcoded markup before the fix was restored.
- `npm run check` passed with 15 tests and a TypeScript build.
- `npm pack --dry-run` included only the declared package files.
- Independent review found 0 blockers, 0 majors, and 0 minors.
- npm reports `latest=0.2.2` and integrity `sha512-kRC9Agw12/+jW3NUvicXCEQaSwBlgiulVPunWn4tgBVcex47xPqgkI4w9e2+TkXn+NlooHRs6JnOHIMcngNTAg==`.
