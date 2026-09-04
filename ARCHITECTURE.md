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
