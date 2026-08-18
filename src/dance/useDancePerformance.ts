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
  danceCoupleSequence,
  flattenSequence,
  partnerUp,
  type CallName,
  type DancerState,
  type Motion,
  type Performance,
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
  const { call, sequence, coupleWidth, bpm = DEFAULT_BPM, loop = true, externallyDriven } = options;

  const motions = useMemo<Record<string, Motion>>(() => {
    if (sequence !== undefined && sequence.length > 0) {
      // `a` is the beau and `b` the belle, so the keys match the pair case and
      // everything downstream — shapes, rigs, the arm report — is indifferent to which
      // formation is being danced.
      return flattenSequence(
        danceCoupleSequence(
          sequence,
          partnerUp("a", "b", undefined, undefined, coupleWidth),
        ),
      );
    }
    const { a, b } = applyCallToPair(call);
    return { a, b };
  }, [call, sequence, coupleWidth]);

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
