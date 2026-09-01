import { describe, expect, it, vi } from "vitest";
import {
  cancelTooltipClose,
  directGesturePanOptions,
  getKeyboardZoomDelta,
  getMapMotionOptions,
  getPresenceTransition,
  getSelectionPanOptions,
  getZoomOptions,
  immediateZoomOptions,
  mapTileFadeDurationMs,
  mapZoomDurationMs,
  scheduleTooltipClose,
  selectionPanOptions,
  tooltipFadeDurationMs,
} from "./motion.js";

describe("map motion", () => {
  it("does not restart presence when open content gets a new React node", () => {
    expect(getPresenceTransition(true, true)).toBeNull();
    expect(getPresenceTransition(false, false)).toBeNull();
    expect(getPresenceTransition(false, true)).toBe("enter");
    expect(getPresenceTransition(true, false)).toBe("exit");
  });

  it("keeps direct gesture panning immediate and selection panning gentle", () => {
    expect(directGesturePanOptions).toEqual({ animate: false });
    expect(selectionPanOptions).toEqual({
      animate: true,
      duration: 0.2,
      easeLinearity: 0.25,
      noMoveStart: true,
    });
    expect(getSelectionPanOptions(false)).toBe(selectionPanOptions);
    expect(getSelectionPanOptions(true)).toEqual({ animate: false });
  });

  it("animates spatial pointer zoom while keeping keyboard and reduced motion immediate", () => {
    expect(mapZoomDurationMs).toBe(240);
    expect(mapTileFadeDurationMs).toBe(180);
    expect(getMapMotionOptions(false)).toEqual({
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomAnimation: true,
    });
    expect(getMapMotionOptions(true)).toEqual({
      fadeAnimation: true,
      markerZoomAnimation: false,
      zoomAnimation: false,
    });
    expect(getZoomOptions(false, false)).toEqual({ animate: true });
    expect(getZoomOptions(false, true)).toBe(immediateZoomOptions);
    expect(getZoomOptions(true, false)).toBe(immediateZoomOptions);
  });

  it("recognizes only the keyboard keys that Leaflet uses for zoom", () => {
    expect(getKeyboardZoomDelta("+")).toBe(1);
    expect(getKeyboardZoomDelta("=")).toBe(1);
    expect(getKeyboardZoomDelta("-")).toBe(-1);
    expect(getKeyboardZoomDelta("_")).toBe(-1);
    expect(getKeyboardZoomDelta("ArrowUp")).toBe(0);
  });

  it("cancels a pending tooltip close when a new hover starts", () => {
    vi.useFakeTimers();
    const oldClose = vi.fn();
    const activeClose = vi.fn();
    let timer = scheduleTooltipClose(oldClose);

    timer = cancelTooltipClose(timer);
    timer = scheduleTooltipClose(activeClose);
    vi.advanceTimersByTime(tooltipFadeDurationMs);

    expect(timer).not.toBeNull();
    expect(oldClose).not.toHaveBeenCalled();
    expect(activeClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
