import { describe, expect, it } from "vitest";
import { NO_DUCK, OVER_CENTRE, breakEffort, crownOf, headroom, planArch, sizeArch, type Overhead } from "./arch";
import { BREAK, RESHAPE, growBody, growForearm, standingLift } from "./accommodation";
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

function walk(bs0: CharacterBodyShape, ls0: CharacterBodyShape, centred: boolean, close = 0, overhead: Overhead = 1) {
  const hold0 = touchHold(armMetrics(bs0), armMetrics(ls0));
  const bodies = passingWidth(lateralClearance(rigidParts(bs0), rigidParts(ls0)));
  const sized = sizeArch(armMetrics(bs0), armMetrics(ls0), bs0, ls0, hold0.width, bodies, RESHAPE, overhead, close, NO_DUCK);
  // As the floor does: a pair who reached dance on their lengthened forearms, at the stance those give.
  const bs = sized.armDelta === 0 ? bs0 : growForearm(bs0, sized.armDelta);
  const ls = sized.armDelta === 0 ? ls0 : growForearm(ls0, sized.armDelta);
  const b0 = armMetrics(bs), l0 = armMetrics(ls);
  const hold = touchHold(b0, l0);
  const broken = sized.accommodation === BREAK;
  const plan = sized.centre
    ? planArch(b0, l0, bs, ls, sized.wanted, sized.accommodation, sized.aim, OVER_CENTRE, sized.toward ?? 0)
    : planArch(b0, l0, bs, ls, sized.width, sized.accommodation, sized.aim, overhead === OVER_CENTRE ? 1 : overhead);
  const bShape = plan.bodyDeltas.beau === 0 ? bs : growBody(bs, plan.bodyDeltas.beau);
  const lShape = plan.bodyDeltas.belle === 0 ? ls : growBody(ls, plan.bodyDeltas.belle);
  const bM = plan.bodyDeltas.beau === 0 ? b0 : armMetrics(bShape, NPC_BODY_CENTER_Y, standingLift(bs, bShape));
  const lM = plan.bodyDeltas.belle === 0 ? l0 : armMetrics(lShape, NPC_BODY_CENTER_Y, standingLift(ls, lShape));
  const couple = partnerUp("a", "b", undefined, undefined, hold0.width / scale, bodies / scale, undefined, pairGripRadius(armMetrics(bs0), armMetrics(ls0)) / scale);
  const shapeAt = () => ({ width: sized.width / scale, archClearance: sized.wanted / scale });
  const motions = flattenSequence(danceCoupleSequence(["california-twirl"] as never, couple, shapeAt as never)) as Record<string, { beats: number }>;
  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const at = (key: string, beat: number): Placement => {
    const s = sampleMotion(motions[key]! as never, beat) as { position: { x: number; y: number }; facing: number };
    const w = toWorld(frame, s.position);
    return { x: w.x, z: w.z, yaw: facingToRotationY(frame, s.facing) };
  };
  const mid0 = { x: (at("a", 0).x + at("b", 0).x) / 2, z: (at("a", 0).z + at("b", 0).z) / 2 };
  // …moved `toward` him along the line to where he is at the midpoint, as the floor moves it.
  const toward = sized.toward ?? 0;
  const him = at("a", 2);
  const away = Math.hypot(him.x - mid0.x, him.z - mid0.z) || 1;
  const centre = { x: mid0.x + ((him.x - mid0.x) / away) * toward, z: mid0.z + ((him.z - mid0.z) / away) * toward };
  return [1, 2, 3].map((beat) => {
    const selfB = at("a", beat), selfL = at("b", beat);
    const mk = (who: "beau" | "belle"): TouchHold => {
      const base = {
        width: hold.width, height: plan.hands[who].height, lateral: plan.hands[who].lateral,
        forward: 0, insideBeau: hold.insideBeau, insideBelle: hold.insideBelle, raised: 1,
      };
      if (broken && centred && overhead === OVER_CENTRE) {
        // The floor's break over the centre: reach from the held shoulder toward the join.
        const [m, self, heldX] = who === "beau" ? [bM, selfB, -hold.insideBeau] : [lM, selfL, hold.insideBelle];
        const c = Math.cos(self.yaw), sn = Math.sin(self.yaw);
        const e = breakEffort(
          { x: 0, y: 0, z: 0 }, m,
          { x: self.x + heldX * c + m.restZ * sn, y: m.rigOriginY + m.restY, z: self.z - heldX * sn + m.restZ * c },
          { x: centre.x, y: crownOf(lM) + headroom(bM, lM), z: centre.z },
        );
        return { ...base, height: e.y, forearmUp: true, over: { x: e.x, z: e.z, weight: 1 } };
      }
      return {
        ...base,
        ...(overhead === OVER_CENTRE && !broken ? { forearmUp: true } : {}),
        ...(centred && !broken ? { over: { ...centre, weight: 1 } } : {}),
      };
    };
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
      hisShoulderY: bM.rigOriginY + bM.restY, joinY: plan.hands.beau.height,
      hisForearmDeg: (Math.asin(pb.right.aimY) * 180) / Math.PI,
      hisElbowAboveShoulder: pb.right.y - bM.restY,
      accommodation: plan.accommodation, centreSized: sized.centre === true, unseated: sized.unseated === true,
      toward,
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
    // A break is not held over anything (2026-10-13) — its hands reach, and are not owed this.
    for (const r of walk(bs, ls, true)) {
      if (r.accommodation === BREAK) continue;
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

describe("🧪 sized over the centre: seat the gable, or break it (2026-10-13)", () => {
  // Ryan: *"if we can't accommodate with one of these then we'll just assign a break to those
  // pairings … the gable just won't connect, but shows a bit of effort towards it."*
  const WALKS = PAIRS.map(([name, bs, ls]) => [name, walk(bs, ls, true, 0, OVER_CENTRE)] as const);
  const seated = WALKS.filter(([, r]) => r[0]!.centreSized);
  const broken = WALKS.filter(([, r]) => r[0]!.unseated);

  it("🔑 every pairing is one or the other — nothing falls back to the old reshape", () => {
    expect(seated.length + broken.length).toBe(PAIRS.length);
  });

  it("🔑 seats these eight, and breaks every pairing with Ember or Myco as belle", () => {
    expect(seated.map(([name]) => name)).toEqual([
      "player/sprout", "ember/player", "ember/ryan", "ember/sprout",
      "ryan/player", "ryan/ryan", "ryan/sprout", "sprout/sprout",
    ]);
    for (const [name] of broken) expect(name).toMatch(/\/(player|myco|ember|ryan|sprout)$/);
    expect(broken.filter(([name]) => /\/(ember|myco)$/.test(name))).toHaveLength(10);
  });

  it.each(seated)("%s: the hands meet over the centre, and no arm is drawn stretched", (_n, r) => {
    for (const x of r) {
      expect(x.gapFlat, `beat ${String(x.beat)}`).toBeLessThan(0.12);
      // 🔴 Not zero: Ryan → Ryan's arm reads 0.16 at the midpoint and Ember → Ryan's 0.14.
      expect(x.hisStrain, `beat ${String(x.beat)}`).toBeLessThan(0.17);
      expect(x.herStrain, `beat ${String(x.beat)}`).toBeLessThan(0.15);
    }
  });

  it.each(broken)("%s: breaks — reaches toward the join, does not connect, does not stretch", (_n, r) => {
    for (const x of r) {
      expect(x.accommodation).toBe(BREAK);
      expect(x.gapFlat, `beat ${String(x.beat)}`).toBeGreaterThan(0.2);
      expect(x.hisStrain, `beat ${String(x.beat)}`).toBeLessThan(0.1);
      expect(x.herStrain, `beat ${String(x.beat)}`).toBeLessThan(0.1);
    }
  });

  it("🔴 you → Ember breaks — the cell the gable was being watched on", () => {
    // Her 0.44 head: a forearm leaning up into a join a palm over it crosses it, and a join high
    // enough to clear it is out of her own reach. Neither longer arms nor moving the join toward
    // him finds a seat (journal 2026-10-13 §8).
    expect(broken.map(([name]) => name)).toContain("player/ember");
  });
});
