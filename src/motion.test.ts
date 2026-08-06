import { describe, expect, it, vi } from "vitest";
import {
  cancelTooltipClose,
  directGesturePanOptions,
  getPresenceTransition,
  getSelectionPanOptions,
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
