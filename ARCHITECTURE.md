# Architecture

## Boundary

`MapWorkspace` is the smallest stable shared boundary between the public
Hysvær map and Nordøy's authenticated editor. It owns:

- Leaflet setup and Kartverket tile integration
- mouse, wheel, trackpad, pinch, and direct-touch input
- geometry layers, selection fitting, and viewport reports
- fullscreen and zoom actions
- optional draggable polygon vertex handles

Applications own:

- database/API adapters and domain object types
- search/filter controls and finished product copy
- selected-place content
- shadcn primitives used to render controls
- semantic CSS token values
- mutations, history, and destructive-action safeguards

The package only refers to semantic names such as `--background`,
`--border`, `--primary`, `--accent`, and `--card`. Hysvær and Nordøy provide
different values for the same contract.

## Distribution

The durable release model is a versioned npm package consumed by both apps.
Local integration is verified with `npm pack`; tarballs are not committed.
A release is complete only when:

1. admin publishes an exact package version from an exact package SHA
2. both app lockfiles resolve that registry release
3. each app is built, deployed, and live-tested at an exact app SHA

Git submodules were rejected because private Vercel checkouts need additional
Git credentials. Git subtrees and copied source were rejected because fixes
would not automatically have one source of truth. Runtime-loading a remote
bundle was rejected because it couples availability and React execution
between otherwise independent sites.
