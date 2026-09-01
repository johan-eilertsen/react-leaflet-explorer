import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MapExplorer, type MapExplorerFeature } from "./index.js";
import { buildMapSearchIndex, collectVisibleFeatureIds, filterMapSearchIndex, reconcileKeyedEntries, reconcileMapEntries, sameMapFeatureIds, uniqueEntriesByKey, updateSelectedEntries } from "./internals.js";

const features = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [11, 65] },
    properties: { id: "one", label: "Myrøya", type: "island", typeLabel: "Island", searchText: "north" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [12, 66] },
    properties: { id: "two", label: "Boathouse", type: "building", typeLabel: "Building" },
  },
] satisfies MapExplorerFeature[];

describe("filterMapSearchIndex", () => {
  const records = buildMapSearchIndex(features);
  it("searches names, labels and extra search text without case sensitivity", () => {
    expect(filterMapSearchIndex(records, "MYR").map((item) => item.id)).toEqual(["one"]);
    expect(filterMapSearchIndex(records, "north").map((item) => item.id)).toEqual(["one"]);
    expect(filterMapSearchIndex(records, "building").map((item) => item.id)).toEqual(["two"]);
  });

  it("combines text and type filters", () => {
    expect(filterMapSearchIndex(records, "house", "building").map((item) => item.id)).toEqual(["two"]);
    expect(filterMapSearchIndex(records, "house", "island")).toEqual([]);
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
  it("renders the complete controls and selected-place surface on first use", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer features={features} defaultSelectedId="one" ariaLabel="Test map" />,
    );
    expect(markup).toContain('placeholder=""');
    expect(markup).toContain("map-explorer__selected-value");
    expect(markup).toContain("Reset filters");
    expect(markup).toContain("Open map in fullscreen");
    expect(markup).toContain("Zoom in");
    expect(markup).toContain("Myrøya");
  });

  it("uses one integrated combobox for search, filters and reset", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer
        features={features}
        filters={[
          { value: "island", label: "Islands" },
          { value: "building", label: "Buildings" },
        ]}
        defaultSelectedId="one"
      />,
    );

    expect(markup.match(/role="combobox"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('aria-label="Reset filters"');
    expect(markup).toContain("Myrøya");
    expect(markup).toContain("map-explorer__selected-value");
  });

  it("keeps map controls but removes name-based surfaces in browse mode", () => {
    const markup = renderToStaticMarkup(
      <MapExplorer
        mode="browse"
        features={features}
        defaultSelectedId="one"
        selectedActions={<button type="button">Open named place</button>}
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
    expect(markup).not.toContain("Open named place");
    expect(markup).not.toContain("Myrøya");
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
    expect(markup).toContain("Island");
    expect(markup).not.toContain("Myrøya");
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
