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
import { archClearance } from "./arch";
import { CLEARANCE_MARGIN, DEFAULT_SCALE } from "./frame";
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
    const scale = DEFAULT_SCALE;
    const hold = touchHold(armMetrics(shapes[0]!), armMetrics(shapes[1]!));
    return { width: hold.width / scale, scale };
  }

  /**
   * The closest the two dancers get, in **world** units, over a whole sequence — driven
   * exactly as `DanceFloor` drives it.
   *
   * 🔴 **Including the clearance, as of ADR-0031.** While this helper passed a width and
   * nothing else it measured a figure the scene had stopped dancing, which is the one way a
   * consumer-side collision check can be worse than none.
   */
  function closestApproach(
    shapes: readonly CharacterBodyShape[],
    sequence: readonly CallName[],
  ): number {
    const { width, scale } = coupleWidthEngine(shapes);
    const clearance =
      (CLEARANCE_MARGIN * lateralClearance(rigidParts(shapes[0]!), rigidParts(shapes[1]!))) / scale;
    // 🔴 The arch clearance too, and leaving it out is how the first draft of the
    // Trade-versus-Twirl check below compared a Twirl with a Trade's own number and got two
    // identical figures. A helper that drives the performance *almost* like the scene is a
    // helper that measures a figure nobody dances.
    const arch =
      (CLEARANCE_MARGIN *
        archClearance(
        armMetrics(shapes[0]!),
        armMetrics(shapes[1]!),
        shapes[0]!,
        shapes[1]!,
          touchHold(armMetrics(shapes[0]!), armMetrics(shapes[1]!)).width,
        )) /
      scale;
    const { result } = renderHook(() =>
      useDancePerformance({
        call: "partner-trade",
        sequence,
        coupleWidth: width,
        clearance,
        archClearance: arch,
        bpm: 60,
      }),
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
    // two torsos that need 0.52 — and **→ 0.71** once the clearance was passed (ADR-0031).
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const torsos = shapes[0]!.body.radius + shapes[1]!.body.radius;
    const closest = closestApproach(shapes, ["partner-trade", "partner-trade"]);
    expect(closest).toBeGreaterThan(torsos);
  });

  it("🔴 reaches wide bodies' clearance too, which used to be pinned as structural", () => {
    // 🔴 **This test used to assert the opposite, and the comment it carried was wrong about
    // where the fix lived.** It read: *"No amount of work on this side fixes that. Either the
    // beau's arc leaves the circle the couple stands on, or a Trade is a figure that wide
    // bodies cannot dance at handholding distance. That is a decision about the figure and it
    // is Ryan's."*
    //
    // The first branch is what happened. The arc leaves the circle — square-one's ADR-0016
    // built the bow, ADR-0031 here finally passes it the hands-free number — and the measured
    // reversal is large: `cast([0.6, 0.1])` went **0.535 → 0.891** against 0.894 wanted, and
    // `cast([0.6, 0.6])` went **0.819 → 1.197** against 1.200. Both were below their torsos
    // and are now above them.
    const cast = (radius: [number, number]): CharacterBodyShape[] => [
      { ...MYCO_DEFAULTS, body: { ...MYCO_DEFAULTS.body, radius: radius[0] } },
      { ...EMBER_DEFAULTS, body: { ...EMBER_DEFAULTS.body, radius: radius[1] } },
    ];
    for (const shapes of [cast([0.6, 0.1]), cast([0.6, 0.6])]) {
      const torsos = shapes[0]!.body.radius + shapes[1]!.body.radius;
      const needed = CLEARANCE_MARGIN * lateralClearance(rigidParts(shapes[0]!), rigidParts(shapes[1]!));
      const closest = closestApproach(shapes, ["partner-trade"]);
      // Within half a percent of the full height-aware clearance, from 32% and 47% short.
      //
      // 🔴 **"Within", not "above", and the distinction is honest rather than pedantic.** The
      // residual is the chord sag square-one's ADR-0022 bounded: the solver puts the *arc* on
      // the wanted number and the dancers walk a polyline a hair inside it. It scales with the
      // bowed radius, so the heaviest bows here are the worst cases — 0.32% on `cast([0.6,
      // 0.1])` and 0.27% on `cast([0.6, 0.6])`, which is 0.003 world units of torso overlap on
      // a pair standing 1.640 apart. A test that claimed strict clearance would be a test
      // tuned to a sampling constant.
      expect(closest).toBeGreaterThan(needed * 0.995);
      expect(closest).toBeGreaterThan(torsos * 0.995);
      // The reversal is what this test is really for: both of these were *below* their torsos.
      expect(closest / torsos).toBeGreaterThan(1.2 * (0.535 / 0.7));
    }
  });

  it("🔴 no longer passes at half the couple's width — the bow is what took it off that", () => {
    // The number the tests above used to be about. A Trade's pass separation *was* half the
    // couple's width and the couple's width is set by the handhold, so the wider the bodies
    // the worse the pass was relative to them. It is now the bodies' own clearance, and half
    // the width is what a pair get only when they ask for nothing.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const { width, scale } = coupleWidthEngine(shapes);
    // 🔴 **Against `needed × CLEARANCE_MARGIN` as of ADR-0035, not `needed`.** The margin used
    // to ride on the frame scale, so the delivered gap came out at the bare clearance and the
    // margin was invisible in every measurement here. It is on the clearance we pass now, which
    // means it shows up in the figure — the same daylight, attributed to the thing that wants it.
    const needed = CLEARANCE_MARGIN * lateralClearance(rigidParts(shapes[0]!), rigidParts(shapes[1]!));
    expect(closestApproach(shapes, ["partner-trade"])).toBeGreaterThan((width / 2) * scale);
    expect(closestApproach(shapes, ["partner-trade"])).toBeCloseTo(needed, 2);
  });

  it("🔴 clears the heads at the pass — the gap that used to be left", () => {
    // 🔴 **The tripwire fired.** This test asserted the shortfall — `needed - closest` between
    // 0.1 and 0.2 — and said of itself that it was written *"so this test fails loudly the day
    // somebody fixes it properly."* That day was 2026-08-21.
    //
    // `lateralClearance` is ADR-0012's height-aware clearance over the rigid parts, which
    // counts **heads** — and Myco's head is 0.49 where his torso is 0.30. It wants 0.710 and
    // the pass gave 0.554; it now gives **0.709**, which is the wanted number less the chord
    // sag square-one's ADR-0022 bounded at a fifth of a percent.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const needed = CLEARANCE_MARGIN * lateralClearance(rigidParts(shapes[0]!), rigidParts(shapes[1]!));
    const closest = closestApproach(shapes, ["partner-trade"]);
    // 🔴 **Half a percent, not a fifth of one, as of ADR-0035.** The residual is square-one's
    // chord sag (its ADR-0022) and that ADR says it scales with the **bowed radius** — so
    // tightening the floor, which made the clearance a larger fraction of the couple's width and
    // therefore the bow bigger, widened the sag from 0.20% to 0.28% exactly as documented. The
    // bound moves; the mechanism is the one already written down.
    expect(closest).toBeGreaterThan(needed * 0.995);
    expect(closest).toBeLessThan(needed * 1.002);
  });

  it("🔴 bows less than a California Twirl does, out of the same two bodies", () => {
    // The relationship Ryan's *"it should be like two-twirls"* is really about, and the one
    // number that says the generalisation is right rather than merely on. Same pair, same
    // paths (square-one ADR-0017) — what differs is what is in the gap. Hands free, two bodies
    // must clear each other; hands joined and raised there is a **hand up between their heads**
    // as well, so the Twirl asks for strictly more room and bows strictly further.
    //
    // A Trade that bowed *as far as* a Twirl would be the bug this looks like the fix for.
    const shapes = [MYCO_DEFAULTS, EMBER_DEFAULTS];
    const trade = closestApproach(shapes, ["partner-trade"]);
    const twirl = closestApproach(shapes, ["california-twirl"]);
    expect(twirl).toBeGreaterThan(trade);
    // Measured: 0.709 against 1.085 on the shipped cast.
    expect(twirl).toBeGreaterThan(trade * 1.4);
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
