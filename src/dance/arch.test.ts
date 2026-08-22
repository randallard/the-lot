import { describe, expect, it } from "vitest";
import {
  CLEAR,
  LOW,
  archClearance,
  wearing,
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
import { CLEARANCE_MARGIN, passingWidth } from "./frame";
import {
  ACCOMMODATIONS,
  BREAK,
  OVERSHOOT,
  RESHAPE,
  UPPER_ARM_STEP,
  drawAccommodation,
  growBody,
  growUpperArm,
} from "./accommodation";
import { armMetrics, armPose, localHeight, touchHold, touchPose } from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  PLAYER_DEFAULTS,
  RYAN_DEFAULTS,
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
    // 🔑 Measured on the *lifted* rig she is standing on (ADR-0043) — a reshaped dancer's
    // heights are not the ones `growBody` alone reports.
    const belle = wearing(ember, EMBER_DEFAULTS, p.bodyDeltas.belle);
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
    const beau = wearing(myco, MYCO_DEFAULTS, p.bodyDeltas.beau);
    const out = armPose();
    touchPose(out, beau, -1, -(width / 2), localHeight(beau, p.hands.beau.height), 0);
    expect(out.x).toBeCloseTo(-beau.restX, 9);

    // And the same solve at **zero** overshoot does not — which is why the constant is not
    // zero. Built here rather than taken from a plan, because there is no way to ask for a
    // reshape that does not overshoot, and there should not be.
    const exactDelta = p.bodyDeltas.beau / (1 + OVERSHOOT);
    const tight = wearing(myco, MYCO_DEFAULTS, exactDelta);
    const tightBelle = wearing(ember, EMBER_DEFAULTS, -exactDelta);
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
    // becomes a second, invisible definition of what a body may be. Sprout has the shortest arms
    // in the repo, so with him as beau the trade runs his partner into the 0.10 floor — which is
    // why the two deltas here are *not* equal and opposite, unlike every pair not up against a
    // slider.
    //
    // 🔑 **Sprout with Ember used to be the example and no longer clips at all.** ADR-0043 halved
    // what every trade costs — a body that grows from its own bottom moves its shoulder by the
    // whole change rather than half of it — and that pair now settles symmetrically at
    // 1.037/0.673 where it used to be pinned against both ends of the slider.
    const p = plan(SPROUT_DEFAULTS, MYCO_DEFAULTS, RESHAPE);
    const beauHeight = SPROUT_DEFAULTS.body.height + p.bodyDeltas.beau;
    const belleHeight = MYCO_DEFAULTS.body.height + p.bodyDeltas.belle;
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
    // wants under a third of the couple's width and the break wants nearly all of it — which is
    // why sizing every arch to the worse of the two made the beau bow for a break he had not
    // drawn.
    for (const mode of ACCOMMODATIONS) {
      expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, mode) / width, mode)
        .toBeLessThan(1);
    }
    // 🔴 **Both numbers moved on 2026-08-22, in opposite directions**, when `archClearance` stopped
    // charging a hand against its own owner and started measuring from where the hand actually is
    // rather than from the couple's midpoint. The reshape went **0.193 -> 0.281** — it had been
    // *under*-charged, because the join leans 0.050 toward the belle and nothing counted that —
    // and the break went **0.951 -> 0.905**, because the beau's hand no longer pays to clear the
    // beau. An off-centre join is nearer one dancer and further from the other, so a fix for one
    // conflation cannot move every number the same way.
    expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, RESHAPE) / width)
      .toBeCloseTo(0.281, 2);
    expect(archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, BREAK) / width)
      .toBeCloseTo(0.905, 2);
  });

  it("🔴 is NOT satisfiable for a mismatched pair, and has been capped in silence", () => {
    // 🔴 **The finding this guard turned up on 2026-08-21**, written as an assertion on the size
    // of the overshoot rather than left out, because a gap nobody measures is a gap that gets
    // forgotten.
    //
    // ADR-0018 measured the arch clearance on **one** pairing and found it just inside the cap.
    // Nobody checked the others. Myco with Sprout — an adult and a child — cannot be given the
    // room at the width their handhold puts them at, and the two dancers are exactly that width
    // apart at both ends of the call whatever the bow does in between. square-one answers with
    // its cap and the figure looks like it works.
    //
    // The cause is structural rather than a tuning error: the couple's width comes from the
    // **handhold**, so a short-armed pair stands narrow — while their two heads with a hand
    // between them want just as much room as anyone's. The narrower the couple, the further out
    // of reach the arch gets.
    //
    // 🔴 **The overshoot was 1.62, then 1.07, and is 1.05.** It was inflated by two conflations
    // `archClearance` carried until 2026-08-22 — charging a hand against its own owner, and
    // measuring from the couple's midpoint rather than the hand's own lateral — and then it fell
    // again when the couple's standing width stopped being short of what they need to pass
    // (ADR-0044). The finding survives every correction; its size does not, and the honest number
    // is the one to reason from.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(SPROUT_DEFAULTS);
    const width = touchHold(a, b).width;
    // 🔴 **Neither accommodation fits, which is what makes this the terminal case.** A reshape
    // that clips at the shape editor's bounds "simply breaks by more" (ADR-0028), so for a pair
    // this mismatched both answers land on the same number.
    for (const mode of ACCOMMODATIONS) {
      const ratio = archClearance(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, mode) / width;
      expect(ratio, mode).toBeGreaterThan(1);
      expect(ratio, mode).toBeCloseTo(1.051, 2);
      expect(archFits(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, mode), mode).toBe(false);
    }
    // 🔴 **What is left is the arch's own doing, and that is the part worth keeping.** These two
    // used to want *more than their whole handholding width* to pass each other with hands free
    // and no arch involved — a Partner Thru failed for them on the same ground — because the
    // stance was floored with an additive margin where the figure asked for a multiplicative one.
    // ADR-0044 gave both the same function, and their stance now sits **exactly** on what they
    // need to pass. Everything still over 1 here is the hand and the arm in the gap.
    expect(
      passingWidth(lateralClearance(rigidParts(MYCO_DEFAULTS), rigidParts(SPROUT_DEFAULTS))) / width,
    ).toBeCloseTo(1, 9);
    // So they let go and stand where the figure can clear them: twice the room they need, which
    // is where the beau's arc delivers it on its own radius with no bow at all (ADR-0037).
    const broken = archClearance(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, width, BREAK);
    expect(archFits(a, b, MYCO_DEFAULTS, SPROUT_DEFAULTS, 2 * broken, BREAK)).toBe(true);
  });

  it("🔴 and is not multiplied by the clearance margin, which is what broke it", () => {
    // The rule ADR-0036 settled: `archClearance` already carries three margins of its own, and
    // multiplying it by a fourth pushed the request past the couple's width — which square-one
    // answers with its cap, the widest bow the figure has, so the regression looked like a
    // working figure.
    //
    // 🔴 **The witness has weakened and is kept anyway, deliberately.** When this was written the
    // bare request was 0.951 of the couple's width and the margined one 1.046 — over the cap, and
    // the regression in one line. The 2026-08-22 `archClearance` correction took the bare request
    // to 0.905, so the margined one is now 0.996: still the largest number in this figure by a
    // long way, and now a *near miss* rather than an overflow. The decision does not rest on this
    // pair being the one it overflows for — it rests on the margin already being in there three
    // times — so the assertion says what is true today and the history says why it is thinner.
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const width = touchHold(a, b).width;
    const wanted = archClearance(a, b, MYCO_DEFAULTS, EMBER_DEFAULTS, width, BREAK);
    expect(wanted / width).toBeCloseTo(0.905, 3);
    expect((CLEARANCE_MARGIN * wanted) / width).toBeCloseTo(0.996, 3);
    expect((CLEARANCE_MARGIN * wanted) / width).toBeGreaterThan(wanted / width);
  });
});

describe("armSweepClearance — the arm holding the hand up is in the gap too", () => {
  const beauShape = MYCO_DEFAULTS;
  const belleShape = EMBER_DEFAULTS;
  const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape));

  /** The sweep for one accommodation, measured on the bodies that will dance it. */
  function sweep(mode: typeof RESHAPE | typeof BREAK): number {
    const p = plan(beauShape, belleShape, mode);
    const b = wearing(armMetrics(beauShape), beauShape, p.bodyDeltas.beau);
    const l = wearing(armMetrics(belleShape), belleShape, p.bodyDeltas.belle);
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
    const b = wearing(armMetrics(beauShape), beauShape, p.bodyDeltas.beau);
    const l = wearing(armMetrics(belleShape), belleShape, p.bodyDeltas.belle);
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

describe("sizeArch reaches before it lets go", () => {
  // ADR-0040. When neither accommodation can be delivered at the couple's own width, the pair
  // lengthen the undrawn upper arm rather than letting go and standing at twice the room.
  // Ryan: *"can we have last resort be extending the upper arm?"*
  const room = (beauShape: CharacterBodyShape, belleShape: CharacterBodyShape) => {
    const b = armMetrics(beauShape);
    const l = armMetrics(belleShape);
    const w = touchHold(b, l).width;
    const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape));
    return { b, l, w, bodies };
  };

  it("takes no arm at all from a pair who can already dance it", () => {
    // The guard that matters most: a last resort that fires when it is not needed is a cast
    // whose arms grow every Twirl for no reason anybody watching could name.
    const { b, l, w, bodies } = room(MYCO_DEFAULTS, EMBER_DEFAULTS);
    for (const mode of ACCOMMODATIONS) {
      const sized = sizeArch(b, l, MYCO_DEFAULTS, EMBER_DEFAULTS, w, bodies, mode);
      expect(sized.armDelta, mode).toBe(0);
      expect(sized.width, mode).toBeCloseTo(w, 9);
      expect(sized.accommodation, mode).toBe(mode);
    }
  });

  it("🔴 reaches for it rather than letting go — Myco and Sprout keep hold", () => {
    // The pairing that started this. Before ADR-0040 they let go and stood at 1.572, more than
    // twice their handholding width, for a call an adult and a child dance without thinking
    // about it. Ryan: *"they should not have to stand wide."*
    const { b, l, w, bodies } = room(MYCO_DEFAULTS, SPROUT_DEFAULTS);
    const sized = sizeArch(b, l, MYCO_DEFAULTS, SPROUT_DEFAULTS, w, bodies, RESHAPE);

    expect(sized.armDelta).toBeCloseTo(0.03, 9);
    expect(sized.width).toBeCloseTo(0.774, 3);
    // 🔑 They now *stand* at exactly what their bodies need to pass (ADR-0044), so every unit of
    // this reach is the arch's — the hand and the arm in the gap — and none of it is the stance
    // making up a shortfall it should never have had.
    // 🔑 **Holding on.** The old answer was `2 * wanted`; this is a hair over the width their
    // own longer arms put them at, which is what keeping the hold looks like as a number.
    expect(sized.wanted).toBeLessThan(sized.width);
    expect(sized.width).toBeLessThan(2 * sized.wanted);
    // And it is a *small* widening rather than a shove: **4%** of where they already stood,
    // against the 113% the old answer moved them.
    expect(sized.width / w).toBeCloseTo(1.039, 3);
  });

  it("🔴 the arm is the pair's, not the draw's, so they stand in one place either way", () => {
    // A width that moved with the coin would put the per-execution difference into the floor
    // plan, where a watcher reads it as the dance changing rather than the dancers. The torsos
    // and the bow carry the draw; where they stand does not.
    const { b, l, w, bodies } = room(MYCO_DEFAULTS, SPROUT_DEFAULTS);
    const [reshaped, broken] = ACCOMMODATIONS.map((mode) =>
      sizeArch(b, l, MYCO_DEFAULTS, SPROUT_DEFAULTS, w, bodies, mode),
    );
    expect(reshaped!.armDelta).toBe(broken!.armDelta);
    expect(reshaped!.width).toBeCloseTo(broken!.width, 9);
    // The draw still survives it — this is not a third accommodation (ADR-0028).
    expect(reshaped!.accommodation).toBe(RESHAPE);
    expect(broken!.accommodation).toBe(BREAK);
  });

  it("lands on the shape editor's own step, because a dance may not out-reach the sheet", () => {
    const { b, l, w, bodies } = room(MYCO_DEFAULTS, SPROUT_DEFAULTS);
    const { armDelta } = sizeArch(b, l, MYCO_DEFAULTS, SPROUT_DEFAULTS, w, bodies, BREAK);
    expect(Math.round(armDelta / UPPER_ARM_STEP) * UPPER_ARM_STEP).toBeCloseTo(armDelta, 9);
    const max = SHAPE_BOUNDS.layout.upperArmSpacing.max;
    expect(growUpperArm(SPROUT_DEFAULTS, armDelta).layout.upperArmSpacing).toBeLessThanOrEqual(max);
  });

  it("🔴 is bounded, and lets go when no arm within the sheet is left to take", () => {
    // ADR-0037 part 3 is still the terminal case, and it is reachable — just not by anyone on
    // the shipped cast any more (ADR-0041). Asserted on a pair whose upper arms are already at
    // the shape editor's ceiling, so there is nothing to reach with: that is the *bound* this
    // test is about, and picking a pairing to fail instead would make it a test of the cast.
    const max = SHAPE_BOUNDS.layout.upperArmSpacing.max;
    // Arms already at the ceiling, and a head at the editor's widest — nothing left to reach
    // with, and enough head in the gap that the room could not be found anyway.
    const beauShape = growUpperArm(
      { ...EMBER_DEFAULTS, head: { ...EMBER_DEFAULTS.head, radius: SHAPE_BOUNDS.head.radius.max } },
      max,
    );
    const belleShape = growUpperArm(SPROUT_DEFAULTS, max);
    expect(beauShape.layout.upperArmSpacing).toBe(max);
    const { b, l, w, bodies } = room(beauShape, belleShape);
    const sized = sizeArch(b, l, beauShape, belleShape, w, bodies, RESHAPE);
    expect(sized.armDelta).toBe(0);
    expect(sized.accommodation).toBe(BREAK);
    expect(sized.width).toBeCloseTo(2 * sized.wanted, 9);
    expect(sized.width).toBeGreaterThan(w);
  });

  it("🔴 rescues Ember as beau once the join is allowed to rise with them", () => {
    // The pairing ADR-0040 could not reach and named as its promotion condition. The join was
    // pinned to the belle's crown plus a hand — on a beau this much taller, level with his own
    // head — so longer arms bought reach nobody could spend. Letting it rise (ADR-0041) turns
    // the reach into something worth taking, and these two hold on.
    const { b, l, w, bodies } = room(EMBER_DEFAULTS, MYCO_DEFAULTS);
    const sized = sizeArch(b, l, EMBER_DEFAULTS, MYCO_DEFAULTS, w, bodies, RESHAPE);
    expect(sized.armDelta).toBeCloseTo(0.31, 9);
    expect(sized.wanted).toBeLessThan(sized.width);
    expect(sized.accommodation).toBe(RESHAPE);
    // 🔴 **And it is the dearest reach on the cast** — 0.31 on a 0.33 upper arm, very nearly
    // doubling the undrawn segment. Recorded rather than smoothed over: if it reads as a limb
    // stretching on screen, this is the number to argue with.
    expect(sized.width).toBeCloseTo(1.14, 2);
  });
});

describe("archHeight — the join rises when the pair can lift it clear", () => {
  // ADR-0041. `archLateral` has always documented the arch as sitting above both crowns "by
  // construction", and the code did not maintain it: the join sat at the *belle's* crown plus
  // headroom, which on a much taller beau lands inside his own head.
  const at = (beauShape: CharacterBodyShape, belleShape: CharacterBodyShape) => {
    const b = armMetrics(beauShape);
    const l = armMetrics(belleShape);
    const w = touchHold(b, l).width;
    return { b, l, w, plan: plan(beauShape, belleShape, RESHAPE) };
  };
  const room = (beauShape: CharacterBodyShape, belleShape: CharacterBodyShape) => {
    const b = armMetrics(beauShape);
    const l = armMetrics(belleShape);
    return {
      b, l,
      w: touchHold(b, l).width,
      bodies: CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape)),
    };
  };

  it("never sits below the belle's crown, because she walks under it", () => {
    for (const [beauShape, belleShape] of [
      [MYCO_DEFAULTS, EMBER_DEFAULTS],
      [EMBER_DEFAULTS, MYCO_DEFAULTS],
      [MYCO_DEFAULTS, SPROUT_DEFAULTS],
      [SPROUT_DEFAULTS, MYCO_DEFAULTS],
    ] as const) {
      const { b, l, plan: p } = at(beauShape, belleShape);
      const grown = wearing(l, belleShape, p.bodyDeltas.belle);
      const clear = Math.max(wearing(b, beauShape, p.bodyDeltas.beau).handRadius, l.handRadius);
      expect(p.height).toBeGreaterThanOrEqual(crownOf(grown) + clear - 1e-9);
    }
  });

  it("🔴 rises above her crown when the beau is the taller one — once they can reach", () => {
    // The whole point, and it only happens where it can. Myco's crown is 1.530 and Ember's is
    // 2.155, so with Ember as beau the old rule pinned the join at 1.640 — half a unit below
    // the top of his head and squarely inside it.
    //
    // 🔑 **At their own width it still cannot rise**, because Myco can only reach 1.638 and a
    // join nobody can hold is not a join. It rises once the reach (ADR-0040) lifts the ceiling,
    // which is the two decisions composing: asserted where it actually happens, on the pair
    // `sizeArch` sizes rather than on the pair they started as.
    const base = room(EMBER_DEFAULTS, MYCO_DEFAULTS);
    expect(at(EMBER_DEFAULTS, MYCO_DEFAULTS).plan.height).toBeCloseTo(1.64, 2);

    const sized = sizeArch(base.b, base.l, EMBER_DEFAULTS, MYCO_DEFAULTS, base.w, base.bodies, RESHAPE);
    const beauShape = growUpperArm(EMBER_DEFAULTS, sized.armDelta);
    const belleShape = growUpperArm(MYCO_DEFAULTS, sized.armDelta);
    const reached = planArch(
      armMetrics(beauShape), armMetrics(belleShape), beauShape, belleShape, sized.width, RESHAPE,
    );
    expect(reached.height).toBeCloseTo(1.944, 2);
    expect(reached.height).toBeGreaterThan(crownOf(armMetrics(belleShape)));
  });

  it("🔴 never rises above what BOTH of them can reach", () => {
    // A join nobody can hold is not a join. This is the clamp that keeps the rise from
    // manufacturing breaks — and it is what the reach (ADR-0040) lifts, which is how the two
    // decisions compose.
    for (const [beauShape, belleShape] of [
      [EMBER_DEFAULTS, MYCO_DEFAULTS],
      [EMBER_DEFAULTS, SPROUT_DEFAULTS],
      [MYCO_DEFAULTS, EMBER_DEFAULTS],
    ] as const) {
      const { w, plan: p } = at(beauShape, belleShape);
      const b = wearing(armMetrics(beauShape), beauShape, p.bodyDeltas.beau);
      const l = wearing(armMetrics(belleShape), belleShape, p.bodyDeltas.belle);
      const both = Math.min(reachCeiling(b, w), reachCeiling(l, w));
      const floor = crownOf(l) + Math.max(b.handRadius, l.handRadius);
      expect(p.height).toBeLessThanOrEqual(Math.max(floor, both) + 1e-9);
    }
  });

  it("leaves a pair who could already dance it exactly where they were", () => {
    // The regression guard. Raising the join unconditionally to clear both crowns was tried
    // first and it charged the whole cast for two pairings — including a hairline break in the
    // default pair's reshape, because growing the beau to reach the join also raises his crown.
    const { b, l, w, bodies } = (() => {
      const bb = armMetrics(MYCO_DEFAULTS);
      const ll = armMetrics(EMBER_DEFAULTS);
      const ww = touchHold(bb, ll).width;
      return {
        b: bb, l: ll, w: ww,
        bodies: CLEARANCE_MARGIN * lateralClearance(rigidParts(MYCO_DEFAULTS), rigidParts(EMBER_DEFAULTS)),
      };
    })();
    const sized = sizeArch(b, l, MYCO_DEFAULTS, EMBER_DEFAULTS, w, bodies, RESHAPE);
    expect(sized.armDelta).toBe(0);
    expect(sized.width).toBeCloseTo(w, 9);
    // The reshape still closes the hold — no hairline gap.
    expect(plan(MYCO_DEFAULTS, EMBER_DEFAULTS, RESHAPE).gap).toBeCloseTo(0, 6);
  });
});

describe("🔴 the cascade is derived, not fitted to the cast it was found on", () => {
  // Ryan: *"these aren't static right? when new characters with different dimensions are added
  // they will fall somewhere in between and be accommodated?"*
  //
  // Every number the arch machinery uses is read off the two bodies — crowns, reaches, side
  // extents, the handhold's own width — and every lever is bounded by the **shape editor's** own
  // range rather than by anything this file knows. The claim that a body nobody has authored yet
  // lands somewhere sensible is therefore checkable, and this checks it: random dancers drawn
  // across the whole of `SHAPE_BOUNDS`, including combinations no designer would choose.
  //
  // Deterministic by construction — a fixed seed, so a failure is reproducible and a green run
  // means the same thing twice.

  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = (b: { min: number; max: number }) => b.min + rnd() * (b.max - b.min);

  function randomBody(): CharacterBodyShape {
    const B = SHAPE_BOUNDS;
    return {
      ...MYCO_DEFAULTS,
      head: { ...MYCO_DEFAULTS.head, radius: pick(B.head.radius) },
      body: { ...MYCO_DEFAULTS.body, radius: pick(B.body.radius), height: pick(B.body.height) },
      forearm: { ...MYCO_DEFAULTS.forearm, height: pick(B.forearm.height) },
      hand: {
        open: { ...MYCO_DEFAULTS.hand.open, radius: pick(B.hand.radius) },
        closed: { ...MYCO_DEFAULTS.hand.closed },
      },
      layout: {
        forearmXOffset: pick(B.layout.forearmXOffset),
        upperArmSpacing: pick(B.layout.upperArmSpacing),
        headBodyGap: pick(B.layout.headBodyGap),
      },
    };
  }

  it("always returns a figure the engine can actually deliver, whoever is dancing", () => {
    // The one invariant that matters, and the reason the cascade has a terminal case at all:
    // square-one answers a clearance at or above the couple's width with its **cap** — the widest
    // bow the figure has — which looks like a working figure danced by a sprinting beau
    // (ADR-0036). `sizeArch` must never hand it one. Falling off the end of reshape → reach →
    // let go would show up here as `wanted >= width`.
    const seen = { own: 0, reached: 0, letGo: 0 };
    for (let i = 0; i < 300; i++) {
      const beauShape = randomBody();
      const belleShape = randomBody();
      const b = armMetrics(beauShape);
      const l = armMetrics(belleShape);
      const w = touchHold(b, l).width;
      const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape));
      for (const mode of ACCOMMODATIONS) {
        const sized = sizeArch(b, l, beauShape, belleShape, w, bodies, mode);

        expect(Number.isFinite(sized.wanted), `wanted ${String(i)} ${mode}`).toBe(true);
        expect(Number.isFinite(sized.width), `width ${String(i)} ${mode}`).toBe(true);
        expect(sized.width, `positive ${String(i)} ${mode}`).toBeGreaterThan(0);
        expect(sized.armDelta, `arm sign ${String(i)} ${mode}`).toBeGreaterThanOrEqual(0);
        // 🔴 The invariant.
        expect(sized.wanted, `deliverable ${String(i)} ${mode}`).toBeLessThan(sized.width);

        if (sized.armDelta > 0) seen.reached++;
        else if (sized.width > w + 1e-9) seen.letGo++;
        else seen.own++;
      }
    }

    // 🔑 **All three branches are exercised by the random cast**, which is what makes the run
    // above a test of the cascade rather than of its first case. Measured over the full 4000-pair
    // sweep this was distilled from: 71% dance at their own width, 28% reach, **1% still let go**
    // — so "somewhere in between" is almost always true and the terminal case is real.
    expect(seen.own).toBeGreaterThan(0);
    expect(seen.reached).toBeGreaterThan(0);
    expect(seen.letGo).toBeGreaterThan(0);
  });

  it("🔴 never stands a couple closer than they can pass each other", () => {
    // ADR-0044, and the invariant is the whole decision. `placeHold` floors the couple's stance at
    // the room their bodies need; the figure asks for the same room when it walks them past each
    // other. Those were two different formulas — `clearance + PERSONAL_SPACE` against
    // `CLEARANCE_MARGIN × clearance` — equal only at a clearance of 0.600, and above it the
    // stance was short. Myco with Sprout by 0.008, which is small and is also a couple standing
    // somewhere they cannot dance.
    //
    // One function now, so this cannot come apart again without the test saying so.
    for (let i = 0; i < 300; i++) {
      const beauShape = randomBody();
      const belleShape = randomBody();
      const b = armMetrics(beauShape);
      const l = armMetrics(belleShape);
      const need = passingWidth(lateralClearance(rigidParts(beauShape), rigidParts(belleShape)));
      expect(touchHold(b, l).width, `pair ${String(i)}`).toBeGreaterThanOrEqual(need - 1e-9);
    }
  });

  it("never reaches past the length the shape editor would let a designer author", () => {
    // The dance accommodates the body; it does not get to invent one. Same contract `growBody`
    // states for the torso — *"a dance may not put a dancer anywhere the character sheet could
    // not"* — and the reason a reach can run out and the pair have to let go instead.
    const { max } = SHAPE_BOUNDS.layout.upperArmSpacing;
    for (let i = 0; i < 120; i++) {
      const beauShape = randomBody();
      const belleShape = randomBody();
      const b = armMetrics(beauShape);
      const l = armMetrics(belleShape);
      const w = touchHold(b, l).width;
      const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape));
      const { armDelta } = sizeArch(b, l, beauShape, belleShape, w, bodies, RESHAPE);
      if (armDelta === 0) continue;
      for (const shape of [beauShape, belleShape]) {
        expect(growUpperArm(shape, armDelta).layout.upperArmSpacing).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe("the reshape aims at whichever height asks the figure for less", () => {
  // ADR-0042. Ryan, on a short-armed belle getting no reshape at all: *"do the reshape fix too."*
  const room = (beauShape: CharacterBodyShape, belleShape: CharacterBodyShape) => {
    const b = armMetrics(beauShape);
    const l = armMetrics(belleShape);
    return {
      b, l,
      w: touchHold(b, l).width,
      bodies: CLEARANCE_MARGIN * lateralClearance(rigidParts(beauShape), rigidParts(belleShape)),
    };
  };

  it("🔴 aiming clear of a taller beau is a NEGATIVE trade — he shrinks and she grows", () => {
    // The half that did not exist. Whoever sets the height cannot reshape their own way up to it:
    // growing them raises the target by exactly what it raises their shoulder, so `d` cancels out
    // of their own constraint. With a much taller beau the lever is hers, and the sign flips.
    const { b, l, w } = room(EMBER_DEFAULTS, MYCO_DEFAULTS);
    const high = planArch(b, l, EMBER_DEFAULTS, MYCO_DEFAULTS, w, RESHAPE, CLEAR);
    expect(high.bodyDeltas.beau).toBeLessThan(0);
    expect(high.bodyDeltas.belle).toBeGreaterThan(0);

    // And under the old aim there was nothing at all for this pair to draw — both accommodations
    // produced the same plan, so the coin was flipped and both faces were the same.
    const low = planArch(b, l, EMBER_DEFAULTS, MYCO_DEFAULTS, w, RESHAPE, LOW);
    expect(low.bodyDeltas.beau).toBe(0);
    expect(low.bodyDeltas.belle).toBe(0);
  });

  it("🔴 takes it only when it is cheaper, because an accommodation must beat its alternative", () => {
    // ADR-0038's rule, applied to *which* reshape rather than to reshape-versus-break. Aiming
    // high was tried unconditionally first and it made three shipped pairings worse — Myco with
    // Sprout went 0.030 of arm to 0.040, and Ember with Sprout went from dancing comfortably to
    // needing 0.190. Choosing costs one extra evaluation and cannot lose.
    for (const [beauShape, belleShape] of [
      [EMBER_DEFAULTS, MYCO_DEFAULTS],
      [EMBER_DEFAULTS, SPROUT_DEFAULTS],
      [MYCO_DEFAULTS, SPROUT_DEFAULTS],
      [MYCO_DEFAULTS, EMBER_DEFAULTS],
    ] as const) {
      const { b, l, w, bodies } = room(beauShape, belleShape);
      const sized = sizeArch(b, l, beauShape, belleShape, w, bodies, RESHAPE);
      const low = archClearance(b, l, beauShape, belleShape, w, RESHAPE, LOW);
      const chosen = archClearance(b, l, beauShape, belleShape, w, RESHAPE, sized.aim);
      expect(chosen, `${sized.aim} vs low`).toBeLessThanOrEqual(low + 1e-9);
    }
  });

  it("leaves a taller belle exactly where she was — the aim only exists for a taller beau", () => {
    // The default pair and every pairing like it. `cheaperAim` returns LOW without evaluating
    // anything when the belle is the taller, so nothing about the shipped figure moved.
    const { b, l, w, bodies } = room(MYCO_DEFAULTS, EMBER_DEFAULTS);
    expect(sizeArch(b, l, MYCO_DEFAULTS, EMBER_DEFAULTS, w, bodies, RESHAPE).aim).toBe(LOW);
    expect(
      planArch(b, l, MYCO_DEFAULTS, EMBER_DEFAULTS, w, RESHAPE, CLEAR).bodyDeltas,
    ).toEqual(planArch(b, l, MYCO_DEFAULTS, EMBER_DEFAULTS, w, RESHAPE, LOW).bodyDeltas);
  });

  it("🔴 and the higher aim really is worth having — five of the twenty shipped orderings take it", () => {
    // Measured rather than assumed, because a lever nothing ever pulls is dead code wearing a
    // decision. Over 4000 random pairs across the whole shape range it wins about one in five.
    const cast = [PLAYER_DEFAULTS, MYCO_DEFAULTS, EMBER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS];
    let taken = 0;
    for (const beauShape of cast) {
      for (const belleShape of cast) {
        if (beauShape === belleShape) continue;
        const { b, l, w, bodies } = room(beauShape, belleShape);
        if (sizeArch(b, l, beauShape, belleShape, w, bodies, RESHAPE).aim === CLEAR) taken++;
      }
    }
    expect(taken).toBe(5);
  });
});
