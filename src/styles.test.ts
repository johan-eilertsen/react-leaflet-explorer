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
});
