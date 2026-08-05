import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MapExplorer, filterMapFeatures, sameMapFeatureIds, type MapExplorerFeature } from "./index.js";

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

describe("filterMapFeatures", () => {
  it("searches names, labels and extra search text without case sensitivity", () => {
    expect(filterMapFeatures(features, "MYR").map((item) => item.properties.id)).toEqual(["one"]);
    expect(filterMapFeatures(features, "north").map((item) => item.properties.id)).toEqual(["one"]);
    expect(filterMapFeatures(features, "building").map((item) => item.properties.id)).toEqual(["two"]);
  });

  it("combines text and type filters", () => {
    expect(filterMapFeatures(features, "house", "building").map((item) => item.properties.id)).toEqual(["two"]);
    expect(filterMapFeatures(features, "house", "island")).toEqual([]);
  });
});

describe("sameMapFeatureIds", () => {
  it("suppresses repeated viewport updates without hiding real changes", () => {
    expect(sameMapFeatureIds(["one", "two"], ["one", "two"])).toBe(true);
    expect(sameMapFeatureIds(["one", "two"], ["two", "one"])).toBe(false);
    expect(sameMapFeatureIds(null, [])).toBe(false);
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
});
