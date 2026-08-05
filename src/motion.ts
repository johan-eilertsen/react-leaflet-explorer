import type { PanOptions } from "leaflet";

export const tooltipFadeDurationMs = 150;
export const selectedOverlayDurationMs = 180;

export const directGesturePanOptions = { animate: false } as const satisfies PanOptions;

export const selectionPanOptions = {
  animate: true,
  duration: 0.2,
  easeLinearity: 0.25,
  noMoveStart: true,
} as const satisfies PanOptions;

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
