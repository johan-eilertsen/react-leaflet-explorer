import type { MapOptions, PanOptions, ZoomOptions } from "leaflet";

export const tooltipFadeDurationMs = 150;
export const selectedOverlayDurationMs = 180;
export const mapZoomDurationMs = 240;
export const mapTileFadeDurationMs = 180;

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
