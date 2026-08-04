# Hysvær map workspace

Shared, product-neutral Leaflet workspace for Hysvær and Nordøy.

The package owns map input, geometry rendering, selection, fullscreen, zoom,
viewport reporting, and optional vertex handles. Applications own data
adapters, copy, controls around the map, and semantic token values.

`hysvaer-map-workspace` is the public package name. Local QA uses
`npm pack`; released versions are published on the public npm registry.

## Install

```sh
npm install hysvaer-map-workspace leaflet
```

Import the component and its base styles:

```tsx
import { MapWorkspace } from "hysvaer-map-workspace";
import "hysvaer-map-workspace/styles.css";
```

The consuming application provides map tiles, attribution, accessible labels,
feature data, controls, and semantic CSS token values.

## License

MIT
