import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("map layer motion styles", () => {
  it("applies transform timing only while Leaflet is actively zooming", async () => {
    const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

    expect(stylesheet).toContain(
      ".map-explorer .leaflet-zoom-anim .leaflet-zoom-animated, .map-explorer__surface .leaflet-zoom-anim .leaflet-zoom-animated",
    );
    expect(stylesheet).not.toContain(
      ".map-explorer .leaflet-zoom-animated, .map-explorer__surface .leaflet-zoom-animated",
    );
  });

  it("keeps the line hit area invisible in every display mode", async () => {
    const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

    expect(stylesheet).toContain(
      ".map-explorer .map-explorer__line-hit-area, .map-explorer__surface .map-explorer__line-hit-area { fill: none !important; stroke: transparent !important; stroke-opacity: 0 !important; pointer-events: stroke !important; transition: none !important; }",
    );
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
    expect(stylesheet).toContain("@media (forced-colors: active)");
    expect(stylesheet).toContain("forced-color-adjust: none; stroke: transparent !important; stroke-opacity: 0 !important;");
  });
});
