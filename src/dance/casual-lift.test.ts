import { describe, expect, it } from "vitest";
import {
  CASUAL_FOREARM_LIFT, armMetrics, armPoses, gripBlend, poseArms, touchHold, type Placement,
} from "./arm-pose";
import {
  EMBER_DEFAULTS, MYCO_DEFAULTS, PLAYER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";

/**
 * 🧪 **The casual break bends at the elbow and nowhere else** (2026-10-13, undecided) —
 * `TouchHold.lift`.
 *
 * Ryan: *"here's how I'd do the move if my elbow was frozen in place and I know I have to bring
 * it back here for the standing couple anyway but my wrist and hand move just fine, and the
 * elbow bends."* The first casual pose aimed the hand at a point over the shoulder and let the
 * two-link solve find an elbow; with a forearm longer than the upper arm that point was too
 * close to fold onto, and the player's elbow came up **above his own shoulder** (0.957 against
 * 0.910) with the forearm pointing 23° down.
 */
const CAST: readonly (readonly [string, CharacterBodyShape])[] = [
  ["player", PLAYER_DEFAULTS], ["myco", MYCO_DEFAULTS], ["ember", EMBER_DEFAULTS],
  ["ryan", RYAN_DEFAULTS], ["sprout", SPROUT_DEFAULTS],
];
const PAIRS = CAST.flatMap(([bn, bs]) => CAST.map(([ln, ls]) => [`${bn}/${ln}`, bs, ls] as const));

function pose(bs: CharacterBodyShape, ls: CharacterBodyShape, lift: number | undefined, partner: Placement) {
  const b = armMetrics(bs), l = armMetrics(ls);
  const hold = touchHold(b, l);
  const self: Placement = { x: 0, z: 0, yaw: 0 };
  const out = armPoses();
  poseArms(out, b, l, self, partner, gripBlend(), undefined, lift === undefined ? hold : { ...hold, lift }, "right");
  return { pose: out.right, hold };
}

describe("🧪 a casual forearm lifts from a frozen elbow", () => {
  it.each(PAIRS)("%s: the elbow is the standing hold's, and only the forearm turns", (_n, bs, ls) => {
    const width = touchHold(armMetrics(bs), armMetrics(ls)).width;
    // The beau's partner stands on his right (`−x`) in a standing couple.
    const beside: Placement = { x: -width, z: 0, yaw: 0 };
    const standing = pose(bs, ls, undefined, beside).pose;
    const lifted = pose(bs, ls, 1, beside).pose;
    expect(lifted.x).toBeCloseTo(standing.x, 9);
    expect(lifted.y).toBeCloseTo(standing.y, 9);
    expect(lifted.z).toBeCloseTo(standing.z, 9);
    expect(Math.asin(lifted.aimY)).toBeCloseTo(CASUAL_FOREARM_LIFT, 9);
    // Same heading, forward and in, as the standing forearm had.
    expect(Math.atan2(lifted.aimX, lifted.aimZ)).toBeCloseTo(Math.atan2(standing.aimX, standing.aimZ), 9);
  });

  it.each(PAIRS)("%s: and it stays frozen while the partner walks round behind", (_n, bs, ls) => {
    const width = touchHold(armMetrics(bs), armMetrics(ls)).width;
    const a = pose(bs, ls, 1, { x: -width, z: 0, yaw: 0 }).pose;
    const b = pose(bs, ls, 1, { x: 0.3, z: -width, yaw: Math.PI }).pose;
    expect([b.x, b.y, b.z, b.aimX, b.aimY, b.aimZ]).toEqual([a.x, a.y, a.z, a.aimX, a.aimY, a.aimZ]);
  });

  it("🔑 the player's elbow no longer rides above his shoulder", () => {
    const m = armMetrics(PLAYER_DEFAULTS);
    const { pose: p } = pose(PLAYER_DEFAULTS, EMBER_DEFAULTS, 1, { x: 0.3, z: -0.5, yaw: Math.PI });
    expect(p.y).toBeLessThan(m.restY);
    expect(p.aimY).toBeGreaterThan(0);
  });

  it("lift 0 is the standing hold exactly", () => {
    const width = touchHold(armMetrics(PLAYER_DEFAULTS), armMetrics(EMBER_DEFAULTS)).width;
    const beside: Placement = { x: -width, z: 0, yaw: 0 };
    const a = pose(PLAYER_DEFAULTS, EMBER_DEFAULTS, undefined, beside).pose;
    const b = pose(PLAYER_DEFAULTS, EMBER_DEFAULTS, 0, beside).pose;
    expect([b.x, b.y, b.z, b.aimX, b.aimY, b.aimZ].map((v) => v.toFixed(9)))
      .toEqual([a.x, a.y, a.z, a.aimX, a.aimY, a.aimZ].map((v) => v.toFixed(9)));
  });
});
