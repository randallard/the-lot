import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  type ExpressionContext,
  resolveExpression,
  resolvedExpression,
} from "./expression-channels";
import { silhouetteMetrics, restClearance } from "./silhouette-limit";
import { armMetrics, armPose, gripBlend, restPose, type Placement } from "./arm-pose";
import { NEUTRAL_POSE, type ResolvedPose } from "../services/emotes";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  NPC_BODY_CENTER_Y,
} from "../services/body-shapes";

const myco = silhouetteMetrics(MYCO_DEFAULTS);
const ember = silhouetteMetrics(EMBER_DEFAULTS);
const restNeed = restClearance(myco, ember);

function pose(over: Partial<ResolvedPose> = {}): ResolvedPose {
  return { ...structuredClone(NEUTRAL_POSE), ...over };
}

function context(rp: ResolvedPose, separation: number): ExpressionContext {
  const self: Placement = { x: 0, z: 0, yaw: 0 };
  const partner: Placement = { x: separation, z: 0, yaw: Math.PI };
  return {
    pose: rp,
    shape: MYCO_DEFAULTS,
    bodyCenterY: NPC_BODY_CENTER_Y,
    silhouette: myco,
    partnerSilhouette: ember,
    restNeed,
    me: armMetrics(MYCO_DEFAULTS),
    them: armMetrics(EMBER_DEFAULTS),
    self,
    partner,
    blend: gripBlend(),
  };
}

function resolve(rp: ResolvedPose, separation = restNeed + 10) {
  return resolveExpression(resolvedExpression(MYCO_DEFAULTS), context(rp, separation));
}

describe("CHANNELS", () => {
  // The compiler already forces this — `Record<keyof ResolvedPose, Channel>` will not
  // accept a missing key. This is the belt to that braces: if the type is ever loosened,
  // an unclassified channel still fails here rather than silently reaching a dancer.
  it("classifies every channel of a ResolvedPose", () => {
    for (const key of Object.keys(NEUTRAL_POSE)) {
      expect(CHANNELS[key as keyof ResolvedPose]).toBeDefined();
    }
    expect(Object.keys(CHANNELS).sort()).toEqual(Object.keys(NEUTRAL_POSE).sort());
  });

  it("matches ADR-0010's table", () => {
    expect(CHANNELS.bodyDeltaRotY).toBe("owned");

    // limited exactly when it feeds `rigidParts` — the ADR's derivation rule
    expect(CHANNELS.bodyRadiusDelta).toBe("limited");
    expect(CHANNELS.bodyHeightDelta).toBe("limited");
    expect(CHANNELS.bodyLeanZ).toBe("limited");
    expect(CHANNELS.headRadiusDelta).toBe("limited");
    expect(CHANNELS.headOffsetX).toBe("limited");
    expect(CHANNELS.headOffsetY).toBe("limited");
    expect(CHANNELS.rightArm).toBe("limited");
    expect(CHANNELS.leftArm).toBe("limited");

    // free — forward/back is not lateral, and the rest has no spatial extent
    expect(CHANNELS.bodyLeanX).toBe("free");
    expect(CHANNELS.headOffsetZ).toBe("free");
    expect(CHANNELS.bodyDeltaY).toBe("free");
    expect(CHANNELS.headDeltaRotation).toBe("free");
    expect(CHANNELS.eyeOverride).toBe("free");
    expect(CHANNELS.activeEffects).toBe("free");
  });
});

describe("resolveExpression", () => {
  it("🔴 hangs an un-emoting arm where the body says its elbow rests", () => {
    // Ryan, 2026-08-18, looking at the standing couple: *"verify that the other forearm is set
    // by the character customization - they seem really high."* It was not and they were.
    //
    // An `ArmPose` names the **elbow** (ADR-0017). The proposal wrote the *shoulder* into it,
    // giving every arm this layer proposes a zero-length upper arm — the drawn forearm hung
    // from the shoulder, one whole `elbowReach` (0.330 on Myco) above where the body puts it,
    // and the belle's free hand came out *above* the couple's joined hands.
    //
    // `restPose` is the statement of what a resting arm is, and this is the assertion that the
    // dance actually goes through it: `resolveExpression` always builds a proposal, even with
    // no emote, so `poseArms`' own `restPose` fallback is never reached from a dance floor.
    const me = armMetrics(MYCO_DEFAULTS);
    const resting = resolve(pose());
    for (const [side, sign] of [
      ["left", 1],
      ["right", -1],
    ] as const) {
      const want = restPose(armPose(), me, sign);
      const got = resting.arms[side];
      expect(got.y).toBeCloseTo(want.y, 12);
      expect(got.y).toBeCloseTo(me.restY - me.elbowReach, 12);
      expect(got.x).toBeCloseTo(want.x, 12);
      expect(got.z).toBeCloseTo(want.z, 12);
      expect([got.aimX, got.aimY, got.aimZ]).toEqual([want.aimX, want.aimY, want.aimZ]);
    }
  });

  it("swings the elbow about the shoulder, not the forearm about the elbow", () => {
    // The general case of the same statement: an emote's `upperArmRotation` turns the whole
    // arm about a **pinned** shoulder, so the elbow travels on a sphere of radius `elbowReach`
    // and the forearm aims on down the same line. Raising the arm 90° out to the side puts the
    // elbow beside the shoulder at exactly that radius — not at the shoulder with a forearm
    // sticking out of it.
    const me = armMetrics(MYCO_DEFAULTS);
    const raised = resolve(pose({ leftArm: { upperArmRotation: [0, 0, 90], forearmRotation: [0, 0, 0], handRotation: [0, 0, 0] } }));
    // Emote arm names are viewer-mirrored: `leftArm` is the dancer's anatomical right.
    const arm = raised.arms.right;
    const dx = arm.x - -me.restX;
    const dy = arm.y - me.restY;
    expect(Math.hypot(dx, dy, arm.z)).toBeCloseTo(me.elbowReach, 12);
    expect(Math.abs(dy)).toBeLessThan(1e-9);
  });

  it("🔴 reports the shoulders as well as the head, because a torso carries both", () => {
    // A shoulder is `bodyCenterY + height/2 + radius`, so anything that changes a body's
    // height moves the shoulders that hang off it. Only `headY` was being reported, so the
    // body mesh scaled and the head group followed while the arms stayed at the height the
    // shape had at mount — **every emote with a `bodyHeightDelta` has been detaching arms
    // from torsos since the channel was wired up.** It took `arch.ts`, which changes a torso
    // on purpose, for anybody to look at it.
    const still = resolve(pose());
    expect(still.shoulderY).toBeCloseTo(armMetrics(MYCO_DEFAULTS).restY, 12);

    // Grown by `d`, both move by exactly `d/2` — a capsule grows about its own centre.
    const d = 0.4;
    const grown = resolve(pose({ bodyHeightDelta: d }));
    expect(grown.shoulderY - still.shoulderY).toBeCloseTo(d / 2, 9);
    expect(grown.headY - still.headY).toBeCloseTo(d / 2, 9);
    // Same number, which is the point: they are one rigid assembly and were being drawn
    // as two.
    expect(grown.shoulderY - still.shoulderY).toBeCloseTo(grown.headY - still.headY, 12);
  });

  it("drops an owned channel — a spin cannot reach a driven dancer", () => {
    const still = resolve(pose());
    const spinning = resolve(pose({ bodyDeltaRotY: 360 }));

    // Nothing a spin sets can survive: there is no field on the result to carry it.
    expect(spinning.shape).toEqual(still.shape);
    expect(spinning.headY).toBe(still.headY);
    expect(spinning.shoulderY).toBe(still.shoulderY);
    expect(spinning.bodyDeltaY).toBe(still.bodyDeltaY);
    expect(spinning.headRotation).toEqual(still.headRotation);
    expect(spinning.silhouetteKept).toBe(still.silhouetteKept);
  });

  it("passes free channels through untouched, even in the tightest square", () => {
    const rp = pose({
      bodyDeltaY: 0.4,
      bodyLeanX: 15,
      headOffsetZ: 0.2,
      headDeltaRotation: [0, 70, 0],
    });
    const tight = resolve(rp, restNeed);

    expect(tight.bodyDeltaY).toBe(0.4);
    expect(tight.headRotation).toEqual([0, 70, 0]);
    expect(tight.shape.body.leanX).toBeCloseTo(MYCO_DEFAULTS.body.leanX + 15, 12);
    expect(tight.shape.head.offsetZ).toBeCloseTo(MYCO_DEFAULTS.head.offsetZ + 0.2, 12);
  });

  it("plays a limited channel in full when there is room", () => {
    const clear = resolve(pose({ bodyRadiusDelta: 0.25 }), restNeed + 10);
    expect(clear.silhouetteKept).toBe(1);
    expect(clear.shape.body.radius).toBeCloseTo(MYCO_DEFAULTS.body.radius + 0.25, 12);
  });

  it("clips a limited channel when there is not", () => {
    const tight = resolve(pose({ bodyRadiusDelta: 0.25 }), restNeed);
    expect(tight.silhouetteKept).toBe(0);
    expect(tight.shape.body.radius).toBeCloseTo(MYCO_DEFAULTS.body.radius, 12);
  });

  it("recomputes head height, because a grown body lifts the head", () => {
    const rest = resolve(pose());
    const taller = resolve(pose({ bodyHeightDelta: 0.4 }), restNeed + 10);
    expect(taller.headY).toBeGreaterThan(rest.headY);
  });

  it("poses both arms from the emote's proposal", () => {
    const rp = pose();
    rp.rightArm.upperArmRotation = [0, 0, 85];
    rp.leftArm.upperArmRotation = [0, 0, -85];
    const wide = resolve(rp);
    const hanging = resolve(pose());

    // Wide arms aim outward; a resting arm hangs straight down.
    expect(hanging.arms.left.aimY).toBeCloseTo(-1, 6);
    expect(wide.arms.left.aimY).toBeGreaterThan(hanging.arms.left.aimY);
    expect(wide.arms.right.aimY).toBeGreaterThan(hanging.arms.right.aimY);
  });

  it("reuses its output object rather than allocating per frame", () => {
    const out = resolvedExpression(MYCO_DEFAULTS);
    const arms = out.arms;
    const again = resolveExpression(out, context(pose(), restNeed + 10));
    expect(again).toBe(out);
    expect(again.arms).toBe(arms);
  });

  it("does not mutate the emote's pose", () => {
    const rp = pose({ bodyRadiusDelta: 0.25, bodyLeanZ: 20, bodyDeltaRotY: 360 });
    resolve(rp, restNeed);
    expect(rp.bodyRadiusDelta).toBe(0.25);
    expect(rp.bodyLeanZ).toBe(20);
    expect(rp.bodyDeltaRotY).toBe(360);
  });
});
