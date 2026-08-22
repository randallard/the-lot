/**
 * Drives a square from square-one's performance stepper.
 *
 * Per square-one's ADR-0007 the stepper is the primary interface: the engine is not
 * asked for a finished animation, it is advanced a beat at a time and asked where
 * everyone is. Ideal path data is the same stepper with every coefficient off,
 * which is all v1 uses.
 *
 * The consumer owns the clock (the engine reads no timer), so `tick` is fed from
 * `useFrame` in beats derived from a tempo.
 */

import { useCallback, useMemo, useRef } from "react";
import {
  applyCallToPair,
  createPerformance,
  DEFAULT_PAIR_SHAPE,
  danceCoupleSequence,
  flattenSequence,
  partnerUp,
  shapeOf,
  type CallName,
  type DancerState,
  type Motion,
  type Performance,
  type ShapeAt,
} from "square-one";

/** 120 bpm — the middle of normal patter tempo, and a round 2 beats/second. */
export const DEFAULT_BPM = 120;

export interface DancePerformanceOptions {
  readonly call: CallName;
  /**
   * Dance a **couple** through a sequence of calls instead of a facing pair through
   * one (planning ADR-0011's S1).
   *
   * When present, `call` is ignored. The two are different formations, not different
   * sizes: a facing pair points opposite ways and a couple points the same way, and
   * square-one's `applyCallToCouple` composes each side from its own chain rather than
   * deriving one from the other — which is the only thing that works for a
   * position-dependent call like Partner Trade, where the two dancers genuinely walk
   * different figures.
   */
  readonly sequence?: readonly CallName[];
  /**
   * How wide the couple stands, in engine units. Omitted falls back to square-one's
   * `COUPLE_WIDTH`.
   *
   * The engine's own constant documents itself as the **body-agnostic default** and
   * says a consumer with real bodies should compute this and pass it — the exact seam
   * ADR-0004 cut. `DanceFloor` has bodies and computes it from the two dancers'
   * shoulders, so this is where that answer arrives.
   */
  readonly coupleWidth?: number;
  /**
   * How far apart the couple must be to pass each other **under a raised arch**, in engine
   * units. Omitted leaves the engine's body-agnostic default, which is the arc's own radius.
   *
   * The second half of the same seam `coupleWidth` is. With hands free the two dancers have to
   * clear each other; with hands joined and raised there is a **joined hand in the gap as
   * well**, at head height, and the room that needs is a measurement only this side can take.
   * `DanceFloor` takes it and the beau's arc bows out to meet it (square-one ADR-0018).
   *
   * 🔴 The hands-free clearance used to be withheld here. It is {@link clearance} now, and the
   * note explaining why sits on that field.
   */
  readonly archClearance?: number;
  /**
   * How far apart the couple must be to pass each other **hands free**, in engine units —
   * bodies and heads, `lateralClearance` over the two rigid silhouettes (ADR-0012). Omitted
   * leaves the engine's body-agnostic default, which is the exchange arc's own radius.
   *
   * 🔴 **Withheld on purpose from 2026-08-19 to 2026-08-21, and no longer.** The mechanism to
   * bow a hands-free Trade arrived with the arch's, and switching it on would change a figure
   * Ryan had already watched and accepted — so it was owed as *a look, not a number*. He took
   * the look: *"I looked at `#dance=two-trades` and it's still too tight — if we're
   * generalizing correctly it should be like `#dance=two-twirls`."* See ADR-0031.
   *
   * The Trade and the Twirl are the **same paths** (square-one ADR-0017) and differ only in
   * what is in the gap: two bodies, or two bodies with a joined hand up between their heads.
   * Passing only the arch clearance meant only the Twirl bowed — the generalisation was half
   * wired, and the two-trades scene is what that looks like.
   */
  readonly clearance?: number;
  /**
   * How far from a joined forearm the pair's bodies stand, in engine units — the **arm**
   * measurement, and the only one across this seam that is not a clearance (square-one
   * ADR-0020, ADR-0033 here).
   *
   * Reaches a **facing pair** as well as a couple, because the call that reads it — Allemande
   * Left — is danced by one. That is why `applyCallToPair` is now given a shape.
   */
  readonly gripRadius?: number;
  /**
   * A per-call shape override for a couple sequence — square-one's `ShapeAt` (its ADR-0025),
   * forwarded straight through.
   *
   * This is how an accommodation drawn **per execution** reaches the figure for *that* execution.
   * See `DanceFloor`, which draws them; the two must agree or the beau bows for a break the pair
   * did not draw (ADR-0037).
   */
  readonly shapeAt?: ShapeAt;
  readonly bpm?: number;
  /** Restart from beat 0 when the call ends. The debug scene loops; the arc won't. */
  readonly loop?: boolean;
  /** Keys the consumer supplies poses for instead of the engine — the player. */
  readonly externallyDriven?: readonly string[];
}

export interface DanceRuntime {
  /** Advance by `dtSeconds` and return every dancer's state. */
  readonly advance: (dtSeconds: number) => readonly DancerState[];
  /** The motions the square is performing, keyed the same way the states are. */
  readonly motions: Readonly<Record<string, Motion>>;
  readonly beats: number;
  /**
   * Current position on the beat axis — 0 until the first advance, and resets
   * to 0 when a looping performance restarts. A getter, not a snapshot: read it
   * from the frame loop.
   */
  readonly beat: () => number;
  /**
   * Stand the square at beat 0 of whatever it is dancing, and return that state.
   *
   * A fresh performance and a `sample`, not a `tick(-beat)`: the stepper is stateful
   * and only moves forward, so the same seeded restart the loop uses is the honest
   * rewind. No time passes — the caller gets beat 0 to pose against and the clock
   * stays where it is put.
   */
  readonly home: () => readonly DancerState[];
}

/**
 * A two-dancer square performing one call.
 *
 * Two, not eight, on purpose: the call model is two-couple-safe and the arc reaches
 * a pair long before it reaches a full square. `applyCallToPair` gives dancer B as
 * A's 180° rotation, which is the pair symmetry the specs guarantee.
 */
export function useDancePerformance(options: DancePerformanceOptions): DanceRuntime {
  const {
    call,
    sequence,
    coupleWidth,
    archClearance,
    clearance,
    gripRadius,
    shapeAt,
    bpm = DEFAULT_BPM,
    loop = true,
    externallyDriven,
  } = options;

  const motions = useMemo<Record<string, Motion>>(() => {
    if (sequence !== undefined && sequence.length > 0) {
      // `a` is the beau and `b` the belle, so the keys match the pair case and
      // everything downstream — shapes, rigs, the arm report — is indifferent to which
      // formation is being danced.
      return flattenSequence(
        danceCoupleSequence(
          sequence,
          // Positional, not the shape object square-one also accepts: the object form landed
          // with ADR-0020 and this package's dependency still names a tag without it.
          partnerUp(
            "a",
            "b",
            undefined,
            undefined,
            coupleWidth,
            clearance,
            archClearance,
            gripRadius,
          ),
          shapeAt,
        ),
      );
    }
    // 🔴 The facing-pair path takes a shape too, as of square-one v0.3.0. Allemande Left is
    // the call that reads `gripRadius` and a facing pair is who dances it, so passing bodies
    // only down the couple path would have left the one call the measurement exists for
    // still gripping at the body-agnostic radius.
    const { a, b } = applyCallToPair(
      call,
      // 🔴 **The clearance belongs here too, and leaving it out was a real gap.** A Dosado and
      // a Pass Thru are danced by a *facing pair*, so the couple path never reaches them — and
      // square-one's ADR-0023 makes both the lane they pass in **and how far they walk past
      // each other** come from this number. Passing only `gripRadius` sized the one call that
      // reads it and left the other two at the body-agnostic figure.
      shapeOf(
        {
          ...(clearance === undefined ? {} : { clearance }),
          ...(gripRadius === undefined ? {} : { gripRadius }),
        },
        DEFAULT_PAIR_SHAPE,
      ),
    );
    return { a, b };
  }, [call, sequence, coupleWidth, clearance, archClearance, gripRadius, shapeAt]);

  const beats = useMemo(
    () => Math.max(...Object.values(motions).map((m) => m.beats)),
    [motions],
  );

  const perfRef = useRef<Performance | null>(null);
  const makePerformance = useCallback(
    () =>
      createPerformance({
        motions,
        ...(externallyDriven === undefined ? {} : { externallyDriven }),
      }),
    [motions, externallyDriven],
  );

  const advance = useCallback(
    (dtSeconds: number): readonly DancerState[] => {
      if (perfRef.current === null) perfRef.current = makePerformance();
      const perf = perfRef.current;

      const dBeats = dtSeconds * (bpm / 60);
      const states = perf.tick(dBeats);

      if (loop && perf.done) {
        // A fresh performance rather than a rewind: the stepper is stateful and a
        // seeded restart is the honest way to loop it once coefficients are on.
        perfRef.current = makePerformance();
      }
      return states;
    },
    [bpm, loop, makePerformance],
  );

  const beat = useCallback(() => perfRef.current?.beat ?? 0, []);

  const home = useCallback((): readonly DancerState[] => {
    const perf = makePerformance();
    perfRef.current = perf;
    return perf.sample();
  }, [makePerformance]);

  return { advance, motions, beats, beat, home };
}
