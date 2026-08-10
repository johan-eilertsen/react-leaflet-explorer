# 0006 - Release result

Status: DONE
Date: 2026-08-10

## Result

`react-leaflet-explorer@0.2.2` exposes `zoomControls` through `Partial<MapExplorerLabels>`. The zoom controls render as a named group, retain the generic English default, and accept application-specific translations.

## Verification

- Regression proof: the new label contract test failed against the former hardcoded markup.
- Local package gate: 15 tests, TypeScript build, `npm run check`, and `npm pack --dry-run` passed.
- Independent review: 0 blockers, 0 majors, and 0 minors in `handoff/0006-review.md`.
- Published commit: `8939344ef5bd3e5aab7ce8d682bff645a1deb167`.
- GitHub Actions run: `31399921572`, successful.
- npm integrity: `sha512-kRC9Agw12/+jW3NUvicXCEQaSwBlgiulVPunWn4tgBVcex47xPqgkI4w9e2+TkXn+NlooHRs6JnOHIMcngNTAg==`.

## Changed files

- `src/index.tsx`
- `src/index.test.tsx`
- `README.md`
- `package.json`
- `package-lock.json`
- `tasks/0006-localize-zoom-controls.md`
- `handoff/0006-review.md`
- `handoff/0006-result.md`
