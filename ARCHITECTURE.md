# Architecture

## Product boundary

`MapExplorer` is the stable public surface. It owns the repeated interaction
contract that applications should not reimplement:

- accessible search, type filter and reset
- geometry rendering and selected-feature state
- selected-feature overlay, fullscreen and zoom controls inside the map frame
- mouse-wheel zoom, two-axis trackpad pan, ctrl-pinch zoom and direct touch
- keyboard and focus behavior
- responsive defaults and semantic CSS-variable theming
- optional polygon vertex handles

Applications own data fetching, domain models, tile-provider credentials,
mutations, history and destructive-action safeguards. Product-specific content
can be supplied through `renderSelected` and `selectedActions`.

Base UI provides the accessible combobox behavior. Leaflet provides geographic
rendering. There are no Radix, cmdk, shadcn or Tailwind runtime dependencies.
The default stylesheet is complete and can be themed without replacing the
component.

## Distribution

The durable release model is a versioned npm package. Local integration uses
`npm pack`; generated tarballs stay outside git. A release is complete only
when the exact package version is published from a verified package SHA and
consuming applications pass their own build and rendered QA.

### Base UI release boundary

Version 0.6.1 publishes the already-reviewed Base UI 1.9.0 source from maintenance PR #29. The tsc build preserves external imports (including @base-ui/react/combobox); it does not embed Base UI 1.7.0. React, React DOM and Leaflet peer ranges remain unchanged. Applications must install the new package, not override a real embedded implementation.

Development and packed verification constrain Babel runtime to qualified 8.0.5 under Base UI React and utils; both upstream ranges accept it. npm overrides are root-only: consumers own the same scoped runtime constraint in their actual lockfile. This avoids opportunistically installing younger 8.1.0 without imposing a global runtime override. No application CSS, map API or publication workflow is changed.
