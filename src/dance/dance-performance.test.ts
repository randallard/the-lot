/**
 * The performance clock's one backwards operation.
 *
 * `advance` is covered by everything that watches the scene; `home` is not, and it is
 * the half of "go home" that can be wrong silently — a rewind that moved the clock but
 * not the dancers would look exactly like a rewind that worked, right up until you
 * judged the pose in front of you.
 */

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { DancerState } from "square-one";
import { useDancePerformance } from "./useDancePerformance";

/** Positions and facings only — the part of a state a pose is built from. */
function places(states: readonly DancerState[]): unknown {
  return states.map((s) => [s.key, s.position.x, s.position.y, s.facing]);
}

describe("useDancePerformance home", () => {
  it("returns the square to beat 0 of a call it is part way through", () => {
    const { result } = renderHook(() => useDancePerformance({ call: "dosado", bpm: 60 }));

    const start = places(result.current.advance(0));
    // Two seconds at 60 bpm is two beats in — far enough that a dosado has moved.
    result.current.advance(1);
    result.current.advance(1);
    expect(result.current.beat()).toBeCloseTo(2);
    expect(places(result.current.advance(0))).not.toEqual(start);

    const home = result.current.home();
    expect(result.current.beat()).toBe(0);
    expect(places(home)).toEqual(start);
  });

  it("stops the clock where it puts it — going home is not a step", () => {
    const { result } = renderHook(() => useDancePerformance({ call: "pass-thru", bpm: 120 }));

    result.current.advance(1);
    result.current.home();
    expect(result.current.beat()).toBe(0);
    // Reading the state again must not creep the clock: the scene poses from `home`
    // and then sits paused, so a `sample` that ticked would show a beat the picture
    // does not match.
    result.current.home();
    expect(result.current.beat()).toBe(0);
  });

  it("brings a couple sequence home to the top of the first call, not the last", () => {
    const { result } = renderHook(() =>
      useDancePerformance({
        call: "partner-trade",
        sequence: ["partner-trade", "california-twirl"],
        bpm: 60,
        // The loop's own restart would do this test's work for it.
        loop: false,
      }),
    );

    const start = places(result.current.advance(0));
    // Past the seam into the second call, so a rewind that only reset the current
    // call's own clock would land somewhere else entirely.
    const half = result.current.beats / 2;
    for (let i = 0; i < Math.ceil(half) + 1; i++) result.current.advance(1);
    expect(result.current.beat()).toBeGreaterThan(half);

    expect(places(result.current.home())).toEqual(start);
  });
});
