import { describe, expect, it } from "vitest";
import { archLateral, crownOf, planArch, reachCeiling } from "./arch";
import { BREAK, OVERSHOOT, RESHAPE, drawAccommodation, growBody } from "./accommodation";
import { armMetrics, armPose, localHeight, touchHold, touchPose } from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  SHAPE_BOUNDS,
  SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";

const myco = armMetrics(MYCO_DEFAULTS);
const ember = armMetrics(EMBER_DEFAULTS);
/** The couple's own standing width — the separation an arch is first asked for at. */
const width = touchHold(myco, ember).width;

function plan(
  beau: CharacterBodyShape,
  belle: CharacterBodyShape,
  accommodation: typeof RESHAPE | typeof BREAK,
  separation = width,
) {
  return planArch(
    armMetrics(beau),
    armMetrics(belle),
    beau,
    belle,
    separation,
    accommodation,
  );
}

describe("crownOf — the top of a dancer, not the middle of their head", () => {
  it("🔴 counts a head sphere's own radius", () => {
    // `rigidParts` writes a head as a zero-length segment at its centre carrying a radius,
    // which is what `sideExtentAt` needs to narrow a sphere toward its poles. The naive
    // `max(y1)` is therefore the *middle* of somebody's head — 0.44 low on Ember, which is
    // enough to walk a crown straight through an arch while every number says it clears.
    const centres = Math.max(...ember.parts.map((p) => p.y1));
    expect(crownOf(ember)).toBeCloseTo(centres + 0.44, 6);
    expect(crownOf(ember)).toBeGreaterThan(centres);
  });

  it("puts both of the default cast where a tape measure would", () => {
    expect(crownOf(ember)).toBeCloseTo(2.155, 3);
    expect(crownOf(myco)).toBeCloseTo(1.53, 2);
  });
});

describe("reachCeiling — a reach is a sphere, so going across costs going up", () => {
  it("falls as the pair stand further apart", () => {
    const close = reachCeiling(myco, 2 * myco.restX);
    const apart = reachCeiling(myco, 2 * myco.restX + 0.4);
    expect(close).toBeGreaterThan(apart);
  });

  it("is the whole arm, straight up, when nothing is spent going across", () => {
    // Separation `2 × restX` puts the hand directly under its own shoulder.
    expect(reachCeiling(myco, 2 * myco.restX)).toBeCloseTo(
      myco.rigOriginY + myco.restY + myco.handReach,
      9,
    );
  });
});

describe("archLateral", () => {
  it("is halfway between the two inside shoulders, and zero for a matched pair", () => {
    expect(archLateral(myco, ember)).toBeCloseTo((myco.restX - ember.restX) / 2, 9);
    expect(archLateral(ember, ember)).toBeCloseTo(0, 9);
  });
});

describe("🔴 the default cast cannot make an arch at all, and that is the premise", () => {
  it("leaves the beau half a unit short of the belle's crown", () => {
    // Myco's shoulder is at 0.950 with a 0.690 arm: 1.640 with the arm dead vertical,
    // against Ember's crown at 2.155. He is short before anyone has tried to *hold hands*
    // while doing it. Everything in this module exists because of this number.
    const straightUp = myco.rigOriginY + myco.restY + myco.handReach;
    expect(straightUp).toBeLessThan(crownOf(ember));
    expect(crownOf(ember) - straightUp).toBeGreaterThan(0.5);
  });
});

describe("the reshape", () => {
  it("🔴 makes the arch, and both dancers keep hold", () => {
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    expect(p.gap).toBeCloseTo(0, 6);
    expect(p.hands.beau).toBeCloseTo(p.hands.belle, 6);
    // ...and the join really is above the head that has to pass under it.
    const belle = armMetrics(growBody(EMBER_DEFAULTS, p.bodyDeltas.belle));
    expect(p.height).toBeGreaterThan(crownOf(belle));
  });

  it("grows the beau and shrinks the belle, by the same amount each", () => {
    // Ryan: *"the torsos grow/shrink **each** a little more than necessary."* Equal and
    // opposite is also the split that buys the most per unit of visible deformation: the
    // beau's shoulder rising and the belle's crown dropping both count toward the same gap.
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    expect(p.bodyDeltas.beau).toBeGreaterThan(0);
    expect(p.bodyDeltas.belle).toBeCloseTo(-p.bodyDeltas.beau, 9);
  });

  it("🔴 overshoots, and the overshoot is what keeps the arms anatomical", () => {
    // Reshaping by *exactly* the deficit lands both dancers at full stretch, and a straight
    // arm is the degenerate case of `touchPose`'s elbow solve — the circle of legal elbows
    // shrinks to a point and the pose falls through to `reachPose`'s preference constants.
    // Asserted as the thing that matters: the beau's elbow stays in his shoulder's plane.
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    const beau = armMetrics(growBody(MYCO_DEFAULTS, p.bodyDeltas.beau));
    const out = armPose();
    touchPose(out, beau, -1, -(width / 2), localHeight(beau, p.hands.beau), 0);
    expect(out.x).toBeCloseTo(-beau.restX, 9);

    // And the same solve at **zero** overshoot does not — which is why the constant is not
    // zero. Built here rather than taken from a plan, because there is no way to ask for a
    // reshape that does not overshoot, and there should not be.
    const exactDelta = p.bodyDeltas.beau / (1 + OVERSHOOT);
    const tight = armMetrics(growBody(MYCO_DEFAULTS, exactDelta));
    const tightBelle = armMetrics(growBody(EMBER_DEFAULTS, -exactDelta));
    const tightHeight = crownOf(tightBelle) + Math.max(myco.handRadius, ember.handRadius);
    // Exactly at the limit: the arm is straight, and the elbow circle is a point.
    expect(reachCeiling(tight, width) - tightHeight).toBeCloseTo(0, 9);
    touchPose(out, tight, -1, -(width / 2), localHeight(tight, tightHeight), 0);
    expect(Math.abs(out.x + tight.restX)).toBeGreaterThan(1e-6);
  });

  it("changes nothing when the pair can already make the arch", () => {
    // Two Embers: tall, long-armed, and well clear of their own crowns. Nobody deforms.
    const p = plan(EMBER_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    expect(p.bodyDeltas.beau).toBeCloseTo(0, 9);
    expect(p.bodyDeltas.belle).toBeCloseTo(0, 9);
    expect(p.gap).toBeCloseTo(0, 9);
  });

  it("🔴 cannot fix a dancer who cannot reach over their own head", () => {
    // The algebra's second constraint, and the reason this is a plan rather than a solve:
    // shrinking the belle lowers her crown *and* her shoulder by the same amount, so `d`
    // cancels out of her own constraint entirely. Myco's head is huge and his arms are
    // short; two Mycos reshape and still break, by a little.
    const p = plan(MYCO_DEFAULTS, MYCO_DEFAULTS, RESHAPE);
    expect(p.gap).toBeGreaterThan(0);
    // Small — he misses it by about a centimetre of world — but not nothing, and not hidden.
    expect(p.gap).toBeLessThan(0.05);
  });

  it("🔴 stays inside the shape editor's own bounds, and stops being symmetric when it does", () => {
    // A dance may not put a dancer anywhere the character sheet could not, or the reshape
    // becomes a second, invisible definition of what a body may be. Sprout has the shortest
    // arms in the repo and Ember the highest crown, so this pair asks for the biggest
    // accommodation there is: he grows to 1.996 against a ceiling of 2.00, and she is
    // clipped at the 0.10 floor — which is why the two deltas here are *not* equal and
    // opposite, unlike every pair that is not up against a slider.
    const p = plan(SPROUT_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    const beauHeight = SPROUT_DEFAULTS.body.height + p.bodyDeltas.beau;
    const belleHeight = EMBER_DEFAULTS.body.height + p.bodyDeltas.belle;
    expect(beauHeight).toBeLessThanOrEqual(SHAPE_BOUNDS.body.height.max);
    expect(belleHeight).toBeCloseTo(SHAPE_BOUNDS.body.height.min, 9);
    expect(p.bodyDeltas.belle).not.toBeCloseTo(-p.bodyDeltas.beau, 3);
  });
});

describe("the break", () => {
  it("🔴 deforms nobody and lets the hands come apart", () => {
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, BREAK);
    expect(p.bodyDeltas.beau).toBe(0);
    expect(p.bodyDeltas.belle).toBe(0);
    expect(p.gap).toBeGreaterThan(0.5);
  });

  it("🔴 leaves the belle's own arm making the arch alone", () => {
    // The picture this produces, stated so it can be recognised on screen: the tall dancer
    // holds her hand up over her own head, the short one cannot follow, and she turns under
    // her own hand. That is a real thing mismatched dancers do, which is why it is one of
    // the two options rather than the error case.
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, BREAK);
    expect(p.hands.belle).toBeCloseTo(p.height, 6);
    expect(p.hands.beau).toBeLessThan(p.height);
    expect(p.hands.beau).toBeCloseTo(reachCeiling(myco, width), 6);
  });

  it("does not break a hold the pair could have made anyway", () => {
    const p = plan(EMBER_DEFAULTS, EMBER_DEFAULTS, BREAK);
    expect(p.gap).toBeCloseTo(0, 9);
  });
});

describe("the reshape and the break are different pictures of the same figure", () => {
  it("agree on where the arch wants to be before anybody accommodates", () => {
    // Both reach for the same target; they differ in what they are willing to do about not
    // getting there. The lateral is the same in both, because it is a fact about shoulders.
    const a = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE);
    const b = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, BREAK);
    expect(a.lateral).toBeCloseTo(b.lateral, 9);
    // The reshape's target is *lower*, because the belle's crown came down to meet it.
    expect(a.height).toBeLessThan(b.height);
  });
});

describe("drawAccommodation", () => {
  it("is a coin flip, and neither side is the fallback", () => {
    expect(drawAccommodation(() => 0)).toBe(RESHAPE);
    expect(drawAccommodation(() => 0.49)).toBe(RESHAPE);
    expect(drawAccommodation(() => 0.5)).toBe(BREAK);
    expect(drawAccommodation(() => 0.99)).toBe(BREAK);
  });

  it("takes its randomness as an argument, so a test can be sure and a scene cannot", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(drawAccommodation());
    expect(seen).toEqual(new Set([RESHAPE, BREAK]));
  });
});
