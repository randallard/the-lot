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
  armTurnGrip,
  ARM_TURN_RAISE,
} from "./forearm-hold";
import { bodyOf } from "./whole-move";
import { ACCOMMODATIONS, BREAK, RESHAPE } from "./accommodation";
import { DEFAULT_SCALE } from "./frame";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  SPROUT_DEFAULTS,
  getBodyShape,
  type CharacterBodyShape,
} from "../services/body-shapes";

const PAIRS: readonly (readonly [string, CharacterBodyShape, CharacterBodyShape])[] = [
  ["myco/ember", MYCO_DEFAULTS, EMBER_DEFAULTS],
  ["myco/sprout", MYCO_DEFAULTS, SPROUT_DEFAULTS],
  ["ember/sprout", EMBER_DEFAULTS, SPROUT_DEFAULTS],
];

describe("the mean elbow is not always reachable", () => {
  // ⏳ Known finding, kept as `it.fails` (2026-10-31): vitest reports it red the day it passes, which is when to re-pin it.
  // Myco's 2026-09-20 arm no longer reaches the mean elbow either (shortfall 0.079), so the accommodation fires for both dancers (journal 2026-09-20-2, kind C). Waits on choosing her accommodation.
  it.fails("🔴 is out of reach for the shipped default pair, which is why this exists", () => {
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
  it("🔴 is a placement — it is whatever the arms say, above or below the default", () => {
    // square-one's ADR-0021 makes `gripRadius` the one measurement it does **not** floor: a
    // clearance is room a figure must find, a grip is where two people's arms actually put them.
    //
    // 🔴 **This test used to assert it came out *smaller* than `ORBIT_RADIUS`, and now it comes
    // out larger.** Nothing about the arms changed — the frame did. While the square grew itself
    // to its widest pair it stood 2.603 world units across and the same arms divided to 0.274
    // engine; at the single scale of ADR-0035 they divide to 0.324. The number was never a fact
    // about the cast on its own, which is exactly why it must not be clamped in *either*
    // direction: a floor would have hidden the first case and a ceiling would hide this one.
    for (const [name, A, B] of PAIRS) {
      const world = pairGripRadius(armMetrics(A), armMetrics(B));
      const engine = world / DEFAULT_SCALE;
      expect(engine, name).toBeCloseTo(world / DEFAULT_SCALE, 12);
      expect(engine, name).toBeGreaterThan(0);
    }
    // On the shipped default pair it is now above the body-agnostic figure, and it is delivered
    // rather than clamped to it.
    const myco = pairGripRadius(armMetrics(MYCO_DEFAULTS), armMetrics(EMBER_DEFAULTS));
    expect(myco / DEFAULT_SCALE).toBeGreaterThan(ORBIT_RADIUS);
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

describe("🧪 an arm turn's grip from the skeletons (armTurnGrip, 2026-10-28)", () => {
  const body = (id: string) => bodyOf(getBodyShape(id));

  it("puts the elbows where the upper arms reach, raised and not stretched", () => {
    // Equal bodies: no trade, and each elbow at the grip height is within its own upper arm.
    for (const id of ["player", "myco", "ember", "ryan", "sprout"]) {
      const b = body(id);
      const g = armTurnGrip(b, b);
      expect(g.grow[0]).toBeCloseTo(0, 9);
      expect(g.grow[1]).toBeCloseTo(0, 9);
      expect(b.shoulder[0][1] - g.height).toBeCloseTo(b.upper0 * Math.cos(ARM_TURN_RAISE), 9);
      // The bodies stand at least their shoulders apart, and further than the floor's pose asked
      // of nobody: the radius is positive and finite.
      expect(g.radius).toBeGreaterThan(b.shoulder[0][0]);
    }
  });

  it("trades height between a tall and a short dancer, the shorter growing", () => {
    const [player, myco] = [body("player"), body("myco")];
    const g = armTurnGrip(player, myco);
    expect(g.grow[0]).toBeLessThan(0);
    expect(g.grow[1]).toBeGreaterThan(0);
    // `meet`'s tie: the same share of each one's height.
    expect(g.grow[0] / player.rise.height).toBeCloseTo(-g.grow[1] / myco.rise.height, 9);
    // After it, both elbows sit on the grip height with the arm raised the same.
    const elbow = (b: typeof player, d: number) => b.shoulder[0][1] + b.rise.shoulder[0][1] * d - b.upper0 * Math.cos(ARM_TURN_RAISE);
    expect(elbow(player, g.grow[0])).toBeCloseTo(g.height, 9);
    expect(elbow(myco, g.grow[1])).toBeCloseTo(g.height, 9);
  });

  it("counts a shoulder carried forward of the body (ember's, 22 cm)", () => {
    const ember = body("ember");
    const flat = { ...ember, shoulder: [[ember.shoulder[0][0], ember.shoulder[0][1], 0], ember.shoulder[1]] satisfies typeof ember.shoulder };
    expect(armTurnGrip(ember, ember).radius).toBeLessThan(armTurnGrip(flat, flat).radius);
  });
});
