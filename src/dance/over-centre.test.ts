import { describe, expect, it } from "vitest";
import { NO_DUCK, planArch, sizeArch } from "./arch";
import { RESHAPE, growBody, standingLift } from "./accommodation";
import {
  armMetrics, armPoses, forearm, upperArmStrain, gripBlend, poseArms, touchHold, trackForearm,
  type Placement, type TouchHold,
} from "./arm-pose";
import { danceCoupleSequence, partnerUp, flattenSequence, sampleMotion } from "square-one";
import { pairGripRadius } from "./forearm-hold";
import { passingWidth, makeFrame, toWorld, facingToRotationY, DEFAULT_SCALE as scale } from "./frame";
import {
  EMBER_DEFAULTS, MYCO_DEFAULTS, PLAYER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS,
  NPC_BODY_CENTER_Y, lateralClearance, rigidParts, type CharacterBodyShape,
} from "../services/body-shapes";

/**
 * 🧪 **The arch's joined hands held over the centre of the exchange** (2026-10-12, undecided) —
 * `TouchHold.over`, `DanceFloor`'s `archOverCentre`.
 *
 * From Ryan's photographs of a California Twirl
 * ([journal](../../docs/journal/2026-10-12-1-the-l-is-a-gable.md)): the hands stay where they
 * are and she walks under them. Driven through the real pose path, as `duck.test.ts`'s last
 * block is, because the claim is about where a drawn hand ends up.
 */
const CAST: readonly (readonly [string, CharacterBodyShape])[] = [
  ["player", PLAYER_DEFAULTS], ["myco", MYCO_DEFAULTS], ["ember", EMBER_DEFAULTS],
  ["ryan", RYAN_DEFAULTS], ["sprout", SPROUT_DEFAULTS],
];
const PAIRS = CAST.flatMap(([bn, bs]) => CAST.map(([ln, ls]) => [`${bn}/${ln}`, bs, ls] as const));

function walk(bs: CharacterBodyShape, ls: CharacterBodyShape, centred: boolean, close = 0) {
  const b0 = armMetrics(bs), l0 = armMetrics(ls);
  const hold = touchHold(b0, l0);
  const bodies = passingWidth(lateralClearance(rigidParts(bs), rigidParts(ls)));
  const sized = sizeArch(b0, l0, bs, ls, hold.width, bodies, RESHAPE, 1, close, NO_DUCK);
  const plan = planArch(b0, l0, bs, ls, sized.width, sized.accommodation, sized.aim, 1);
  const bShape = plan.bodyDeltas.beau === 0 ? bs : growBody(bs, plan.bodyDeltas.beau);
  const lShape = plan.bodyDeltas.belle === 0 ? ls : growBody(ls, plan.bodyDeltas.belle);
  const bM = plan.bodyDeltas.beau === 0 ? b0 : armMetrics(bShape, NPC_BODY_CENTER_Y, standingLift(bs, bShape));
  const lM = plan.bodyDeltas.belle === 0 ? l0 : armMetrics(lShape, NPC_BODY_CENTER_Y, standingLift(ls, lShape));
  const couple = partnerUp("a", "b", undefined, undefined, hold.width / scale, bodies / scale, undefined, pairGripRadius(b0, l0) / scale);
  const shapeAt = () => ({ width: sized.width / scale, archClearance: sized.wanted / scale });
  const motions = flattenSequence(danceCoupleSequence(["california-twirl"] as never, couple, shapeAt as never)) as Record<string, { beats: number }>;
  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const at = (key: string, beat: number): Placement => {
    const s = sampleMotion(motions[key]! as never, beat) as { position: { x: number; y: number }; facing: number };
    const w = toWorld(frame, s.position);
    return { x: w.x, z: w.z, yaw: facingToRotationY(frame, s.facing) };
  };
  const centre = { x: (at("a", 0).x + at("b", 0).x) / 2, z: (at("a", 0).z + at("b", 0).z) / 2 };
  return [1, 2, 3].map((beat) => {
    const selfB = at("a", beat), selfL = at("b", beat);
    const mk = (who: "beau" | "belle"): TouchHold => ({
      width: hold.width, height: plan.hands[who].height, lateral: plan.hands[who].lateral,
      forward: 0, insideBeau: hold.insideBeau, insideBelle: hold.insideBelle, raised: 1,
      ...(centred ? { over: { ...centre, weight: 1 } } : {}),
    });
    const pl = armPoses(); poseArms(pl, lM, bM, selfL, selfB, gripBlend(), undefined, mk("belle"), "left");
    const pb = armPoses(); poseArms(pb, bM, lM, selfB, selfL, gripBlend(), undefined, mk("beau"), "right");
    const hl = trackForearm(forearm(), lM, pl.left, selfL).hand;
    const hb = trackForearm(forearm(), bM, pb.right, selfB).hand;
    return {
      beat,
      herOffCentre: Math.hypot(hl.x - centre.x, hl.z - centre.z),
      hisOffCentre: Math.hypot(hb.x - centre.x, hb.z - centre.z),
      herFromCentre: Math.hypot(selfL.x - centre.x, selfL.z - centre.z),
      hisFromCentre: Math.hypot(selfB.x - centre.x, selfB.z - centre.z),
      hisReach: bM.handReach, width: sized.width, wanted: sized.wanted, bodies, armDelta: sized.armDelta,
      herStrain: upperArmStrain(pl.left, lM, 1), hisStrain: upperArmStrain(pb.right, bM, -1),
      gapFlat: Math.hypot(hl.x - hb.x, hl.z - hb.z),
    };
  });
}

describe("🧪 the join is held over the centre of the exchange", () => {
  it("🔑 she is exactly at that centre under the arch, so there it is over her own crown", () => {
    for (const [name, bs, ls] of PAIRS) {
      expect(walk(bs, ls, true)[1]!.herFromCentre, name).toBeCloseTo(0, 4);
    }
  });

  it.each(PAIRS)("%s: both hands arrive over it at every beat of the turn", (_name, bs, ls) => {
    // Not zero: a hand is drawn, and its centre sits off the point the palm is put on.
    for (const r of walk(bs, ls, true)) {
      expect(r.herOffCentre, `beat ${String(r.beat)}`).toBeLessThan(0.1);
      expect(r.hisOffCentre, `beat ${String(r.beat)}`).toBeLessThan(0.16);
    }
  });

  it("🔑 which the pair-carried join does not do, even at overhead 1", () => {
    // The control. Carried with the pair, her hand follows *her* — so at the quarter and the
    // three-quarter it has left the centre she has walked away from.
    const off = walk(PLAYER_DEFAULTS, PLAYER_DEFAULTS, false);
    expect(off[0]!.herOffCentre).toBeGreaterThan(0.3);
    expect(off[2]!.herOffCentre).toBeGreaterThan(0.3);
  });

  it("🔴 and 12 of 25 beaus stretch to get there, which is the next thing to fix", () => {
    // He passes `ArchSizing.wanted` from the centre at the midpoint, and that is further than
    // his arm goes for half the cast — so the solve lengthens his undrawn upper arm rather than
    // letting the hands part. Recorded, not hidden: this is the number the pass distance (the
    // plan's step 2) is meant to bring down, and the test that says what it was.
    const strained = PAIRS.filter(([, bs, ls]) => walk(bs, ls, true)[1]!.hisStrain > 0.01);
    expect(strained.map(([name]) => name)).toHaveLength(12);
  });
});
