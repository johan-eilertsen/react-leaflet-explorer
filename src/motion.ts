import type { LatLng, Map as LeafletMap, MapOptions, PanOptions, Point, ZoomOptions } from "leaflet";

export const tooltipFadeDurationMs = 150;
export const selectedOverlayDurationMs = 180;
export const mapZoomDurationMs = 240;
export const mapTileFadeDurationMs = 180;
export const trackpadZoomIdleDurationMs = 80;

export const directGesturePanOptions = { animate: false } as const satisfies PanOptions;
export const animatedZoomOptions = { animate: true } as const satisfies ZoomOptions;
export const immediateZoomOptions = { animate: false } as const satisfies ZoomOptions;

export const selectionPanOptions = {
  animate: true,
  duration: 0.2,
  easeLinearity: 0.25,
  noMoveStart: true,
} as const satisfies PanOptions;

export function getSelectionPanOptions(prefersReducedMotion: boolean): PanOptions {
  return prefersReducedMotion ? { animate: false } : selectionPanOptions;
}

export function getMapMotionOptions(prefersReducedMotion: boolean) {
  return {
    fadeAnimation: true,
    markerZoomAnimation: !prefersReducedMotion,
    zoomAnimation: !prefersReducedMotion,
  } as const satisfies Pick<MapOptions, "fadeAnimation" | "markerZoomAnimation" | "zoomAnimation">;
}

export function getZoomOptions(prefersReducedMotion: boolean, initiatedByKeyboard = false): ZoomOptions {
  return prefersReducedMotion || initiatedByKeyboard ? immediateZoomOptions : animatedZoomOptions;
}

type ContinuousZoomMap = LeafletMap & {
  _animatingZoom?: boolean;
  _onZoomTransitionEnd: () => void;
  _stop: () => LeafletMap;
  _moveStart: (zoomChanged: boolean, noMoveStart?: boolean) => LeafletMap;
  _move: (
    center: LatLng,
    zoom: number,
    data: { pinch: true; round: false },
  ) => LeafletMap;
  _moveEnd: (zoomChanged: boolean) => LeafletMap;
};

/**
 * Mirrors Leaflet's touch-pinch lifecycle for a continuous trackpad pinch.
 * Leaflet's public setZoomAround resets every tile level when called without
 * animation, which briefly exposes the frame background between wheel events.
 */
export function createContinuousZoomSession(map: LeafletMap) {
  const continuousMap = map as ContinuousZoomMap;
  let active = false;

  return {
    get active() {
      return active;
    },
    move(point: Point, zoom: number) {
      if (continuousMap._animatingZoom) {
        continuousMap._onZoomTransitionEnd();
      }
      if (zoom === map.getZoom()) return;

      const scale = map.getZoomScale(zoom);
      const size = map.getSize();
      const halfX = size.x / 2;
      const halfY = size.y / 2;
      const scaleOffset = 1 - 1 / scale;
      const center = map.containerPointToLatLng([
        halfX + (point.x - halfX) * scaleOffset,
        halfY + (point.y - halfY) * scaleOffset,
      ]);

      if (!active) {
        continuousMap._stop();
        continuousMap._moveStart(true, false);
        active = true;
      }

      continuousMap._move(center, zoom, { pinch: true, round: false });
    },
    finish() {
      if (!active) return;

      // A final non-pinch zoom event lets GridLayer prune old levels only
      // after the replacement tiles are ready, without a view reset.
      map.fire("zoom");
      map.fire("move");
      continuousMap._moveEnd(true);
      active = false;
    },
  };
}

export function getKeyboardZoomDelta(key: string) {
  if (key === "+" || key === "=") return 1;
  if (key === "-" || key === "_") return -1;
  return 0;
}

export function getPresenceTransition(previousPresent: boolean, nextPresent: boolean) {
  if (previousPresent === nextPresent) return null;
  return nextPresent ? "enter" : "exit";
}

export function cancelTooltipClose(timer: ReturnType<typeof setTimeout> | null) {
  if (timer) clearTimeout(timer);
  return null;
}

export function scheduleTooltipClose(callback: () => void) {
  return setTimeout(callback, tooltipFadeDurationMs);
}
