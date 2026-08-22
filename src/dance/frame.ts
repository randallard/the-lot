/**
 * The unit-square ↔ world transform.
 *
 * square-one works in an abstract 2D frame: `x` right, `y` "north", facing in
 * degrees counterclockwise from `+x`. townage works in three.js world space:
 * `x` right, `z` toward the camera, `y` up, and character heading expressed as
 * `rotation.y` where `atan2(dir.x, dir.z)` is the convention every existing mover
 * uses (`Player.tsx`, `Npc.tsx`).
 *
 * Mapping: engine `+y` (north) becomes world `−z` (away from camera), so a square
 * laid out on the floor reads the same way it does on paper.
 *
 * Pure by design — no three.js imports, no refs, no frame loop. This is the part
 * that can be property-tested, and it is the only place the two coordinate
 * conventions are allowed to meet.
 */

/** A point in square-one's abstract frame. */
export interface EnginePoint {
  readonly x: number;
  readonly y: number;
}

/** A point on townage's floor. `y` (height) is not ours — dancers stay grounded. */
export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

/**
 * Where a square currently sits on the floor.
 *
 * Deliberately a plain value that gets *replaced*, not mutated in place: square-one
 * re-fits its square frame to actual dancer positions as a square migrates
 * (ADR-0006 drift), so this transform has to be able to follow rather than pin
 * dancers to fixed floor coordinates.
 */
export interface DanceFrame {
  /** Floor position of the engine frame's origin. */
  readonly origin: WorldPoint;
  /** World units per engine unit. One engine unit is the gap between facing dancers. */
  readonly scale: number;
  /** Rotation of the whole square about its origin, in radians. */
  readonly yaw: number;
}

export const DEFAULT_SCALE = 2.2;

/**
 * The margin a pair keeps over the bare clearance their bodies need.
 *
 * Thin on purpose — real dancers brush shoulders on a Pass Thru, so tight is right, and
 * `lateralClearance` returns the distance at which nothing *touches*, which is a distance at
 * which everything touches.
 *
 * 🔴 **It was `SCALE_MARGIN`, and it multiplied the whole floor** (ADR-0035). The square used to
 * grow until its fixed engine lane happened to equal the widest pair's clearance; the margin rode
 * on that growth, so one wide dancer spent it on everybody. Now the figures carry their own
 * accommodation and the margin belongs to the measurement it qualifies.
 */
export const CLEARANCE_MARGIN = 1.1;

/**
 * How far apart two bodies must stand to pass each other — the bare clearance their silhouettes
 * need, plus the margin over it.
 *
 * 🔴 **One spelling, because there were two and they disagreed** (ADR-0044). The figure asked for
 * `CLEARANCE_MARGIN × clearance` while `placeHold`'s standing floor asked for `clearance +
 * PERSONAL_SPACE`, and the two are equal only at a clearance of **0.600**. Above it a couple stood
 * closer than they could pass — Myco with Sprout by 0.008 — and `PERSONAL_SPACE`'s own comment
 * still described the pair of them as *"the same 0.06"*, which they were when it was written and
 * stopped being when the margin became a multiplier.
 *
 * Standing and passing are the same question about the same two bodies. They get the same answer
 * from the same function now, and a future change to the margin cannot reach one and miss the
 * other.
 */
export function passingWidth(clearance: number): number {
  return CLEARANCE_MARGIN * clearance;
}

export function makeFrame(
  origin: WorldPoint,
  scale: number = DEFAULT_SCALE,
  yaw = 0,
): DanceFrame {
  return { origin, scale, yaw };
}

/** Engine point → floor position. */
export function toWorld(frame: DanceFrame, p: EnginePoint): WorldPoint {
  // Engine +y maps to world −z before the square's own yaw is applied.
  const ex = p.x * frame.scale;
  const ez = -p.y * frame.scale;
  const c = Math.cos(frame.yaw);
  const s = Math.sin(frame.yaw);
  return {
    x: frame.origin.x + ex * c - ez * s,
    z: frame.origin.z + ex * s + ez * c,
  };
}

/** Floor position → engine point. The inverse of {@link toWorld}. */
export function toEngine(frame: DanceFrame, p: WorldPoint): EnginePoint {
  const dx = p.x - frame.origin.x;
  const dz = p.z - frame.origin.z;
  const c = Math.cos(-frame.yaw);
  const s = Math.sin(-frame.yaw);
  const ex = dx * c - dz * s;
  const ez = dx * s + dz * c;
  return { x: ex / frame.scale, y: -ez / frame.scale };
}

/**
 * Engine facing (degrees CCW from `+x`) → three.js `rotation.y`.
 *
 * Derivation, since it is easy to get backwards: engine facing θ is the direction
 * `(cos θ, sin θ)`, which maps to the world direction `(cos θ, −sin θ)` in `(x, z)`.
 * townage's heading convention is `atan2(dir.x, dir.z)`, and
 * `atan2(cos θ, −sin θ) === π/2 + θ`. So the whole transform is a quarter turn plus
 * the engine angle, and the square's own yaw on top.
 */
export function facingToRotationY(frame: DanceFrame, facingDeg: number): number {
  return Math.PI / 2 + (facingDeg * Math.PI) / 180 + frame.yaw;
}

/** `rotation.y` → engine facing degrees. The inverse of {@link facingToRotationY}. */
export function rotationYToFacing(frame: DanceFrame, rotationY: number): number {
  const rad = rotationY - Math.PI / 2 - frame.yaw;
  const deg = (rad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Re-fit the frame's origin to where the dancers actually are.
 *
 * square-one estimates its square frame from actual positions each tick so that
 * individual error accumulates as whole-square migration rather than being
 * corrected toward absolute floor coordinates. This is townage's half of that: the
 * floor origin follows the centroid instead of staying nailed down.
 *
 * Returns the frame unchanged when there is nothing to fit, so a caller can apply
 * it unconditionally.
 */
export function refit(frame: DanceFrame, actual: readonly WorldPoint[]): DanceFrame {
  if (actual.length === 0) return frame;
  let sx = 0;
  let sz = 0;
  for (const p of actual) {
    sx += p.x;
    sz += p.z;
  }
  return { ...frame, origin: { x: sx / actual.length, z: sz / actual.length } };
}
