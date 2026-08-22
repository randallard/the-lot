import { describe, expect, it } from "vitest";
import {
  archClearance,
  archFits,
  archLateral,
  armSweepClearance,
  crownOf,
  insideShoulderX,
  planArch,
  reachCeiling,
  reachToward,
  sizeArch,
} from "./arch";
import { CLEARANCE_MARGIN } from "./frame";
import {
  ACCOMMODATIONS,
  BREAK,
  OVERSHOOT,
  RESHAPE,
  drawAccommodation,
  growBody,
} from "./accommodation";
import { armMetrics, armPose, localHeight, touchHold, touchPose } from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  SHAPE_BOUNDS,
  SPROUT_DEFAULTS,
  lateralClearance,
  rigidParts,
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
    expect(p.hands.beau.height).toBeCloseTo(p.hands.belle.height, 6);
    expect(p.hands.beau.lateral).toBeCloseTo(p.hands.belle.lateral, 6);
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
    touchPose(out, beau, -1, -(width / 2), localHeight(beau, p.hands.beau.height), 0);
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
    expect(p.hands.belle.height).toBeCloseTo(p.height, 6);
    expect(p.hands.belle.lateral).toBeCloseTo(p.lateral, 6);
    expect(p.hands.beau.height).toBeLessThan(p.height);
  });

  it("🔴 stops the short arm across as well as up", () => {
    // ADR-0038. The hand used to be `reachCeiling` — the highest a hand can get **if it must
    // arrive over the join** — which spends the whole shortfall on height and none of it on
    // the across, leaving the hand hovering above a point the arm cannot span to. The figure
    // was then sized for an arm that long, and the default pair let go rather than dance it.
    const p = plan(MYCO_DEFAULTS, EMBER_DEFAULTS, BREAK);
    const shoulderX = insideShoulderX(myco, width, -1);
    const shoulderY = myco.rigOriginY + myco.restY;

    // Exactly his own arm from his own shoulder, and no further.
    expect(
      Math.hypot(p.hands.beau.lateral - shoulderX, p.hands.beau.height - shoulderY),
    ).toBeCloseTo(myco.handReach, 9);

    // Short of the join in *both* directions — which is what "the hands come apart" means
    // for a hand that is also below it.
    expect(p.hands.beau.lateral).toBeLessThan(p.lateral);
    expect(p.hands.beau.height).toBeLessThan(p.height);

    // 🔴 And **higher** than the old ceiling, not lower. `reachCeiling` pins the hand to the
    // couple's midpoint; released from that, the arm comes back toward its owner and spends
    // what it saves going up. The over-charge was never that the hand was too high.
    expect(p.hands.beau.height).toBeGreaterThan(reachCeiling(myco, width));
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

describe("the arch a couple asks for has to be one the figure can deliver", () => {
  // 🔴 **The guard that was missing on 2026-08-21** (ADR-0036). square-one bows the beau's arc
  // out to meet this number, and at both ends of the call the two dancers are exactly the
  // couple's width apart whatever the bow does in between — so a clearance **at or above** that
  // width cannot be delivered at all (its ADR-0018). The engine answers with its cap, the widest
  // bow the figure has, and the result looks like a working figure with a sprinting beau.
  //
  // Nothing on either side of the seam said so. This is that, said.
  it("🔴 is satisfiable for the pair the scene actually dances", () => {
    // The default cast, which is what `#dance=two-twirls` shows and what ADR-0018 measured:
    // 0.951 of the couple's width, *"inside the cap, only just"*.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const width = touchHold(a, b).width;
    // 🔴 **Both accommodations, and they are nothing like each other** (ADR-0037). The reshape
    // wants a fifth of the couple's width and the break wants nearly all of it — which is why
    // sizing every arch to the worse of the two made the beau bow for a break he had not drawn.
    for (const mode of ACCOMMODATIONS) {
      expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, mode) / width, mode)
        .toBeLessThan(1);
    }
    expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, RESHAPE) / width)
      .toBeCloseTo(0.193, 2);
    expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, BREAK) / width)
      .toBeCloseTo(0.951, 2);
  });

  it("🔴 is NOT satisfiable for a mismatched pair, and has been capped in silence", () => {
    // 🔴 **The finding this guard turned up on 2026-08-21**, written as an assertion on the size
    // of the overshoot rather than left out, because a gap nobody measures is a gap that gets
    // forgotten.
    //
    // ADR-0018 measured the arch clearance on **one** pairing and found it just inside the cap.
    // Nobody checked the others. Myco with Sprout — an adult and a child — asks for **1.62 of
    // the couple's own width**, and the two dancers are exactly that width apart at both ends of
    // the call whatever the bow does in between, so it cannot be delivered at any bow. square-one
    // answers with its cap and the figure looks like it works.
    //
    // The cause is structural rather than a tuning error: the couple's width comes from the
    // **handhold**, so a short-armed pair stands narrow — while their two heads with a hand
    // between them want just as much room as anyone's. The narrower the couple, the further out
    // of reach the arch gets.
    //
    // 🔴 **What a pair should do about it is a decision, and it is Ryan's.** ADR-0028 answers
    // this question for the *hold* — reshape or break — and says nothing about the *figure*.
    // Standing wider for the call is the obvious candidate and it changes what a couple is.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(SPROUT_DEFAULTS);
    const width = touchHold(a, b).width;
    // 🔴 **Neither accommodation fits, which is what makes this the terminal case.** A reshape
    // that clips at the shape editor's bounds "simply breaks by more" (ADR-0028), so for a pair
    // this mismatched both answers land on the same number.
    for (const mode of ACCOMMODATIONS) {
      const ratio = archClearance(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, mode) / width;
      expect(ratio, mode).toBeGreaterThan(1.5);
      expect(ratio, mode).toBeLessThan(1.8);
      expect(archFits(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, mode), mode).toBe(false);
    }
    // So they let go and stand where the figure can clear them: twice the room they need, which
    // is where the beau's arc delivers it on its own radius with no bow at all (ADR-0037).
    const broken = archClearance(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, BREAK);
    expect(archFits(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, 2 * broken, BREAK)).toBe(true);
  });

  it("🔴 and is not multiplied by the clearance margin, which is what broke it", () => {
    // The regression in one line. On the shipped default pair the bare request is 0.951 of the
    // couple's width — inside the cap, only just, exactly as ADR-0018 measured — and the same
    // request times `CLEARANCE_MARGIN` is 1.046, outside it.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const width = touchHold(a, b).width;
    const wanted = archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, BREAK);
    expect(wanted / width).toBeCloseTo(0.952, 3);
    expect((CLEARANCE_MARGIN * wanted) / width).toBeGreaterThan(1);
  });
});

describe("armSweepClearance — the arm holding the hand up is in the gap too", () => {
  const beauShape = MYCO_DEFAULTS;
  const belleShape = EMBER_DEFAULTS;
  const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape));

  /** The sweep for one accommodation, measured on the bodies that will dance it. */
  function sweep(mode: typeof RESHAPE | typeof BREAK): number {
    const p = plan(beauShape, belleShape, mode);
    const b = armMetrics(growBody(beauShape, p.bodyDeltas.beau));
    const l = armMetrics(growBody(belleShape, p.bodyDeltas.belle));
    return armSweepClearance(b, l, p.hands);
  }

  it("🔴 costs more than the hands do under a reshape, which is the whole finding", () => {
    // ADR-0038. A reshaped join rides clear above both crowns, so the cross-section at its
    // height is literally zero and `archClearance` charges almost nothing — while the belle's
    // arm runs from her shoulder up to it, straight past where the beau's head is. Ryan, on the
    // two Twirls: *"now the short side is clipping the belle's arm into beau's head."*
    const hands = archClearance(myco, ember, beauShape, belleShape, width, RESHAPE);
    expect(sweep(RESHAPE)).toBeGreaterThan(hands);
    expect(sweep(RESHAPE)).toBeGreaterThan(bodies);
  });

  it("🔴 does not charge a break for a reach nobody makes", () => {
    // The over-correction this closes. Both arms used to be swept to the *join*, and under a
    // break the short one never gets there — so the model charged the figure for an arm longer
    // than its owner has, the request went past the couple's own handholding width, and the pair
    // let go and stood twice as wide for a pass they could have danced holding on.
    expect(sweep(BREAK)).toBeLessThan(width);
    const sized = sizeArch(myco, ember, beauShape, belleShape, width, bodies, BREAK);
    expect(sized.accommodation).toBe(BREAK);
    expect(sized.width).toBeCloseTo(width, 9);
  });

  it("🔴 is symmetric under swapping the two dancers' sides", () => {
    // The frame is the couple's, not each dancer's, because the first version mirrored into
    // each dancer's own and carried the join's lateral across the flip without negating it —
    // measuring the belle's arm reaching for a point on the wrong side of the midpoint. A pair
    // of the same dancer has a lateral of zero and cannot see that; a mismatched pair can.
    const p = plan(beauShape, belleShape, RESHAPE);
    const b = armMetrics(growBody(beauShape, p.bodyDeltas.beau));
    const l = armMetrics(growBody(belleShape, p.bodyDeltas.belle));
    const mirrored = {
      beau: { height: p.hands.belle.height, lateral: -p.hands.belle.lateral },
      belle: { height: p.hands.beau.height, lateral: -p.hands.beau.lateral },
    };
    expect(armSweepClearance(l, b, mirrored)).toBeCloseTo(armSweepClearance(b, l, p.hands), 6);
  });

  it("charges more for a thicker arm, which is the quantity it is bisecting on", () => {
    // The bisection is sound because the predicate is monotonic in the separation: pulling
    // the pair apart moves every point of each arm away from the other dancer, and the hand
    // each arm ends at is fixed relative to the couple. What that buys is asserted from the
    // outside — a wider arm can only need more room, never less.
    const p = plan(beauShape, belleShape, RESHAPE);
    const b = armMetrics(growBody(beauShape, p.bodyDeltas.beau));
    const l = armMetrics(growBody(belleShape, p.bodyDeltas.belle));
    const thick = armMetrics({
      ...belleShape,
      forearm: {
        ...belleShape.forearm,
        topRadius: belleShape.forearm.topRadius * 2,
        bottomRadius: belleShape.forearm.bottomRadius * 2,
      },
    });
    expect(armSweepClearance(b, thick, p.hands)).toBeGreaterThan(
      armSweepClearance(b, l, p.hands),
    );
  });
});

describe("reachToward", () => {
  it("returns the target itself when the arm can span it", () => {
    const shoulderX = insideShoulderX(ember, width, 1);
    const target = { height: ember.rigOriginY + ember.restY + 0.1, lateral: shoulderX };
    expect(reachToward(ember, shoulderX, target)).toEqual(target);
  });

  it("🔴 stops at exactly one arm's length, on the line to the target", () => {
    const shoulderX = insideShoulderX(myco, width, -1);
    const shoulderY = myco.rigOriginY + myco.restY;
    const target = { height: shoulderY + 10, lateral: shoulderX + 10 };
    const hand = reachToward(myco, shoulderX, target);
    expect(Math.hypot(hand.lateral - shoulderX, hand.height - shoulderY)).toBeCloseTo(
      myco.handReach,
      9,
    );
    // On the line: equal parts of a 45° target.
    expect(hand.lateral - shoulderX).toBeCloseTo(hand.height - shoulderY, 9);
  });
});
