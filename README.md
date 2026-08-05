# react-leaflet-explorer

An opinionated React + Leaflet map that works out of the box. It combines an
accessible Base UI combobox, text search, type filtering, selection details,
fullscreen and zoom controls, and deliberate mouse, trackpad and touch input.

The package contains no application data or product-specific styling. It uses
semantic CSS variables, so multiple products can share the same behavior while
using different themes.

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
      }}
      onSelect={(id) => console.log(id)}
    />
  );
}
```

OpenStreetMap tiles are the default. Supply `tileUrl` and `attribution` when
using another tile provider.

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
control filter order and labels.

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
}
```

Use `pathOptions` when geometry needs more than token changes. The default
outline is one pixel, or two pixels for the selected feature.

## Optional map labels

Use `mapLabel` for short, always-visible labels that belong directly on the
geometry, such as reference numbers in an administration map. Public maps can
omit it and keep the same explorer behavior without internal metadata.

```tsx
<MapExplorer
  features={places}
  mapLabel={(feature) => String(feature.properties.number ?? "") || null}
/>
```

## Input behavior

- A vertical mouse-wheel or trackpad gesture keeps scrolling the page.
- A horizontal two-finger trackpad gesture pans the map.
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
`MapExplorer` product surface does not fit. `MapWorkspace` remains as a
deprecated alias for migration from the pre-release package.

## License

MIT
