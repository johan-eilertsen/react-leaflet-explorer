# react-leaflet-explorer

`react-leaflet-explorer` is an accessible React and Leaflet component for searching, filtering, viewing and selecting GeoJSON features. It includes fullscreen and zoom controls, mouse, trackpad and touch input, and a low-level map primitive for custom interfaces.

The package contains no application data or product styling. Its semantic CSS variables let each application supply its own theme.

## Install

```sh
npm install react-leaflet-explorer leaflet
```

Import the component and its complete base stylesheet once:

```tsx
import { MapExplorer } from "react-leaflet-explorer";
import "react-leaflet-explorer/styles.css";

export function AssetsMap() {
  return (
    <MapExplorer
      ariaLabel="Asset map"
      features={assets}
      labels={{
        search: "Search assets",
        searchPlaceholder: "Search by asset name or identifier",
        filter: "Filter by asset type",
        allTypes: "All assets",
      }}
      onSelect={(id) => console.log(id)}
    />
  );
}
```

OpenStreetMap tiles are the default. Supply `tileUrl` and `attribution` to use another provider. The map fits non-empty feature data on first load. For an empty initial map, pass `center` or `bounds`; otherwise the map starts at `[0, 0]`.

## Feature data

`features` accepts GeoJSON with a small metadata contract:

```ts
type MapExplorerFeature = Feature<Geometry, {
  id: string;
  label: string;
  type: string;
  typeLabel?: string;
  description?: string;
  searchText?: string;
  [key: string]: unknown;
}>;
```

- `id` identifies one logical feature. Several geometry parts can share an ID.
- `label` supplies the searchable and accessible name.
- `type` supplies the filter value. It has no reserved values. `typeLabel` can provide a human-readable label.
- `description` appears in the default selection panel.
- `searchText` adds searchable aliases, identifiers or keywords.
- Other properties remain available to custom renderers and callbacks.

The explorer derives its type filters from the data. Pass `filters` to control their order and labels. Search, type filters and reset share one combobox. The result count covers unique features in the current viewport.

Selecting a feature preserves the current zoom. The map pans only when the selected feature is outside the viewport. Hover labels reuse one tooltip, so the map shows only the label under the pointer.

## Explore and browse modes

`mode="explore"` is the default. It includes search, type filters, a result count, hover labels and a selection panel.

Use `mode="browse"` for a map where people select features directly. Browse mode removes the search interface, result count, hover labels and default selection panel. It keeps selected geometry, `onSelect`, zoom, fullscreen, pan and pinch behaviour.

You can add custom selected content in browse mode:

```tsx
import { MapExplorer, MapSelectionPanel } from "react-leaflet-explorer";

<MapExplorer
  mode="browse"
  ariaLabel="Operations map"
  features={mapFeatures}
  onSelect={(id) => console.log(id)}
  renderSelected={(feature, { clearSelection }) => (
    <MapSelectionPanel
      ariaLabel="Selected feature"
      closeLabel="Close selected feature"
      onClose={clearSelection}
    >
      <p>{feature.properties.typeLabel ?? feature.properties.type}</p>
    </MapSelectionPanel>
  )}
/>
```

The map, zoom controls and fullscreen control remain keyboard accessible. Leaflet geometry is selected by pointer click; browse mode does not add keyboard selection for individual map features.

## Selection and custom content

The component can own selection with `defaultSelectedId`, or an application can control it with `selectedId` and `onSelect`.

The default panel shows the feature type, label and description. Add actions with `selectedActions`, or replace the panel content with `renderSelected`:

```tsx
<MapExplorer
  features={mapFeatures}
  renderSelected={(feature, { clearSelection }) => (
    <FeatureCard feature={feature} onClose={clearSelection} />
  )}
/>
```

All interface text can be replaced through `labels`. The defaults use general feature terminology and English accessible names.

## Theme

Override variables on the component or a parent. The defaults also fall back to common shadcn semantic variables where appropriate. The combobox popup stays inside the component tree, so a locally scoped theme applies to it.

```css
.operations-map {
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

Motion variables can be overridden with the rest of the theme. For `prefers-reduced-motion`, the component removes spatial transforms and programmatic selection panning while preserving short opacity and colour feedback.

Double-click and pointer clicks on the built-in zoom controls use the shared 240 ms map-zoom transition. Keyboard zoom, Ctrl + trackpad pinch, touch pinch and direct panning stay immediate. The transform timing is active only while Leaflet is zooming, so geometry and tiles stay aligned during a pan.

Low-level `MapCanvas` controls can use `zoomInImmediately` and `zoomOutImmediately` when an application renders its own keyboard-activated zoom buttons. The same motion fallbacks apply when `MapCanvas` is rendered without a surrounding `MapExplorer`.

Use `pathOptions` when geometry needs more than token changes. The default outline is one pixel, or two pixels for the selected feature.

## Easier selection of thin lines

Use `lineHitAreaWidth` to add a wider, invisible pointer area behind `LineString` and `MultiLineString` geometry. The value is the total width in pixels and does not change the visible `weight` or `dashArray`. It works on both `MapExplorer` and `MapCanvas`.

```tsx
<MapExplorer
  features={networkLines}
  lineHitAreaWidth={16}
  pathOptions={() => ({
    color: "#315c40",
    weight: 2.5,
    dashArray: "6 5",
  })}
/>
```

Omit `lineHitAreaWidth` to keep Leaflet's default pointer behaviour.

## Optional map labels

Use `mapLabel` for short labels that belong directly on the geometry, such as asset or zone identifiers. One label is rendered per logical feature ID, including features with several geometry parts.

```tsx
<MapExplorer
  features={mapFeatures}
  mapLabel={(feature) => String(feature.properties.reference ?? "") || null}
/>
```

## Input behaviour

- A pixel-based two-finger trackpad gesture pans the map in both axes and keeps the surrounding page still while the pointer is over the map.
- Ctrl + trackpad pinch zooms around the pointer. Existing tiles stay visible until their replacements are ready.
- Direct touch pans and pinches without an activation step.
- The combobox and map controls support keyboard navigation.

## Optional vertex editing

Pass `editableFeatureIds` and `onVertexMove` to show draggable handles for polygon vertices. The callback receives the complete feature, vertex index and updated coordinate. Read any domain identifier from the feature's own properties. The application remains responsible for saving, history and destructive-action safeguards.

## 0.6 migration

Version 0.6 uses general feature terminology throughout the public contract:

- Replace the `selectedPlace` label override with `selectedFeature`.
- The first `onVertexMove` argument is now the complete feature instead of its ID. Read `feature.properties.id` or another application-defined property in the callback.

The package no longer reserves `"all"` as an internal type-filter value.

## Low-level primitive

`MapCanvas` exposes the map frame, geometry rendering and input behaviour without the toolbar or built-in overlays. Use it when the complete `MapExplorer` interface does not fit.

## Project management

Use [GitHub Issues](https://github.com/johan-eilertsen/react-leaflet-explorer/issues) for active package work. Keep product-specific integration, content and release approval in each consuming application.

## License

MIT
