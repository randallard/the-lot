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
import type { CallName, DancerState } from "square-one";
import { useDancePerformance } from "./useDancePerformance";
import { armMetrics, touchHold } from "./arm-pose";
import { scaleForGaps } from "./frame";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
} from "../services/body-shapes";

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

/**
 * Does a Partner Trade fit the **bodies** dancing it?
 *
 * The engine asserts collision-freedom as "no shared coordinate", because a dancer there
 * is a point. That is the strongest claim it can make and it is not the one that matters:
 * two points a tenth of a unit apart are two torsos overlapping. **This is the check only
 * the consumer can run**, because only this side knows how wide anybody is — and it is the
 * check that was missing while the Trade was, in Ryan's words, still a collision.
 */
describe("the Partner Trade clears the bodies dancing it", () => {
  /** The couple's own width, in engine units, exactly as `DanceFloor` derives it. */
  function coupleWidthEngine(shapes: readonly CharacterBodyShape[]): {
    width: number;
    scale: number;
  } {
    const parts = shapes.map((s) => rigidParts(s));
    const gaps: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i];
        const b = parts[j];
        if (a && b) gaps.push(lateralClearance(a, b));
      }
    }
    const scale = scaleForGaps(gaps);
    const hold = touchHold(armMetrics(shapes[0]!), armMetrics(shapes[1]!));
    return { width: hold.width / scale, scale };
  }

  /** The closest the two dancers get, in **world** units, over a whole sequence. */
  function closestApproach(
    shapes: readonly CharacterBodyShape[],
    sequence: readonly CallName[],
  ): number {
    const { width, scale } = coupleWidthEngine(shapes);
    const { result } = renderHook(() =>
      useDancePerformance({ call: "partner-trade", sequence, coupleWidth: width, bpm: 60 }),
    );
    let closest = Infinity;
    // 60 bpm, so one second is one beat; a fortieth of a beat is finer than any
    // waypoint spacing the engine emits.
    for (let step = 0; step < 40 * result.current.beats; step++) {
      const states = result.current.advance(1 / 40);
      const [a, b] = states;
      if (a === undefined || b === undefined) continue;
      const engine = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
      closest = Math.min(closest, engine * scale);
    }
    return closest;
  }

  it("🔴 no longer passes the two torsos through each other", () => {
    // The defect Ryan saw. Under the symmetric reading both dancers walked the same circle
    // in opposite senses and a bow was all that separated them — 0.3 of the couple's width.
    // Two things were wrong and they compounded: the shape (square-one's ADR-0014) and the
    // couple's width being ignored entirely (its ADR-0015). Measured here, on the shipped
    // cast, the closest approach over two Trades went **0.34 → 0.55** world units against
    // two torsos that need 0.52.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const torsos = shapes[0]!.body.radius + shapes[1]!.body.radius;
    const closest = closestApproach(shapes, ["partner-trade", "partner-trade"]);
    expect(closest).toBeGreaterThan(torsos);
  });

  it("🔴 and on wide bodies it still does not, which is structural", () => {
    // The finding, pinned rather than hidden. **A Trade's pass separation is half the
    // couple's width, and the couple's width is set by the handhold** — two joined arms.
    // So the wider the bodies get, the worse the pass is *relative* to them: `mixed` stands
    // 1.070 apart and passes at 0.535 against torsos wanting 0.700.
    //
    // No amount of work on this side fixes that. Either the beau's arc leaves the circle the
    // couple stands on, or a Trade is a figure that wide bodies cannot dance at handholding
    // distance. That is a decision about the figure and it is Ryan's.
    const cast = (radius: [number, number]): CharacterBodyShape[] => [
      { ...MYCO_DEFAULTS, body: { ...MYCO_DEFAULTS.body, radius: radius[0] } },
      { ...EMBER_DEFAULTS, body: { ...EMBER_DEFAULTS.body, radius: radius[1] } },
    ];
    for (const shapes of [cast([0.6, 0.1]), cast([0.6, 0.6])]) {
      const torsos = shapes[0]!.body.radius + shapes[1]!.body.radius;
      expect(closestApproach(shapes, ["partner-trade"])).toBeLessThan(torsos);
    }
  });

  it("passes at half the couple's own width, which is where all of that comes from", () => {
    // The one number the two tests above are both about, asserted directly so the reason is
    // in the suite and not only in their comments.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const { width, scale } = coupleWidthEngine(shapes);
    expect(closestApproach(shapes, ["partner-trade"])).toBeCloseTo((width / 2) * scale, 1);
  });

  it("🔴 still does NOT clear the heads at the pass — the gap that is left", () => {
    // Written as an assertion on the **size of the shortfall** rather than left out, because
    // a gap nobody measures is a gap that gets forgotten. `lateralClearance` is ADR-0012's
    // height-aware clearance over the rigid parts, which counts heads — and Myco's head is
    // 0.49 where his torso is 0.30. It wants **0.71** and the pass gives 0.55.
    //
    // Why it cannot be fixed on this side: the couple's width is set by the *handhold*, and
    // at the pass the two dancers are half of it apart. Clearing two heads that want 0.71
    // means the beau's arc going wider than the circle the couple stands on — which is
    // exactly the "even farther out" Ryan was pushing back on when he asked for the belle's
    // step. It is a decision about the figure, not a number to tune here.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const needed = lateralClearance(rigidParts(shapes[0]!), rigidParts(shapes[1]!));
    const closest = closestApproach(shapes, ["partner-trade"]);
    expect(closest).toBeLessThan(needed);
    // Pinned so the shortfall cannot quietly grow, and so this test fails loudly the day
    // somebody fixes it properly.
    expect(needed - closest).toBeGreaterThan(0.1);
    expect(needed - closest).toBeLessThan(0.2);
  });

  it("🔴 keeps the belle off the front, which is what buys the clearance", () => {
    // Ryan, 2026-08-18: *"the belle should not move forward hardly at all in this, since
    // that makes the beau have to move even farther out to get around."* Asserted here as
    // well as in square-one because it is the property the clearance above depends on: if
    // she drifts forward again, the beau's arc has to grow and this suite is where that
    // shows up as a collision rather than as a widened square.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const { width } = coupleWidthEngine(shapes);
    const { result } = renderHook(() =>
      useDancePerformance({
        call: "partner-trade",
        sequence: ["partner-trade"],
        coupleWidth: width,
        bpm: 60,
      }),
    );
    const start = result.current.home();
    const belle = start[1]?.key;
    expect(belle).toBeDefined();
    const forwardOf = (states: readonly DancerState[]) =>
      states.find((s) => s.key === belle)?.position.y ?? NaN;
    const home = forwardOf(start);
    for (let step = 0; step < 40 * result.current.beats; step++) {
      expect(Math.abs(forwardOf(result.current.advance(1 / 40)) - home)).toBeLessThan(1e-6);
    }
  });
});
