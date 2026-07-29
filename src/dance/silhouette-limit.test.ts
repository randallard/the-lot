import { describe, expect, it } from "vitest";
import {
  clipSilhouette,
  inflatedParts,
  restClearance,
  silhouetteAllowance,
  silhouetteClip,
  silhouetteMetrics,
  silhouetteNeed,
} from "./silhouette-limit";
import { NEUTRAL_POSE, type ResolvedPose } from "../services/emotes";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  NPC_BODY_CENTER_Y,
  rigidParts,
} from "../services/body-shapes";

function pose(over: Partial<ResolvedPose> = {}): ResolvedPose {
  return { ...structuredClone(NEUTRAL_POSE), ...over };
}

/** A pose that inflates every `limited` channel at once. */
function puffed(): ResolvedPose {
  return pose({
    bodyRadiusDelta: 0.25,
    bodyHeightDelta: 0.3,
    bodyLeanZ: 20,
    headRadiusDelta: 0.2,
    headOffsetX: 0.15,
    headOffsetY: 0.1,
  });
}

const myco = silhouetteMetrics(MYCO_DEFAULTS);
const ember = silhouetteMetrics(EMBER_DEFAULTS);
const restNeed = restClearance(myco, ember);

describe("inflatedParts", () => {
  // The formula is restated from `rigidParts` so the frame loop can build it without
  // allocating. This is what stops the two drifting apart.
  it("reproduces rigidParts exactly at k = 0", () => {
    for (const shape of [MYCO_DEFAULTS, EMBER_DEFAULTS]) {
      const m = silhouetteMetrics(shape);
      const got = inflatedParts(m, puffed(), 0);
      const want = rigidParts(shape, NPC_BODY_CENTER_Y);
      expect(got.length).toBe(want.length);
      got.forEach((p, i) => {
        expect(p.radius).toBeCloseTo(want[i]!.radius, 12);
        expect(p.y0).toBeCloseTo(want[i]!.y0, 12);
        expect(p.y1).toBeCloseTo(want[i]!.y1, 12);
      });
    }
  });

  it("reproduces rigidParts at any k when the pose is neutral", () => {
    const got = inflatedParts(myco, pose(), 1);
    const want = rigidParts(MYCO_DEFAULTS, NPC_BODY_CENTER_Y);
    got.forEach((p, i) => {
      expect(p.radius).toBeCloseTo(want[i]!.radius, 12);
    });
  });

  it("grows the body radius, the sideways lean and the head together", () => {
    const base = rigidParts(MYCO_DEFAULTS, NPC_BODY_CENTER_Y);
    const full = inflatedParts(myco, puffed(), 1);
    expect(full[0]!.radius).toBeGreaterThan(base[0]!.radius);
    expect(full[1]!.radius).toBeGreaterThan(base[1]!.radius);
  });

  it("lifts the head when the body grows underneath it", () => {
    const base = rigidParts(MYCO_DEFAULTS, NPC_BODY_CENTER_Y);
    const taller = inflatedParts(myco, pose({ bodyHeightDelta: 0.4 }), 1);
    expect(taller[1]!.y0).toBeGreaterThan(base[1]!.y0);
  });

  it("counts a sideways lean but not a forward one", () => {
    const sideways = inflatedParts(myco, pose({ bodyLeanZ: 30 }), 1)[0]!.radius;
    const forward = inflatedParts(myco, pose({ bodyLeanX: 30 }), 1)[0]!.radius;
    const rest = rigidParts(MYCO_DEFAULTS, NPC_BODY_CENTER_Y)[0]!.radius;
    expect(sideways).toBeGreaterThan(rest);
    expect(forward).toBeCloseTo(rest, 12);
  });
});

describe("silhouetteAllowance", () => {
  it("is zero when the pair is already as close as their resting shapes allow", () => {
    expect(silhouetteAllowance(0.3, 0.22, restNeed, restNeed)).toBe(0);
    expect(silhouetteAllowance(0.3, 0.22, restNeed - 0.5, restNeed)).toBe(0);
  });

  it("splits the slack by body radius, and the two shares sum to it", () => {
    const separation = restNeed + 1;
    const mine = silhouetteAllowance(0.3, 0.22, separation, restNeed);
    const theirs = silhouetteAllowance(0.22, 0.3, separation, restNeed);
    expect(mine + theirs).toBeCloseTo(1, 12);
    expect(mine).toBeGreaterThan(theirs); // the wider dancer gets the wider share
  });

  it("splits evenly between two dancers of no width", () => {
    expect(silhouetteAllowance(0, 0, restNeed + 1, restNeed)).toBeCloseTo(0.5, 12);
  });
});

describe("silhouetteClip", () => {
  const far = restNeed + 10;
  const touching = restNeed;

  it("passes an emote through untouched when there is room", () => {
    const allowance = silhouetteAllowance(0.3, 0.22, far, restNeed);
    expect(silhouetteClip(myco, puffed(), ember.baseParts, restNeed, allowance)).toBe(1);
  });

  it("passes a neutral pose through at any distance", () => {
    expect(silhouetteClip(myco, pose(), ember.baseParts, restNeed, 0)).toBe(1);
  });

  it("never limits an emote that makes a dancer smaller", () => {
    const shrunk = pose({
      bodyRadiusDelta: -0.1,
      bodyHeightDelta: -0.1,
      headRadiusDelta: -0.1,
    });
    expect(silhouetteClip(myco, shrunk, ember.baseParts, restNeed, 0)).toBe(1);
  });

  it("drops the whole inflation at the tightest moment of the tightest pass", () => {
    const allowance = silhouetteAllowance(0.3, 0.22, touching, restNeed);
    expect(silhouetteClip(myco, puffed(), ember.baseParts, restNeed, allowance)).toBe(0);
  });

  it("clips partially in between, keeping more the further apart they are", () => {
    const near = restNeed + 0.05;
    const mid = restNeed + 0.15;
    const kNear = silhouetteClip(
      myco, puffed(), ember.baseParts, restNeed,
      silhouetteAllowance(0.3, 0.22, near, restNeed),
    );
    const kMid = silhouetteClip(
      myco, puffed(), ember.baseParts, restNeed,
      silhouetteAllowance(0.3, 0.22, mid, restNeed),
    );
    expect(kNear).toBeGreaterThan(0);
    expect(kNear).toBeLessThan(1);
    expect(kMid).toBeGreaterThan(kNear);
    expect(kMid).toBeLessThan(1);
  });

  // The property the whole module exists for: whatever the emote asks for, what is
  // left of it fits in the room this dancer actually has.
  it("never leaves a dancer needing more room than they are allowed", () => {
    for (let steps = 0; steps <= 40; steps++) {
      const separation = restNeed + steps * 0.02;
      const allowance = silhouetteAllowance(0.3, 0.22, separation, restNeed);
      const k = silhouetteClip(myco, puffed(), ember.baseParts, restNeed, allowance);
      const need = silhouetteNeed(myco, puffed(), ember.baseParts, k) - restNeed;
      expect(need).toBeLessThanOrEqual(allowance + 1e-9);
    }
  });

  it("holds for the mirrored pair too — the other dancer's share is their own", () => {
    for (let steps = 0; steps <= 40; steps++) {
      const separation = restNeed + steps * 0.02;
      const allowance = silhouetteAllowance(0.22, 0.3, separation, restNeed);
      const k = silhouetteClip(ember, puffed(), myco.baseParts, restNeed, allowance);
      const need = silhouetteNeed(ember, puffed(), myco.baseParts, k) - restNeed;
      expect(need).toBeLessThanOrEqual(allowance + 1e-9);
    }
  });

  it("leaves the pair clear at every point of a closing pass", () => {
    // Both dancers puffing at once, walking in from clear to touching: the sum of what
    // they take can never exceed the room between them.
    for (let steps = 0; steps <= 40; steps++) {
      const separation = restNeed + steps * 0.02;
      const kA = silhouetteClip(
        myco, puffed(), ember.baseParts, restNeed,
        silhouetteAllowance(0.3, 0.22, separation, restNeed),
      );
      const kB = silhouetteClip(
        ember, puffed(), myco.baseParts, restNeed,
        silhouetteAllowance(0.22, 0.3, separation, restNeed),
      );
      const needed = silhouetteNeed(
        myco, puffed(), inflatedParts(ember, puffed(), kB).map((p) => ({ ...p })), kA,
      );
      expect(needed).toBeLessThanOrEqual(separation + 1e-9);
    }
  });
});

describe("clipSilhouette", () => {
  const out = structuredClone(NEUTRAL_POSE);

  it("scales every limited channel and no other", () => {
    const rp = puffed();
    rp.bodyDeltaY = 0.4;
    rp.bodyLeanX = 12;
    rp.headOffsetZ = 0.2;
    rp.bodyDeltaRotY = 180;
    rp.headDeltaRotation = [5, 90, 3];

    const got = clipSilhouette(out, rp, 0.5);

    // limited — halved
    expect(got.bodyRadiusDelta).toBeCloseTo(0.125, 12);
    expect(got.bodyHeightDelta).toBeCloseTo(0.15, 12);
    expect(got.bodyLeanZ).toBeCloseTo(10, 12);
    expect(got.headRadiusDelta).toBeCloseTo(0.1, 12);
    expect(got.headOffsetX).toBeCloseTo(0.075, 12);
    expect(got.headOffsetY).toBeCloseTo(0.05, 12);

    // free — untouched
    expect(got.bodyDeltaY).toBe(0.4);
    expect(got.bodyLeanX).toBe(12);
    expect(got.headOffsetZ).toBe(0.2);
    expect(got.headDeltaRotation).toEqual([5, 90, 3]);

    // owned — carried faithfully; the dance driver simply never reads it
    expect(got.bodyDeltaRotY).toBe(180);
  });

  it("is a no-op on the pose at k = 1", () => {
    const rp = puffed();
    const got = clipSilhouette(out, rp, 1);
    expect(got.bodyRadiusDelta).toBeCloseTo(rp.bodyRadiusDelta, 12);
    expect(got.bodyLeanZ).toBeCloseTo(rp.bodyLeanZ, 12);
    expect(got.headOffsetY).toBeCloseTo(rp.headOffsetY, 12);
  });

  it("does not mutate the pose it reads", () => {
    const rp = puffed();
    clipSilhouette(out, rp, 0.25);
    expect(rp.bodyRadiusDelta).toBe(0.25);
    expect(rp.bodyLeanZ).toBe(20);
  });
});
