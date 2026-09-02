import { describe, expect, it, vi } from "vitest";
import type { Map as LeafletMap, Point } from "leaflet";
import {
  cancelTooltipClose,
  createContinuousZoomSession,
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
  trackpadZoomIdleDurationMs,
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

  it("keeps existing tile levels alive through a continuous trackpad zoom", () => {
    const calls: string[] = [];
    let zoom = 10;
    let centerPoint: [number, number] | undefined;
    let moveData: { pinch: true; round: false } | undefined;
    const map = {
      getZoom: () => zoom,
      getZoomScale: (nextZoom: number) => 2 ** (nextZoom - zoom),
      getSize: () => ({ x: 800, y: 600 }),
      containerPointToLatLng: (point: [number, number]) => {
        centerPoint = point;
        return { lat: 65.76, lng: 11.72 };
      },
      _stop: () => { calls.push("stop"); return map; },
      _moveStart: () => { calls.push("moveStart"); return map; },
      _move: (_center: unknown, nextZoom: number, data: { pinch: true; round: false }) => {
        calls.push("move");
        zoom = nextZoom;
        moveData = data;
        return map;
      },
      fire: (event: string) => { calls.push(`fire:${event}`); return map; },
      _moveEnd: () => { calls.push("moveEnd"); return map; },
      _onZoomTransitionEnd: () => { calls.push("finishAnimatedZoom"); },
      _resetView: vi.fn(),
    } as unknown as LeafletMap;

    const session = createContinuousZoomSession(map);
    session.move({ x: 600, y: 300 } as Point, 11);

    expect(trackpadZoomIdleDurationMs).toBe(80);
    expect(session.active).toBe(true);
    expect(centerPoint).toEqual([500, 300]);
    expect(moveData).toEqual({ pinch: true, round: false });
    expect(calls).toEqual(["stop", "moveStart", "move"]);
    expect((map as unknown as { _resetView: ReturnType<typeof vi.fn> })._resetView).not.toHaveBeenCalled();

    session.finish();

    expect(session.active).toBe(false);
    expect(calls).toEqual([
      "stop",
      "moveStart",
      "move",
      "fire:zoom",
      "fire:move",
      "moveEnd",
    ]);
  });

  it("finishes a running Leaflet zoom before trackpad movement starts", () => {
    const calls: string[] = [];
    let zoom = 10;
    const map = {
      _animatingZoom: true,
      getZoom: () => zoom,
      getZoomScale: (nextZoom: number) => 2 ** (nextZoom - zoom),
      getSize: () => ({ x: 800, y: 600 }),
      containerPointToLatLng: () => ({ lat: 65.76, lng: 11.72 }),
      _onZoomTransitionEnd: () => {
        calls.push("finishAnimatedZoom");
        map._animatingZoom = false;
      },
      _stop: () => { calls.push("stop"); return map; },
      _moveStart: () => { calls.push("moveStart"); return map; },
      _move: (_center: unknown, nextZoom: number) => {
        calls.push("move");
        zoom = nextZoom;
        return map;
      },
      fire: () => map,
      _moveEnd: () => map,
    } as unknown as LeafletMap;

    createContinuousZoomSession(map).move({ x: 400, y: 300 } as Point, 10.5);

    expect(calls).toEqual(["finishAnimatedZoom", "stop", "moveStart", "move"]);
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
