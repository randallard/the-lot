/**
 * The forearm hold, and the reach a pair can fail to make (ADR-0033).
 *
 * `gripHeight` has averaged two resting elbows since the fist bump, carrying a note that past
 * a big enough height difference the taller dancer has to do nearly all the accommodating.
 * Nothing acted on it. This is the suite for the thing that finally does.
 */

import { describe, expect, it } from "vitest";
import { ORBIT_RADIUS } from "square-one";
import { armMetrics, gripHeight } from "./arm-pose";
import {
  bodyGripRadius,
  elbowShortfall,
  nearestElbowHeight,
  pairGripRadius,
  planForearm,
} from "./forearm-hold";
import { ACCOMMODATIONS, BREAK, RESHAPE } from "./accommodation";
import { scaleForGaps } from "./frame";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  SPROUT_DEFAULTS,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
} from "../services/body-shapes";

const PAIRS: readonly (readonly [string, CharacterBodyShape, CharacterBodyShape])[] = [
  ["myco/ember", MYCO_DEFAULTS, EMBER_DEFAULTS],
  ["myco/sprout", MYCO_DEFAULTS, SPROUT_DEFAULTS],
  ["ember/sprout", EMBER_DEFAULTS, SPROUT_DEFAULTS],
];

describe("the mean elbow is not always reachable", () => {
  it("🔴 is out of reach for the shipped default pair, which is why this exists", () => {
    // The finding. A joined forearm lies horizontal at one shared height, so each dancer's
    // elbow has to be *at* that height — and the elbow hangs off the shoulder on an upper arm
    // of fixed length. Ember's elbow rests at 1.095 and the mean is 0.857; she cannot drop it
    // that far. `gripPose` posed her there anyway, every time, with nothing asking.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const h = gripHeight(a, b);
    expect(elbowShortfall(a, h)).toBe(0);
    expect(elbowShortfall(b, h)).toBeGreaterThan(0.2);
  });

  it("clamps to the nearest height a dancer can actually put an elbow", () => {
    const b = armMetrics(EMBER_DEFAULTS);
    const h = gripHeight(armMetrics(MYCO_DEFAULTS), b);
    const near = nearestElbowHeight(b, h);
    expect(near).toBeGreaterThan(h);
    expect(elbowShortfall(b, near)).toBeCloseTo(0, 9);
  });
});

describe("the two accommodations, applied to a forearm hold", () => {
  it("🔴 never finishes a reshape further apart than a break — the inversion guard", () => {
    // 🔴 **This test exists because the first version of `planForearm` failed it.** The
    // reshape was signed by whose *shortfall* was larger rather than by whose *elbow was
    // lower*, which grew the taller dancer and drove her elbow further from the line it had to
    // meet: on myco/ember it finished **0.511** apart where a break finished 0.238. An
    // accommodation that accommodates nothing looks exactly like one that works, until it is
    // measured against the alternative it is supposed to beat.
    for (const [name, A, B] of PAIRS) {
      const a = armMetrics(A);
      const b = armMetrics(B);
      const reshape = planForearm(a, b, A, B, RESHAPE);
      const broke = planForearm(a, b, A, B, BREAK);
      expect(reshape.gap, name).toBeLessThanOrEqual(broke.gap + 1e-9);
    }
  });

  it("🔴 leaves the shared height exactly where it was", () => {
    // The property that makes the torso the right lever here rather than merely an available
    // one: growing the lower dancer by `d` and shrinking the higher by `d` moves their elbows
    // `±d/2`, so each closes on the mean and **the mean does not move**. The hold is made
    // reachable without being relocated.
    for (const [name, A, B] of PAIRS) {
      const a = armMetrics(A);
      const b = armMetrics(B);
      const want = gripHeight(a, b);
      for (const mode of ACCOMMODATIONS) {
        expect(planForearm(a, b, A, B, mode).height, `${name} ${mode}`).toBeCloseTo(want, 9);
      }
    }
  });

  it("🔴 grows the dancer whose elbow is lower, whichever side they stand on", () => {
    // Myco's elbow is below Ember's, so Myco grows — as the beau in one ordering and as the
    // belle in the other. The lever is about bodies, not about position (square-one ADR-0012).
    const asBeau = planForearm(
      armMetrics(MYCO_DEFAULTS), armMetrics(EMBER_DEFAULTS),
      MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE,
    );
    const asBelle = planForearm(
      armMetrics(EMBER_DEFAULTS), armMetrics(MYCO_DEFAULTS),
      EMBER_DEFAULTS, MYCO_DEFAULTS, RESHAPE,
    );
    expect(asBeau.bodyDeltas.beau).toBeGreaterThan(0); // Myco, growing
    expect(asBelle.bodyDeltas.belle).toBeGreaterThan(0); // Myco again, other side
    expect(asBeau.bodyDeltas.beau).toBeCloseTo(asBelle.bodyDeltas.belle, 9);
  });

  it("🔴 breaks by putting the two forearms on different planes", () => {
    // "The hold breaks" as a number rather than a special case, exactly as the arch does it
    // with `TouchHold`'s two heights. Nobody changes shape; each goes as close as their own
    // upper arm allows; two forearms not on the same plane are hands that have come apart.
    const p = planForearm(
      armMetrics(MYCO_DEFAULTS), armMetrics(EMBER_DEFAULTS),
      MYCO_DEFAULTS, EMBER_DEFAULTS, BREAK,
    );
    expect(p.bodyDeltas).toEqual({ beau: 0, belle: 0 });
    expect(p.beauY).not.toBeCloseTo(p.belleY, 3);
    expect(p.joined).toBe(false);
    expect(p.gap).toBeGreaterThan(0.2);
  });

  it("🔴 does nothing at all to a pair who can already reach", () => {
    // A dancer paired with themselves: the mean of two equal elbows is that elbow, and nobody
    // has to move. Both draws agree, which is what "there was nothing to accommodate" means.
    const a = armMetrics(MYCO_DEFAULTS);
    for (const mode of ACCOMMODATIONS) {
      const p = planForearm(a, a, MYCO_DEFAULTS, MYCO_DEFAULTS, mode);
      expect(p.bodyDeltas).toEqual({ beau: 0, belle: 0 });
      expect(p.joined).toBe(true);
      expect(p.gap).toBe(0);
      expect(p.beauY).toBeCloseTo(p.belleY, 9);
    }
  });

  it("reports the accommodation it was given, even when nothing needed doing", () => {
    // A pair who did not need one still drew one. Reporting a third "none" state would make
    // the draw conditional on the bodies, and the draw is per execution (ADR-0028).
    const a = armMetrics(MYCO_DEFAULTS);
    expect(planForearm(a, a, MYCO_DEFAULTS, MYCO_DEFAULTS, BREAK).accommodation).toBe(BREAK);
    expect(planForearm(a, a, MYCO_DEFAULTS, MYCO_DEFAULTS, RESHAPE).accommodation).toBe(RESHAPE);
  });
});

describe("the grip radius square-one asks for", () => {
  it("🔴 is a placement, and is smaller than the engine's own default on this cast", () => {
    // square-one's ADR-0021 makes `gripRadius` the one measurement it does **not** floor: a
    // clearance is room a figure must find, a grip is where two people's arms actually put
    // them. This cast's arms ask for less than `ORBIT_RADIUS`, and the whole point is that
    // they get it — a floored version would draw an Allemande the pair cannot reach.
    for (const [name, A, B] of PAIRS) {
      const scale = scaleForGaps([lateralClearance(rigidParts(A), rigidParts(B))]);
      const engine = pairGripRadius(armMetrics(A), armMetrics(B)) / scale;
      expect(engine, name).toBeGreaterThan(0);
      expect(engine, name).toBeLessThan(ORBIT_RADIUS);
    }
  });

  it("🔴 is the mean of two dancers who genuinely stand at different distances", () => {
    // Two different arms put two bodies at two distances from the shared pivot; the engine's
    // figure has one radius, so it gets the average. The difference does not go missing —
    // `gripPose` places each arm from the pivot independently, so the hands stay joined
    // whichever circle the bodies walk.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    expect(bodyGripRadius(a, b)).not.toBeCloseTo(bodyGripRadius(b, a), 2);
    expect(pairGripRadius(a, b)).toBeCloseTo(
      (bodyGripRadius(a, b) + bodyGripRadius(b, a)) / 2,
      9,
    );
    expect(pairGripRadius(a, b)).toBe(pairGripRadius(b, a));
  });
});
