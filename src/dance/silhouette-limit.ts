/**
 * The `limited` silhouette channels of
 * [ADR-0010](../../docs/adr/0010-emote-choreography-channel-contract.md), enforced.
 *
 * An emote may change a dancer's *shape* — inhale, stretch, grow a head, lean sideways.
 * ADR-0012 sizes the square from the rigid silhouette and measures it **once at mount**,
 * so every one of those channels can invalidate the spacing the whole formation was built
 * on. That is the ADR's derivation rule verbatim: a channel is `limited` exactly when it
 * feeds `rigidParts`.
 *
 * The model is the arm envelope's, because the problem is the same one: a dancer may use
 * their **proportional share of the live slack** — the room between what the pair needs at
 * rest and what they actually have this frame — split by body radius, exactly as
 * `reachAllowance` splits the gap for arms. Inside that share the emote plays untouched;
 * beyond it, it is clipped back to fit.
 *
 * Two properties worth stating, both inherited from the arm envelope and both deliberate:
 *
 * - **Zero cost when there is room.** A dancer alone on their side of the floor has slack
 *   far exceeding anything an emote asks for, so the first test passes and the pose goes
 *   through unmodified. Nobody deflates for a pass that isn't happening.
 * - **Shrinking is never limited.** The limit is on *trespass*, not on change. An emote
 *   that makes a dancer smaller cannot break a formation, so it is never clipped, however
 *   tight the square.
 */

import {
  type CharacterBodyShape,
  type RigidPart,
  NPC_BODY_CENTER_Y,
  computePositions,
  deg2rad,
  lateralClearance,
  rigidParts,
} from "../services/body-shapes";
import type { ResolvedPose } from "../services/emotes";

/**
 * Bisection steps once a dancer is found to be trespassing. 12 resolves the surviving
 * fraction to about 1/4000 of the emote — far below anything a body can show — and only
 * runs on the frames where an emote is actually being clipped. See {@link silhouetteClip}.
 */
const REFINE_PASSES = 12;

/** `RigidPart` while it is being written. Structurally assignable to the readonly form. */
interface MutablePart {
  y0: number;
  y1: number;
  radius: number;
}

/** Scratch, mutated in place every frame — the ADR-0002 idiom. */
const _inflated: MutablePart[] = [
  { y0: 0, y1: 0, radius: 0 },
  { y0: 0, y1: 0, radius: 0 },
];

/**
 * A dancer's resting silhouette, resolved once at mount.
 *
 * `headBodyGap` is stored rather than read from `layout` so the inflated head height can
 * be rebuilt without depending on how `computePositions` stacks a body — the head rides on
 * top of the torso, so growing the body's radius or height lifts it.
 */
export interface SilhouetteMetrics {
  readonly shape: CharacterBodyShape;
  readonly bodyCenterY: number;
  readonly baseParts: readonly RigidPart[];
  readonly bodyRadius: number;
  readonly headBodyGap: number;
}

export function silhouetteMetrics(
  shape: CharacterBodyShape,
  bodyCenterY: number = NPC_BODY_CENTER_Y,
): SilhouetteMetrics {
  const bodyTop = bodyCenterY + shape.body.height / 2 + shape.body.radius;
  return {
    shape,
    bodyCenterY,
    baseParts: rigidParts(shape, bodyCenterY),
    bodyRadius: shape.body.radius,
    headBodyGap: computePositions(shape, bodyCenterY).headY - bodyTop - shape.head.radius,
  };
}

/**
 * This dancer's silhouette with `k` of their emote's shape channels applied.
 *
 * Mirrors `rigidParts` term for term — the zero-`k` case is asserted equal to it in the
 * tests, which is what keeps the two from drifting apart.
 */
export function inflatedParts(
  m: SilhouetteMetrics,
  rp: ResolvedPose,
  k: number,
): readonly RigidPart[] {
  const { head, body } = m.shape;
  const height = body.height + k * rp.bodyHeightDelta;
  const radius = body.radius + k * rp.bodyRadiusDelta;
  const leanZ = body.leanZ + k * rp.bodyLeanZ;
  const headRadius = head.radius + k * rp.headRadiusDelta;

  const bodyTop = m.bodyCenterY + height / 2 + radius;
  const headCenterY =
    bodyTop + m.headBodyGap + headRadius + head.offsetY + k * rp.headOffsetY;

  _inflated[0].y0 = m.bodyCenterY - height / 2;
  _inflated[0].y1 = m.bodyCenterY + height / 2;
  _inflated[0].radius = radius + Math.sin(deg2rad(Math.abs(leanZ))) * (height / 2);

  _inflated[1].y0 = headCenterY;
  _inflated[1].y1 = headCenterY;
  _inflated[1].radius = headRadius + Math.abs(head.offsetX + k * rp.headOffsetX);

  return _inflated;
}

/**
 * The room this dancer's emote is asking for beyond their resting shape, measured
 * against the partner they actually have to clear.
 *
 * Goes through `lateralClearance` rather than comparing radii, so it inherits ADR-0012's
 * height awareness for free: a head that grows *above* the partner's costs nothing, and a
 * body that stretches until two heads meet at the same height costs something even though
 * no radius changed.
 */
export function silhouetteNeed(
  m: SilhouetteMetrics,
  rp: ResolvedPose,
  theirParts: readonly RigidPart[],
  k: number,
): number {
  return lateralClearance(inflatedParts(m, rp, k), theirParts);
}

/** What the pair needs at rest — the ADR-0012 number, for one specific pair. */
export function restClearance(
  m: SilhouetteMetrics,
  them: SilhouetteMetrics,
): number {
  return lateralClearance(m.baseParts, them.baseParts);
}

/**
 * This dancer's share of the live slack, split by body radius.
 *
 * Identical in form to `reachAllowance`: the bigger dancer gets the bigger share, the two
 * shares sum to the whole slack, and neither can spend the other's. Zero when the pair is
 * already as close as their resting shapes allow — which is the tightest moment of the
 * tightest pass, and precisely when nobody may puff up.
 */
export function silhouetteAllowance(
  myBodyRadius: number,
  theirBodyRadius: number,
  separation: number,
  restNeed: number,
): number {
  const slack = separation - restNeed;
  if (slack <= 0) return 0;
  const total = myBodyRadius + theirBodyRadius;
  return total <= 0 ? slack / 2 : (slack * myBodyRadius) / total;
}

/**
 * How much of the emote's silhouette survives, `0`–`1`.
 *
 * Searched rather than solved, and **searched on a value it has already verified**. The
 * required clearance is only *nearly* linear in `k` — the radii are exactly linear, but the
 * sideways-lean term carries a `sin` and the height-aware term a `√(r² − dy²)` — so a single
 * proportional step lands slightly the wrong side of the limit about as often as the right
 * one. Since the whole guarantee of this module is that what survives *fits*, the search
 * only ever returns a `k` it has measured and found feasible: `lo` starts at 0, which is the
 * resting silhouette the square was measured from and therefore always fits.
 *
 * Costs **one** evaluation in the common case, because an emote that already fits returns
 * immediately, and that is what makes it affordable per dancer per frame. The bisection only
 * runs while a dancer is actually trespassing.
 */
export function silhouetteClip(
  m: SilhouetteMetrics,
  rp: ResolvedPose,
  theirParts: readonly RigidPart[],
  restNeed: number,
  allowance: number,
): number {
  if (silhouetteNeed(m, rp, theirParts, 1) - restNeed <= allowance) return 1;
  if (allowance <= 0) return 0;

  let lo = 0;
  let hi = 1;
  for (let pass = 0; pass < REFINE_PASSES; pass++) {
    const mid = (lo + hi) / 2;
    if (silhouetteNeed(m, rp, theirParts, mid) - restNeed <= allowance) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * `rp` with its `limited` channels scaled by `k` and everything else passed straight
 * through. Mutates and returns `out` so the frame loop allocates nothing.
 *
 * The channel list here *is* ADR-0010's table. Anything not scaled below is either `free`
 * (the emote owns it) or `owned` (the driver never reads it) — and if a new field appears
 * on `ResolvedPose` and nobody classifies it, it lands in the pass-through group, which is
 * why the ADR's fail-safe rule is enforced at the point the driver chooses to *read* a
 * channel rather than here.
 */
export function clipSilhouette(out: ResolvedPose, rp: ResolvedPose, k: number): ResolvedPose {
  // limited — the silhouette the square's spacing was measured from
  out.bodyRadiusDelta = rp.bodyRadiusDelta * k;
  out.bodyHeightDelta = rp.bodyHeightDelta * k;
  out.bodyLeanZ = rp.bodyLeanZ * k;
  out.headRadiusDelta = rp.headRadiusDelta * k;
  out.headOffsetX = rp.headOffsetX * k;
  out.headOffsetY = rp.headOffsetY * k;

  // free — forward/back is not lateral (ADR-0012), and the rest has no spatial extent
  out.bodyDeltaY = rp.bodyDeltaY;
  out.bodyLeanX = rp.bodyLeanX;
  out.headOffsetZ = rp.headOffsetZ;
  out.headDeltaRotation[0] = rp.headDeltaRotation[0];
  out.headDeltaRotation[1] = rp.headDeltaRotation[1];
  out.headDeltaRotation[2] = rp.headDeltaRotation[2];
  out.eyeOverride = rp.eyeOverride;
  out.activeEffects = rp.activeEffects;

  // owned — carried so `out` is a faithful pose, never read by the dance driver
  out.bodyDeltaRotY = rp.bodyDeltaRotY;
  out.rightArm = rp.rightArm;
  out.leftArm = rp.leftArm;

  return out;
}
