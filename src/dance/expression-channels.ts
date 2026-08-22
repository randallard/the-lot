/**
 * The one place [ADR-0010](../../docs/adr/0010-emote-choreography-channel-contract.md)'s
 * blend contract is decided — its **policy**, as opposed to its mechanisms.
 *
 * The ADR asked for one resolver rather than scattered conditionals, and the reason is
 * narrower than tidiness. Its fail-safe rule is that **an unclassified channel is owned**:
 * a field nobody has thought about must be dropped for a driven dancer rather than played
 * blind. While the arbitration was spread across the driver's frame loop, that rule held
 * only because nobody had wired the new field up — an omission, which is to say an
 * accident. It is worth remembering that the same accident is what let the silhouette
 * channels sit unapplied for a day while an accepted ADR said otherwise.
 *
 * Two things make it structural here instead:
 *
 * 1. **{@link CHANNELS} is `Record<keyof ResolvedPose, Channel>`.** Add a field to
 *    `ResolvedPose` and this file stops compiling until someone classifies it. The
 *    contract cannot silently fall behind the type it governs.
 * 2. **{@link ResolvedExpression} has nowhere to put an owned channel.** The driver writes
 *    rigs from the resolver's output and never from the emote's pose, so an owned channel
 *    is not "remembered to be skipped" — there is no field to carry it through.
 *
 * The mechanisms stay where they are and stay separately testable: `arm-pose.ts` folds and
 * grips arms, `silhouette-limit.ts` clips shape. This module decides *which* applies to
 * what, and is the file to read to know what the contract currently says.
 */

import * as THREE from "three";
import {
  type ArmMetrics,
  type ArmPoses,
  type TouchHold,
  type GripBlend,
  type Placement,
  armPoses,
  poseArms,
} from "./arm-pose";
import {
  type SilhouetteMetrics,
  clipSilhouette,
  silhouetteAllowance,
  silhouetteClip,
} from "./silhouette-limit";
import { NEUTRAL_POSE, mergeAnimation, type ResolvedPose } from "../services/emotes";
import {
  type CharacterBodyShape,
  computePositions,
  deg2rad,
} from "../services/body-shapes";

const SIDES = ["left", "right"] as const;
const DOWN = new THREE.Vector3(0, -1, 0);

// ---------------------------------------------------------------------------
// The contract

export type Channel = "owned" | "limited" | "free";

/**
 * ADR-0010's table, as code.
 *
 * Typed as a total `Record` over `ResolvedPose` deliberately: this is the compile-time
 * half of the ADR's fail-safe rule, and the reason a new expression channel cannot reach a
 * dancer before someone has decided what it is.
 *
 * **`limited` when it feeds `rigidParts`** — the ADR's derivation. Anything an emote can
 * change that ADR-0012 measured the square's spacing from can invalidate that spacing.
 *
 * The one entry that is conditional: an arm is `limited` — folded only where it trespasses
 * — until the engine engages its grip, at which point that hand is `owned` outright for as
 * long as it is held. A hand holding someone has somewhere it must be. `poseArms` resolves
 * that transition; the table records the arm's resting kind.
 */
export const CHANNELS: Readonly<Record<keyof ResolvedPose, Channel>> = {
  // owned — the choreography's, and never read from the emote
  bodyDeltaRotY: "owned",

  // limited — clipped by whatever trespasses
  rightArm: "limited",
  leftArm: "limited",
  bodyRadiusDelta: "limited",
  bodyHeightDelta: "limited",
  bodyLeanZ: "limited",
  headRadiusDelta: "limited",
  headOffsetX: "limited",
  headOffsetY: "limited",

  // free — the emote's outright
  bodyDeltaY: "free",
  bodyLeanX: "free",
  headDeltaRotation: "free",
  headOffsetZ: "free",
  eyeOverride: "free",
  activeEffects: "free",
};

// ---------------------------------------------------------------------------
// Resolution

/**
 * Everything the resolver needs about one dancer this frame. Mutated in place by the
 * caller rather than rebuilt, so a frame allocates nothing (ADR-0002's idiom).
 */
export interface ExpressionContext {
  /** The emote's proposal. Read only — never the thing a rig is written from. */
  pose: ResolvedPose;
  shape: CharacterBodyShape;
  bodyCenterY: number;
  silhouette: SilhouetteMetrics;
  partnerSilhouette: SilhouetteMetrics;
  /** What this pair needs at rest — the ADR-0012 number. */
  restNeed: number;
  me: ArmMetrics;
  them: ArmMetrics;
  self: Placement;
  partner: Placement;
  blend: GripBlend;
  /**
   * The pair's solved handhold, when these two are a couple rather than a facing pair —
   * its `width` is the couple's own standing width. `undefined` for a facing pair, and
   * then no hands are joined.
   */
  hold?: TouchHold | undefined;
  /**
   * Whether the **figure** says these two are holding hands, rather than their placements.
   *
   * `true` for square-one's `arch` spans, whose pair close to half their standing width and
   * finish facing opposite ways — placements that `standingAsCouple` reads as "not a couple"
   * for most of a call whose hands never come apart.
   */
  declaredHold?: boolean | undefined;
  /**
   * The world height this dancer's joined forearm sits at, when the pair's hold has been
   * planned. Passed straight through to `poseArms` — see there (ADR-0033).
   */
  forearmY?: number | undefined;
}

/**
 * What a driven dancer is actually allowed to be this frame.
 *
 * **There is deliberately no field here for an owned channel.** That is the runtime half of
 * the fail-safe: a driver writing rigs from this object cannot express a spin it should
 * have dropped, because there is nowhere to put one.
 */
export interface ResolvedExpression {
  /** Arms, already folded and gripped — write straight onto the arm rigs. */
  arms: ArmPoses;
  /** The dancer's shape with its `limited` channels clipped in. */
  shape: CharacterBodyShape;
  /** Head-sphere centre for {@link shape} — recomputed, because a grown body lifts it. */
  headY: number;
  /**
   * Shoulder height for {@link shape} — recomputed, for the same reason and it was missing.
   *
   * A grown body lifts the shoulders exactly as it lifts the head, and only the head was
   * being told. See `DancerExpressionRigs.shoulders`: this is a derivation the driver writes
   * onto the pinned shoulder groups, never a pose, and ADR-0017 is untouched by it.
   */
  shoulderY: number;
  /** The bob. */
  bodyDeltaY: number;
  /** Head turn in degrees — the emote's alone; a dancer does not wear caricature. */
  headRotation: readonly [number, number, number];
  /** How much of the silhouette survived, 0–1. For the debug readout. */
  silhouetteKept: number;
}

export function resolvedExpression(shape: CharacterBodyShape): ResolvedExpression {
  return {
    arms: armPoses(),
    shape,
    headY: 0,
    shoulderY: 0,
    bodyDeltaY: 0,
    headRotation: [0, 0, 0],
    silhouetteKept: 1,
  };
}

const _proposed = armPoses();
const _euler = new THREE.Euler();
const _swing = new THREE.Vector3();
const _clipped: ResolvedPose = structuredClone(NEUTRAL_POSE);

/**
 * The expression layer's arms, restated as poses the dance layer can reason about.
 *
 * An emote gives an arm a *rotation* about the shoulder; the dance layer works in where
 * the arm ends up. So this is a change of description, not of pose: the rotation is applied
 * to the resting hang, and **both ends of the arm follow it** — the elbow swings on a sphere
 * of radius `elbowReach` about the pinned shoulder, and the forearm aims on down the same
 * line (ADR-0017's straight arm). At zero rotation that is exactly `restPose`.
 *
 * Emote arm names are viewer-mirrored: they were authored against the player rig, where
 * "left" is the group at −x, and −x is a dancer's anatomical *right*.
 */
function proposeArms(out: ArmPoses, m: ArmMetrics, rp: ResolvedPose): ArmPoses {
  for (const side of SIDES) {
    const sign = side === "left" ? 1 : -1;
    const from = side === "left" ? rp.rightArm : rp.leftArm;
    const target = out[side];
    _euler.set(
      deg2rad(from.upperArmRotation[0]),
      deg2rad(from.upperArmRotation[1]),
      deg2rad(from.upperArmRotation[2]),
    );
    _swing.copy(DOWN).applyEuler(_euler);
    // 🔴 The elbow is `elbowReach` **down the swing from the shoulder**, not at the shoulder.
    // An `ArmPose` names the elbow (ADR-0017); writing the shoulder into it gave every arm
    // this layer proposes a zero-length upper arm, which hung the drawn forearm from the
    // shoulder itself — the whole free arm one upper-arm too high, 0.330 on the shipped cast,
    // and the belle's free hand ending up *above* the couple's joined hands.
    //
    // Reduces to `restPose` exactly when the rotation is zero, which is what every dancer
    // without an emote gets: `resolveExpression` always calls this, so this — not `restPose`
    // — is the path a resting dance arm actually takes.
    target.x = sign * m.restX + _swing.x * m.elbowReach;
    target.y = m.restY + _swing.y * m.elbowReach;
    target.z = _swing.z * m.elbowReach;
    target.aimX = _swing.x;
    target.aimY = _swing.y;
    target.aimZ = _swing.z;
  }
  return out;
}

/**
 * Apply the contract to one dancer. Mutates and returns `out`.
 *
 * Reads `ctx.pose` in exactly three ways, one per channel kind — pass it to a mechanism
 * that limits it, copy it straight across, or ignore it. Nothing else in `src/dance/`
 * should be reading a `ResolvedPose` at all.
 */
export function resolveExpression(
  out: ResolvedExpression,
  ctx: ExpressionContext,
): ResolvedExpression {
  const { pose, me, them, self, partner, blend, hold, declaredHold, forearmY } = ctx;

  // limited — arms fold where they trespass, and a gripped hand is taken over entirely
  out.arms = poseArms(
    out.arms,
    me,
    them,
    self,
    partner,
    blend,
    proposeArms(_proposed, me, pose),
    hold,
    declaredHold ?? false,
    forearmY,
  );

  // limited — shape is clipped to this dancer's share of the live slack
  const separation = Math.hypot(partner.x - self.x, partner.z - self.z);
  const kept = silhouetteClip(
    ctx.silhouette,
    pose,
    ctx.partnerSilhouette.baseParts,
    ctx.restNeed,
    silhouetteAllowance(me.bodyRadius, them.bodyRadius, separation, ctx.restNeed),
  );
  out.silhouetteKept = kept;

  // Merged through the same helpers the player uses, so a dancer and a free-roaming
  // character resolve an emote's shape identically.
  out.shape = mergeAnimation(ctx.shape, clipSilhouette(_clipped, pose, kept));
  // Both from the same call: a body's height sets its head *and* its shoulders, and drawing
  // one without the other is what detached every arm from every grown torso.
  const positions = computePositions(out.shape, ctx.bodyCenterY);
  out.headY = positions.headY;
  out.shoulderY = positions.shoulderY;

  // free — straight through
  out.bodyDeltaY = pose.bodyDeltaY;
  out.headRotation = pose.headDeltaRotation;

  // owned — deliberately absent. `bodyDeltaRotY` is not dropped by remembering to skip
  // it; there is no field on `ResolvedExpression` that could carry it.

  return out;
}
