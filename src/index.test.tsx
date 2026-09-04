import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MapExplorer, MapSelectionPanel, type MapExplorerFeature } from "./index.js";
import { buildMapSearchIndex, collectFeatureLayersInRenderOrder, collectVisibleFeatureIds, filterMapSearchIndex, getLineHitAreaPathOptions, lineHitAreaPaneName, notifyVertexMove, reconcileKeyedEntries, reconcileMapEntries, sameMapFeatureIds, supportsLineHitArea, uniqueEntriesByKey, updateSelectedEntries } from "./internals.js";

const features = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [11, 65] },
    properties: { id: "one", label: "Zone Alpha", type: "zone", typeLabel: "Zone", searchText: "north" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [12, 66] },
    properties: { id: "two", label: "Sensor 2", type: "sensor", typeLabel: "Sensor", searchText: "telemetry" },
  },
] satisfies MapExplorerFeature[];

const lineFeature = {
  type: "Feature",
  geometry: { type: "LineString", coordinates: [[11, 65], [12, 66]] },
  properties: { id: "route", label: "Route", type: "route" },
} satisfies MapExplorerFeature;

const multiLineFeature = {
  ...lineFeature,
  geometry: {
    type: "MultiLineString",
    coordinates: [[[11, 65], [12, 66]], [[12, 66], [13, 65]]],
  },
} satisfies MapExplorerFeature;

describe("line hit areas", () => {
  it("only enables a positive finite width for line geometry", () => {
    expect(supportsLineHitArea(lineFeature, 16)).toBe(true);
    expect(supportsLineHitArea(multiLineFeature, 16)).toBe(true);
    expect(supportsLineHitArea(features[0], 16)).toBe(false);
    expect(supportsLineHitArea(lineFeature, undefined)).toBe(false);
    expect(supportsLineHitArea(lineFeature, 0)).toBe(false);
    expect(supportsLineHitArea(lineFeature, Number.NaN)).toBe(false);
  });

  it("keeps dashed and solid visual styles independent from the invisible width", () => {
    const dashed = { color: "#315c40", weight: 2.5, dashArray: "6 5" };
    const solid = { color: "#315c40", weight: 2 };

    expect(getLineHitAreaPathOptions(16)).toEqual({
      pane: lineHitAreaPaneName,
      stroke: true,
      color: "transparent",
      opacity: 0,
      weight: 16,
      fill: false,
      fillOpacity: 0,
      interactive: true,
      className: "map-explorer__line-hit-area",
    });
    expect(dashed).toEqual({ color: "#315c40", weight: 2.5, dashArray: "6 5" });
    expect(solid).toEqual({ color: "#315c40", weight: 2 });
  });

  it("selects inside the configured hit width but not outside it", async () => {
    Object.assign(globalThis, {
      window: { screen: {}, devicePixelRatio: 1 },
      document: {
        documentElement: { style: {} },
        createElement: () => ({ getContext: () => ({}), style: {} }),
      },
    });
    const L = await import("leaflet");
    type TestPolyline = ReturnType<typeof L.polyline> & {
      _containsPoint: (point: ReturnType<typeof L.point>) => boolean;
      _parts: ReturnType<typeof L.point>[][];
      _rawPxBounds: ReturnType<typeof L.bounds>;
      _renderer: { options: { tolerance: number } };
      _updateBounds: () => void;
    };
    const createTestPolyline = (weight: number) => {
      const layer = L.polyline([], { weight, interactive: true }) as TestPolyline;
      layer._parts = [[L.point(0, 0), L.point(100, 0)]];
      layer._rawPxBounds = L.bounds(L.point(0, 0), L.point(100, 0));
      layer._renderer = { options: { tolerance: 0 } };
      layer._updateBounds();
      return layer;
    };
    const visibleLayer = createTestPolyline(2.5);
    const hitLayer = createTestPolyline(getLineHitAreaPathOptions(16).weight);
    const onSelect = vi.fn();
    visibleLayer.on("click", () => onSelect("route"));
    hitLayer.on("click", () => onSelect("route"));
    const clickAt = (point: ReturnType<typeof L.point>) => {
      if (visibleLayer._containsPoint(point)) visibleLayer.fire("click");
      else if (hitLayer._containsPoint(point)) hitLayer.fire("click");
    };

    clickAt(L.point(50, 7));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenLastCalledWith("route");

    clickAt(L.point(50, 9));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("keeps hit and visible layers in deterministic feature order", () => {
    const entries = [
      { hit: "hit-one", visible: "visible-one" },
      { hit: null, visible: "visible-two" },
      { hit: "hit-three", visible: "visible-three" },
    ];
    expect(collectFeatureLayersInRenderOrder(
      entries,
      (entry) => entry.hit,
      (entry) => entry.visible,
    )).toEqual(["hit-one", "hit-three", "visible-one", "visible-two", "visible-three"]);
  });
});

describe("vertex editing", () => {
  it("passes the complete feature to the consumer callback", () => {
    const onVertexMove = vi.fn();

    notifyVertexMove(onVertexMove, features[0], 2, [11.25, 65.25]);

    expect(onVertexMove).toHaveBeenCalledWith(features[0], 2, [11.25, 65.25]);
  });
});

describe("filterMapSearchIndex", () => {
  const records = buildMapSearchIndex(features);
  it("searches labels, types and extra search text without case sensitivity", () => {
    expect(filterMapSearchIndex(records, "ALPHA").map((item) => item.id)).toEqual(["one"]);
    expect(filterMapSearchIndex(records, "north").map((item) => item.id)).toEqual(["one"]);
    expect(filterMapSearchIndex(records, "sensor").map((item) => item.id)).toEqual(["two"]);
  });

  it("combines text and type filters", () => {
    expect(filterMapSearchIndex(records, "telemetry", "sensor").map((item) => item.id)).toEqual(["two"]);
    expect(filterMapSearchIndex(records, "telemetry", "zone")).toEqual([]);
  });

  it("allows all as a real feature type", () => {
    const featureWithAllType = {
      ...features[0],
      properties: { ...features[0].properties, id: "all-type", type: "all" },
    } satisfies MapExplorerFeature;
    const extendedRecords = buildMapSearchIndex([...features, featureWithAllType]);

    expect(filterMapSearchIndex(extendedRecords, "", "all").map((item) => item.id)).toEqual(["all-type"]);
    expect(filterMapSearchIndex(extendedRecords, "").map((item) => item.id)).toEqual(["one", "two", "all-type"]);
  });
});

describe("map search index", () => {
  it("deduplicates geometry parts while retaining searchable text", () => {
    const duplicate = { ...features[0], properties: { ...features[0].properties, searchText: "south" } };
    const records = buildMapSearchIndex([...features, duplicate]);
    expect(records).toHaveLength(2);
    expect(filterMapSearchIndex(records, "south").map((record) => record.id)).toEqual(["one"]);
  });
});

describe("sameMapFeatureIds", () => {
  it("suppresses repeated viewport updates without hiding real changes", () => {
    expect(sameMapFeatureIds(["one", "two"], ["one", "two"])).toBe(true);
    expect(sameMapFeatureIds(["one", "two"], ["two", "one"])).toBe(false);
    expect(sameMapFeatureIds(null, [])).toBe(false);
  });
});

describe("collectVisibleFeatureIds", () => {
  it("deduplicates multipart features without allocating geometry layers", () => {
    const secondPart = { ...features[0], geometry: { type: "Point", coordinates: [11.5, 65.5] } } satisfies MapExplorerFeature;
    expect(collectVisibleFeatureIds([...features, secondPart], (feature) => feature !== features[1])).toEqual(["one"]);
  });
});

describe("reconcileMapEntries", () => {
  it("preserves existing layer entries across selection-style reruns", () => {
    const registry = new Map<MapExplorerFeature, { key: string }>();
    const create = vi.fn((feature: MapExplorerFeature) => ({ key: feature.properties.id }));
    const remove = vi.fn();
    reconcileMapEntries(registry, features, create, remove);
    const entries = [...registry.values()];

    reconcileMapEntries(registry, features, create, remove);

    expect([...registry.values()][0]).toBe(entries[0]);
    expect(create).toHaveBeenCalledTimes(features.length);
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes only stale features and creates only new features", () => {
    const registry = new Map<object, { key: string }>();
    const removed: string[] = [];
    reconcileMapEntries(registry, features, (feature) => ({ key: String("properties" in feature && (feature as MapExplorerFeature).properties.id) }), (entry) => removed.push(entry.key));
    const retained = registry.get(features[1]);
    const added = { ...features[0], properties: { ...features[0].properties, id: "three" } };
    reconcileMapEntries(registry, [features[1], added], (feature) => ({ key: (feature as MapExplorerFeature).properties.id }), (entry) => removed.push(entry.key));
    expect(registry.get(features[1])).toBe(retained);
    expect(removed).toEqual(["one"]);
  });
});

describe("uniqueEntriesByKey", () => {
  it("keeps one permanent label for multipart features with the same logical id", () => {
    const entries = [
      { id: "one", part: 1 },
      { id: "one", part: 2 },
      { id: "two", part: 1 },
    ];

    expect(uniqueEntriesByKey(entries, (entry) => entry.id)).toEqual([
      { id: "one", part: 1 },
      { id: "two", part: 1 },
    ]);
  });
});

describe("reconcileKeyedEntries", () => {
  it("updates one logical label instead of creating a duplicate when feature objects change", () => {
    const registry = new Map<string, { text: string }>();
    const create = vi.fn((entry: { id: string; text: string }) => ({ text: entry.text }));
    const update = vi.fn((label: { text: string }, entry: { text: string }) => { label.text = entry.text; });
    const remove = vi.fn();

    reconcileKeyedEntries(registry, [{ id: "one", text: "First" }], (entry) => entry.id, create, update, remove);
    reconcileKeyedEntries(registry, [{ id: "one", text: "Updated" }], (entry) => entry.id, create, update, remove);

    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(registry.get("one")?.text).toBe("Updated");
  });
});

describe("updateSelectedEntries", () => {
  const entries = [
    { id: "one", part: 1 },
    { id: "one", part: 2 },
    { id: "two", part: 1 },
    { id: "three", part: 1 },
  ];

  it("updates only every geometry part of the previous and next selection", () => {
    const update = vi.fn();
    expect(updateSelectedEntries(entries, "one", "two", false, (entry) => entry.id, update)).toBe(3);
    expect(update.mock.calls.map(([entry, selected]) => [entry.id, entry.part, selected])).toEqual([
      ["one", 1, false],
      ["one", 2, false],
      ["two", 1, true],
    ]);
  });

  it("updates all entries only when path options change", () => {
    const update = vi.fn();
    expect(updateSelectedEntries(entries, "one", "two", true, (entry) => entry.id, update)).toBe(entries.length);
  });
});

describe("MapExplorer", () => {
  it("renders the shared selected panel with an icon-only close control", () => {
    const markup = renderToStaticMarkup(
      <MapSelectionPanel
        ariaLabel="Selected map object"
        closeLabel="Close selected map object"
        onClose={() => undefined}
      >
        <h2>Map object</h2>
      </MapSelectionPanel>,
    );

    expect(markup).toContain('class="map-explorer__selected"');
    expect(markup).toContain('aria-label="Close selected map object"');
    expect(markup).toContain('class="map-explorer__icon"');
    expect(markup).not.toContain(">Close selected map object<");
  });

  it("renders generic default labels and the selected-feature surface", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer features={features} defaultSelectedId="one" ariaLabel="Test map" />,
    );
    expect(markup).toContain('placeholder=""');
    expect(markup).toContain("map-explorer__selected-value");
    expect(markup).toContain('aria-label="Search map features"');
    expect(markup).toContain("Reset filters");
    expect(markup).toContain("Open map in fullscreen");
    expect(markup).toContain("Zoom in");
    expect(markup).toContain('aria-label="Selected feature"');
    expect(markup).toContain('aria-label="Close selected feature"');
    expect(markup).toContain("Zone Alpha");
  });

  it("uses one integrated combobox for search, filters and reset", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer
        features={features}
        filters={[
          { value: "zone", label: "Zones" },
          { value: "sensor", label: "Sensors" },
        ]}
        defaultSelectedId="one"
      />,
    );

    expect(markup.match(/role="combobox"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('aria-label="Reset filters"');
    expect(markup).toContain("Zone Alpha");
    expect(markup).toContain("map-explorer__selected-value");
  });

  it("keeps map controls but removes name-based surfaces in browse mode", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer
        mode="browse"
        features={features}
        defaultSelectedId="one"
        selectedActions={<button type="button">Open named feature</button>}
        ariaLabel="Map objects"
      />,
    );

    expect(markup).toContain('role="application" aria-label="Map objects" tabindex="0"');
    expect(markup).toContain("Open map in fullscreen");
    expect(markup).toContain("Zoom in");
    expect(markup).toContain("Zoom out");
    expect(markup).not.toContain('role="combobox"');
    expect(markup).not.toContain("map-explorer__toolbar-region");
    expect(markup).not.toContain("map-explorer__result-count");
    expect(markup).not.toContain("map-explorer__selected");
    expect(markup).not.toContain("Open named feature");
    expect(markup).not.toContain("Zone Alpha");
  });

  it("renders explicit name-free selected content in browse mode", () => {
    const renderSelected = vi.fn((feature: MapExplorerFeature) => (
      <aside aria-label="Selected map object">{feature.properties.typeLabel}</aside>
    ));
    const markup = renderToStaticMarkup(
      <MapExplorer
        mode="browse"
        features={features}
        defaultSelectedId="one"
        renderSelected={renderSelected}
      />,
    );

    expect(renderSelected).toHaveBeenCalledWith(
      features[0],
      { clearSelection: expect.any(Function) },
    );
    expect(markup).toContain('aria-label="Selected map object"');
    expect(markup).toContain("Zone");
    expect(markup).not.toContain("Zone Alpha");
  });

  it("names the zoom control group with its default or an overridden label", () => {
    const defaultMarkup = renderToStaticMarkup(
      <MapExplorer features={features} />,
    );
    const localizedMarkup = renderToStaticMarkup(
      <MapExplorer
        features={features}
        labels={{ zoomControls: "Zoom i kartet" }}
      />,
    );

    expect(defaultMarkup).toContain(
      'class="map-explorer__zoom" role="group" aria-label="Zoom controls"',
    );
    expect(localizedMarkup).toContain(
      'class="map-explorer__zoom" role="group" aria-label="Zoom i kartet"',
    );
    expect(localizedMarkup).not.toContain('aria-label="Zoom controls"');
  });
});
