# react-leaflet-explorer

An opinionated React + Leaflet map that works out of the box. It combines an
accessible Base UI combobox, text search, type filtering, selection details,
fullscreen and zoom controls, and deliberate mouse, trackpad and touch input.

The package contains no application data or product-specific styling. It uses
semantic CSS variables, so multiple products can share the same behavior while
using different themes.

## Project management

Active, generic package work belongs in this repository's GitHub Issues. Hysvær-specific product review and release work belongs to [the Hysvær project](https://github.com/johan-eilertsen/hysvaer/issues/1).

Historical package tasks, plans, and handoffs are read-only under `docs/archive/project-management/`. The current Hysvær integration uses the published package; no package milestone is active merely because Hysvær still needs product approval.

## Install

```sh
npm install react-leaflet-explorer leaflet
```

Import the component and its complete base stylesheet once:

```tsx
import { MapExplorer } from "react-leaflet-explorer";
import "react-leaflet-explorer/styles.css";

export function PlacesMap() {
  return (
    <MapExplorer
      ariaLabel="Places on the island"
      features={places}
      labels={{
        search: "Search places",
        searchPlaceholder: "Search by name",
        filter: "Filter by type",
        allTypes: "All places",
        reset: "Reset",
        zoomControls: "Map zoom controls",
      }}
      onSelect={(id) => console.log(id)}
    />
  );
}
```

OpenStreetMap tiles are the default. Supply `tileUrl` and `attribution` when
using another tile provider. The map fits non-empty feature data on first load.
For an empty initial map, pass `center` or `bounds` to choose a relevant start
view; the generic fallback center is `[0, 0]`.

## Feature shape

`features` is GeoJSON with a small property contract:

```ts
type MapExplorerFeature = Feature<Geometry, {
  id: string;
  label: string;
  type: string;
  typeLabel?: string;
  description?: string;
  searchText?: string;
  editId?: string;
}>;
```

The explorer derives its type filter from the features. Pass `filters` to
control filter order and labels. Search, type filters and reset share one
combobox: type choices sit above the place suggestions, and the reset button
clears the query, active type and selected place. A selected place is shown in
the field when the visitor is not typing. Selecting a feature preserves the
current zoom; the map only pans when the feature is outside the viewport.
When a query or type filter is active, the explorer shows the deduplicated
result count for the current viewport. Hover labels reuse one tooltip so only
the feature under the pointer is announced visually.
The viewport count remains visible without active filters and occupies a fixed
layout slot. Pixel-based trackpad wheel gestures pan the map in both axes and
do not scroll the surrounding page.

## Browse without place names

Use `mode="browse"` when visitors should select map objects directly without seeing place names. Browse mode removes search, type filters, the result count, hover labels and the built-in selected-place panel. It keeps selected geometry, `onSelect`, zoom, fullscreen, pan and pinch behavior.

The `label` property is still required by the shared feature shape. Use a non-place identifier if the feature data must not contain a place name. Add name-free selected content with `renderSelected`:

```tsx
<MapExplorer
  mode="browse"
  ariaLabel="Map of islands and reefs"
  features={mapObjects}
  onSelect={(id) => console.log(id)}
  renderSelected={(feature, { clearSelection }) => (
    <aside aria-label="Selected map object">
      <p>{feature.properties.typeLabel ?? feature.properties.type}</p>
      <button type="button" onClick={clearSelection}>Close details</button>
    </aside>
  )}
/>
```

The map and its zoom and fullscreen controls remain keyboard accessible. Leaflet geometry is selected by pointer click; browse mode does not add keyboard selection for individual unnamed objects.

## Selection and custom content

The component can own selection with `defaultSelectedId`, or an application
can control it with `selectedId` and `onSelect`.

The built-in panel shows type, name and description. Add product actions with
`selectedActions`, or replace only the selected-place content:

```tsx
<MapExplorer
  features={places}
  renderSelected={(feature, { clearSelection }) => (
    <PlaceCard place={feature.properties} onClose={clearSelection} />
  )}
/>
```

## Theme

Override variables on the component or a parent. The defaults also fall back
to common shadcn semantic variables where appropriate. The combobox popup is
kept inside the component tree, so a locally scoped theme applies to it too.

```css
.family-map {
  --map-explorer-background: #faf8f1;
  --map-explorer-foreground: #17251b;
  --map-explorer-surface: #fffdf7;
  --map-explorer-muted: #e9eadf;
  --map-explorer-muted-foreground: #667068;
  --map-explorer-border: #bdc4bb;
  --map-explorer-ring: #315c40;
  --map-explorer-accent: #e0e8df;
  --map-explorer-accent-foreground: #17251b;
  --map-explorer-line: #315c40;
  --map-explorer-fill: #75a080;
  --map-explorer-selected: #a74420;
  --map-explorer-selected-fill: #cf7b54;
  --map-explorer-radius: 0.4rem;
  --map-explorer-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --map-explorer-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --map-explorer-ease-feedback: ease;
  --map-explorer-duration-feedback: 120ms;
  --map-explorer-duration-press: 140ms;
  --map-explorer-duration-tooltip: 150ms;
  --map-explorer-duration-geometry: 160ms;
  --map-explorer-duration-popup: 180ms;
  --map-explorer-duration-map-tile-fade: 180ms;
  --map-explorer-duration-map-zoom: 240ms;
}
```

Motion variables can be overridden with the rest of the theme. For
`prefers-reduced-motion`, the component removes spatial transforms and
programmatic selection panning while preserving short opacity and color
feedback.

Double-click and pointer clicks on the built-in zoom controls use the shared
240 ms map-zoom transition. Keyboard zoom, Ctrl + trackpad pinch, touch pinch
and direct panning stay immediate. Low-level `MapCanvas` controls can use
`zoomInImmediately` and `zoomOutImmediately` when a consumer renders its own
keyboard-activated zoom buttons. The same motion fallbacks apply when
`MapCanvas` is rendered without a surrounding `MapExplorer`.

Use `pathOptions` when geometry needs more than token changes. The default
outline is one pixel, or two pixels for the selected feature.

## Optional map labels

Use `mapLabel` for short, always-visible labels that belong directly on the
geometry, such as reference numbers in an administration map. Public maps can
omit it and keep the same explorer behavior without internal metadata. One
label is rendered per logical feature ID, including objects with multiple
geometry parts.

```tsx
<MapExplorer
  features={places}
  mapLabel={(feature) => String(feature.properties.number ?? "") || null}
/>
```

## Input behavior

- A pixel-based two-finger trackpad gesture pans the map in both axes and keeps
  the surrounding page still while the pointer is over the map.
- Ctrl + trackpad pinch zooms smoothly around the pointer.
- Direct touch pans and pinches without an activation step.
- Keyboard navigation is available in the combobox and map.

## Optional vertex editing

Pass `editableFeatureIds` and `onVertexMove` to show draggable handles for
polygon vertices. Saving, history and destructive-action safeguards remain the
application's responsibility.

## Low-level primitive

`MapCanvas` exposes the map frame, geometry rendering and input behavior
without the toolbar or built-in overlays. Use it only when the complete
`MapExplorer` product surface does not fit.

## 0.2 migration

The pre-release `MapWorkspace` alias and the undocumented filtering helpers
were removed in 0.2. Import `MapCanvas` for the low-level primitive and keep
application-specific filtering outside the package.

## License

MIT
