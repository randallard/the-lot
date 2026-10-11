/**
 * The rules a pose has to keep, as **one checker**: two posed dancers in, every rule they
 * break out.
 *
 * ## Why this exists
 *
 * Until 2026-10-10 a pose was *generated* by rules — `sizeArch`'s ladder and the anatomy in
 * `arm-pose.ts` — and then judged by eye, one pairing at a time. Each fix was checked against a
 * number the session that made it chose, and Ryan's eye kept finding what the number had not
 * measured. So the arrangement is turned round: Ryan authors poses, and the rules are **hard
 * checks on whatever pose turns up**, however it was made. See
 * [`journal/2026-10-10-1`](../../docs/journal/2026-10-10-1-the-rules-check-and-ryan-poses.md).
 *
 * The rules are Ryan's, as he stated them:
 *
 * 1. **clip** — no arm through a head, a body or another arm, its owner's or the partner's.
 * 2. **side** — an arm stays on the side it started.
 * 3. **length** — an arm keeps its length.
 * 4. **feet** — feet stay on the floor (ADR-0043).
 * 5. **contact** — joined hands touch, in the styles that keep contact.
 *
 * ## Why it is asked of solids, not of poses
 *
 * A {@link DancerSolids} is **what is drawn**, in world space: the torso capsule, the head, and
 * per arm the forearm cone and the flattened hand. It is deliberately not an `ArmPose` plus a
 * body shape, because the route from one to the other — the wrist turning the hand, a reshape
 * moving a shoulder, the tuck — is exactly where this subsystem's defects have lived. A checker
 * that re-derived the picture would be a second opinion about where a hand is; one that is
 * handed the picture cannot disagree with it. `DanceFloor` fills these from the rigs it has just
 * written.
 *
 * 🔴 **Rule 1 supersedes a standing exclusion.** `ArmMetrics.parts` leaves arms out and says why
 * — Ryan, 2026-08-17: *"sometimes arms will be set wide … that type of thing we don't need to
 * build for — just bodies heads and shoulders."* That was a decision about what the *spacing*
 * solve owes; it is still true of spacing. What changed is that a pose is now authored and
 * checked, and an arm through its own head is a thing the author can simply be told about.
 *
 * ## Why every solid is its own drawn corners
 *
 * A {@link Hull} is the **world-space vertices of the mesh**, and nothing is rounded off to a
 * sphere or a capsule. The first version did round — a forearm was a tapered capsule, a head a
 * sphere — and the first pose Ryan looked at through it (2026-10-11, `you → Ember`) reported
 * Ember's forearm 0.152 inside her own head with daylight visibly between them. Her forearm is
 * drawn with **three** sides and a flat end; a round cone of the same nominal radius with a dome
 * on it is a much fatter thing. The cast is low-poly on purpose and by different amounts per
 * character, so the only solid that is the same as the picture is the picture's own corners.
 *
 * Every mesh here is convex, so two of them are apart by the widest gap any direction shows
 * between them, and overlapping by the narrowest overlap any direction shows — one number,
 * {@link signedGap}, found by trying directions. It is a search, not a closed form: good to
 * about a millimetre, and when it is wrong it is wrong on the side of calling a pose *tighter*
 * than it is.
 *
 * The upper arm is **not drawn** (ADR-0017), so it is not a solid and nothing clips it.
 */

import type { Vec3 } from "./arm-pose";

/** A convex solid as drawn: its mesh's vertices in world space, flat `x, y, z, x, y, z, …`. */
export interface Hull {
  readonly points: ArrayLike<number>;
}

/** One arm as drawn. */
export interface ArmSolid {
  /** Where the undrawn upper arm starts. Only {@link RULES.length} reads it. */
  readonly shoulder: Vec3;
  /** Where it ends and the forearm begins. */
  readonly elbow: Vec3;
  /** The upper arm's natural length — `ArmMetrics.elbowReach` of the shape being worn. */
  readonly upperArm: number;
  readonly forearm: Hull;
  readonly hand: Hull;
}

/** One dancer as drawn, in world space. */
export interface DancerSolids {
  /** Where they stand and which way they face — the frame {@link RULES.side} is asked in. */
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly body: Hull;
  readonly head: Hull;
  readonly left: ArmSolid;
  readonly right: ArmSolid;
}

export const RULES = {
  clip: "clip",
  side: "side",
  length: "length",
  feet: "feet",
  contact: "contact",
} as const;
export type Rule = (typeof RULES)[keyof typeof RULES];

export type Side = "left" | "right";
const SIDES: readonly Side[] = ["left", "right"];

/**
 * `+x` is the anatomical **left** on every dance rig — the same convention `DanceFloor`'s `SIGN`
 * and `poseArms` state.
 */
const SIGN: Readonly<Record<Side, number>> = { left: 1, right: -1 };

/**
 * How much overlap is let through, in world units.
 *
 * 🧪 **A number to choose, not a measurement** — one centimetre. It exists because drawn solids
 * that are *meant* to touch (two joined palms, a wrist against a palm) land a hair inside each
 * other under floating point and under the taper approximation above, and a checker that cried
 * at every one of them would be read past. Ryan sets it; nothing depends on its value but which
 * findings are called violations.
 */
export const SKIN = 0.01;

/** One measurement: a rule asked of one thing, and by how much it held. */
export interface Finding {
  readonly rule: Rule;
  /** Which dancer — an index into the pair. */
  readonly who: 0 | 1;
  /** What was measured, e.g. `left forearm`. */
  readonly what: string;
  /** What it was measured against, e.g. `own head`, `partner body`, `floor`. */
  readonly against: string;
  /**
   * Room to spare, in world units: **positive is clear, negative is that far in breach.**
   * A finding breaks its rule when this is below `-SKIN`.
   */
  readonly margin: number;
}

export interface PoseContext {
  /**
   * The hand each dancer has in the other's, or `null` when they are not holding. The two
   * joined hands are excused from clipping **each other** — touching is the point — and are
   * what {@link RULES.contact} measures.
   */
  readonly joined: readonly [Side | null, Side | null];
  /**
   * The forearm each dancer has **gripped** — an arm turn's hold, a hand wrapped round the
   * partner's forearm. Those two arms are excused from clipping each other entirely: a grip is
   * an overlap by construction (`Contact.gap`: *"negative is a hold"*). Omitted means nobody is.
   */
  readonly gripped?: readonly [Side | null, Side | null];
  /**
   * The arm each dancer has **raised in an arch**. Excused from {@link RULES.side}: a dancer
   * turning under their own arm passes beneath it, so that hand and elbow cross their midline as
   * a matter of course. Ryan, 2026-10-11: *"she's in an L with that arm so that's expected … at
   * times it will be across the midline."* The rule is for the arms that are **not** being turned
   * under — the 09-21 defect was the belle's *down* arm changing sides. Omitted means nobody's.
   */
  readonly raised?: readonly [Side | null, Side | null];
  /** Whether this style keeps the hold: true for `full-l` and `duck-under` (`keepsContact`). */
  readonly keepsContact: boolean;
  /**
   * The world height each dancer's torso bottoms out at **when it is standing on the floor in
   * the shape it is wearing**. A dancer who ducks shortens and stays on it (ADR-0043); this rule
   * catches a rig that has been lifted or sunk.
   *
   * 🔴 Lean-aware, and it has to be: a leaning torso's lowest point is not under its centre, and
   * Ember's 14° put her "0.014 off the floor" standing still in the first version of this.
   */
  readonly standY: readonly [number, number];
  /** The floor. Defaults to `0`, `arm-pose.ts`'s `FLOOR_Y`. */
  readonly floorY?: number;
}

// ---------------------------------------------------------------------------
// Geometry: how far apart two convex solids are, by trying directions.
// ---------------------------------------------------------------------------

/**
 * Half a sphere of directions, evenly spread; each is tried both ways. 160 puts neighbours
 * about 9° apart, which is only the *starting* guess — {@link signedGap} then closes in.
 */
const COARSE = 160;
const DIRS: Float64Array = (() => {
  const out = new Float64Array(COARSE * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COARSE; i++) {
    const y = (i + 0.5) / COARSE; // upper half only
    const r = Math.sqrt(1 - y * y);
    out[i * 3] = Math.cos(i * golden) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(i * golden) * r;
  }
  return out;
})();

/** A hull's extent along every coarse direction: `[max, min]` pairs. Per hull, per frame. */
const _extents = new WeakMap<Hull, Float64Array>();

function extentsOf(h: Hull): Float64Array {
  let e = _extents.get(h);
  if (e !== undefined) return e;
  e = new Float64Array(COARSE * 2);
  const p = h.points;
  for (let i = 0; i < COARSE; i++) {
    const dx = DIRS[i * 3]!, dy = DIRS[i * 3 + 1]!, dz = DIRS[i * 3 + 2]!;
    let hi = -Infinity, lo = Infinity;
    for (let k = 0; k + 2 < p.length; k += 3) {
      const t = p[k]! * dx + p[k + 1]! * dy + p[k + 2]! * dz;
      if (t > hi) hi = t;
      if (t < lo) lo = t;
    }
    e[i * 2] = hi;
    e[i * 2 + 1] = lo;
  }
  _extents.set(h, e);
  return e;
}

/** The gap between `a` and `b` seen along one direction pointing from `a` toward `b`. */
function gapAlong(a: Hull, b: Hull, dx: number, dy: number, dz: number): number {
  let hi = -Infinity, lo = Infinity;
  const p = a.points, q = b.points;
  for (let k = 0; k + 2 < p.length; k += 3) {
    const t = p[k]! * dx + p[k + 1]! * dy + p[k + 2]! * dz;
    if (t > hi) hi = t;
  }
  for (let k = 0; k + 2 < q.length; k += 3) {
    const t = q[k]! * dx + q[k + 1]! * dy + q[k + 2]! * dz;
    if (t < lo) lo = t;
  }
  return lo - hi;
}

/**
 * Surface gap between two convex solids: **positive is daylight, negative is how far one is
 * into the other.**
 *
 * For convex solids both are the same quantity — the largest gap any direction shows. Apart, the
 * best direction shows the true distance; overlapping, every direction shows an overlap and the
 * best one shows the least of them, which is how far they would have to move to come clear.
 *
 * Searched: the coarse directions first, then a ring round the best one, tightening. A search
 * can only *miss* the best direction, never beat it, so an error here reads a pose as tighter
 * than it is — the side to be wrong on.
 */
export function signedGap(a: Hull, b: Hull): number {
  if (a.points.length < 3 || b.points.length < 3) return Infinity;
  const ea = extentsOf(a);
  const eb = extentsOf(b);
  let best = -Infinity;
  let bx = 0, by = 1, bz = 0;
  for (let i = 0; i < COARSE; i++) {
    // Along +d: b's near side minus a's far side. Along −d: the same with the roles' signs flipped.
    const fwd = eb[i * 2 + 1]! - ea[i * 2]!;
    const back = ea[i * 2 + 1]! - eb[i * 2]!;
    if (fwd > best) {
      best = fwd;
      bx = DIRS[i * 3]!; by = DIRS[i * 3 + 1]!; bz = DIRS[i * 3 + 2]!;
    }
    if (back > best) {
      best = back;
      bx = -DIRS[i * 3]!; by = -DIRS[i * 3 + 1]!; bz = -DIRS[i * 3 + 2]!;
    }
  }

  // Close in: eight directions on a cone round the best so far, re-centring on any that beats
  // it, the cone halving each round. Starts wider than the coarse spacing so a neighbour's
  // territory is in reach.
  let cone = 0.2;
  for (let round = 0; round < 9; round++) {
    // Two axes square to the best direction.
    let ux = by, uy = -bx, uz = 0;
    if (Math.abs(bz) > 0.9) { ux = 0; uy = bz; uz = -by; }
    const un = Math.hypot(ux, uy, uz) || 1;
    ux /= un; uy /= un; uz /= un;
    const vx = by * uz - bz * uy, vy = bz * ux - bx * uz, vz = bx * uy - by * ux;
    const t = Math.tan(cone);
    let moved = false;
    let nx = bx, ny = by, nz = bz;
    for (let k = 0; k < 8; k++) {
      const c = Math.cos((k * Math.PI) / 4) * t;
      const s = Math.sin((k * Math.PI) / 4) * t;
      let dx = bx + ux * c + vx * s, dy = by + uy * c + vy * s, dz = bz + uz * c + vz * s;
      const n = Math.hypot(dx, dy, dz);
      dx /= n; dy /= n; dz /= n;
      const g = gapAlong(a, b, dx, dy, dz);
      if (g > best) {
        best = g;
        nx = dx; ny = dy; nz = dz;
        moved = true;
      }
    }
    bx = nx; by = ny; bz = nz;
    if (!moved) cone /= 2;
  }
  return best;
}

/** The lowest `y` among a hull's corners. */
function lowestOf(h: Hull): number {
  let lo = Infinity;
  for (let k = 1; k < h.points.length; k += 3) if (h.points[k]! < lo) lo = h.points[k]!;
  return lo;
}

function dist(p: Vec3, q: Vec3): number {
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

/** How far to a dancer's own left a world point is — their rig-local `x`. */
function localX(d: DancerSolids, x: number, z: number): number {
  // The inverse of `trackForearm`'s placement.
  return (x - d.x) * Math.cos(d.yaw) - (z - d.z) * Math.sin(d.yaw);
}

/** The furthest any corner of `h` still is on the `sign` side of its owner's midline. */
function furthestOnSide(d: DancerSolids, h: Hull, sign: number): number {
  let hi = -Infinity;
  for (let k = 0; k + 2 < h.points.length; k += 3) {
    const t = sign * localX(d, h.points[k]!, h.points[k + 2]!);
    if (t > hi) hi = t;
  }
  return hi;
}

// ---------------------------------------------------------------------------
// The rules.
// ---------------------------------------------------------------------------

/**
 * Measure a posed pair against every rule. Returns **every** measurement, kept or broken, so a
 * caller can show the tightest clearance of a legal pose as readily as the breach of an illegal
 * one. {@link violations} is the filter.
 */
export function measurePose(
  pair: readonly [DancerSolids, DancerSolids],
  ctx: PoseContext,
): Finding[] {
  const out: Finding[] = [];
  const floorY = ctx.floorY ?? 0;

  for (const who of [0, 1] as const) {
    const me = pair[who];
    const them = pair[who === 0 ? 1 : 0];
    const other = who === 0 ? 1 : 0;

    for (const side of SIDES) {
      const arm = me[side];
      const joinedMine = ctx.joined[who] === side;

      // 1. clip — this arm against the four bodies-and-heads.
      const solids: readonly [string, Hull][] = [
        ["own head", me.head],
        ["own body", me.body],
        ["partner head", them.head],
        ["partner body", them.body],
      ];
      for (const [against, solid] of solids) {
        out.push({ rule: RULES.clip, who, what: `${side} forearm`, against, margin: signedGap(arm.forearm, solid) });
        out.push({ rule: RULES.clip, who, what: `${side} hand`, against, margin: signedGap(arm.hand, solid) });
      }

      // 1. clip — against the floor. Not on Ryan's list by name, and `clearFloor` (ADR-0055)
      // already keeps a *solved* arm out of it; a dragged one has no such guarantee.
      out.push({
        rule: RULES.clip, who, what: `${side} arm`, against: "floor",
        margin: Math.min(lowestOf(arm.forearm), lowestOf(arm.hand)) - floorY,
      });

      // 1. clip — against other arms. Each unordered pair once: own left/right from the left
      // side, and partner arms from dancer 0.
      const others: [string, ArmSolid, boolean][] = [];
      if (side === "left") others.push(["own right", me.right, false]);
      if (who === 0) {
        for (const theirSide of SIDES) {
          if (ctx.gripped?.[who] === side && ctx.gripped[other] === theirSide) continue;
          others.push([
            `partner ${theirSide}`,
            them[theirSide],
            joinedMine && ctx.joined[other] === theirSide,
          ]);
        }
      }
      for (const [name, theirs, holding] of others) {
        out.push({
          rule: RULES.clip, who, what: `${side} forearm`, against: `${name} forearm`,
          margin: signedGap(arm.forearm, theirs.forearm),
        });
        out.push({
          rule: RULES.clip, who, what: `${side} hand`, against: `${name} forearm`,
          margin: signedGap(arm.hand, theirs.forearm),
        });
        out.push({
          rule: RULES.clip, who, what: `${side} forearm`, against: `${name} hand`,
          margin: signedGap(arm.forearm, theirs.hand),
        });
        // Two hands holding each other are rule 5's, not rule 1's.
        if (!holding) {
          out.push({
            rule: RULES.clip, who, what: `${side} hand`, against: `${name} hand`,
            margin: signedGap(arm.hand, theirs.hand),
          });
        }
      }

      // 2. side — an arm that is not raised in an arch keeps to its own side: the elbow does
      // not cross its owner's midline, and the hand is not *wholly* across it.
      if (ctx.raised?.[who] !== side) {
        const sign = SIGN[side];
        out.push({
          rule: RULES.side, who, what: `${side} elbow`, against: "own midline",
          margin: sign * localX(me, arm.elbow.x, arm.elbow.z),
        });
        out.push({
          rule: RULES.side, who, what: `${side} hand`, against: "own midline",
          margin: furthestOnSide(me, arm.hand, sign),
        });
      }

      // 3. length — the undrawn upper arm is no longer than it is. Shorter is a bent arm, which
      // is ordinary (`upperArmStrain`'s rule).
      out.push({
        rule: RULES.length, who, what: `${side} upper arm`, against: "its own length",
        margin: arm.upperArm - dist(arm.shoulder, arm.elbow),
      });
    }

    // 4. feet — the torso's lowest point is where it is when standing. Both directions: a
    // dancer lifted off the floor has broken ADR-0043 as surely as one sunk into it.
    out.push({
      rule: RULES.feet, who, what: "body", against: "floor",
      margin: -Math.abs(lowestOf(me.body) - ctx.standY[who]),
    });
  }

  // 5. contact — once for the pair. Asked only of a style that keeps the hold; a break is
  // allowed to be apart, and is still held to rule 1 like any other pair of hands.
  const [a, b] = ctx.joined;
  if (ctx.keepsContact && a !== null && b !== null) {
    out.push({
      rule: RULES.contact, who: 0, what: `${a} hand`, against: `partner ${b} hand`,
      margin: -Math.max(0, signedGap(pair[0][a].hand, pair[1][b].hand)),
    });
  }

  return out;
}

/** Whether a finding breaks its rule, at {@link SKIN}. */
export function breaks(f: Finding, skin: number = SKIN): boolean {
  return f.margin < -skin;
}

/** The findings that break their rule, worst first. */
export function violations(findings: readonly Finding[], skin: number = SKIN): Finding[] {
  return findings.filter((f) => breaks(f, skin)).sort((p, q) => p.margin - q.margin);
}

/** `beau's left forearm is 0.042 into partner head` — one line a readout can print. */
export function describe(f: Finding, names: readonly [string, string]): string {
  const who = names[f.who];
  const by = Math.abs(f.margin).toFixed(3);
  switch (f.rule) {
    case RULES.clip:
      return `${who}'s ${f.what} is ${by} into ${f.against}`;
    case RULES.side:
      return `${who}'s ${f.what} is ${by} across ${f.against}`;
    case RULES.length:
      return `${who}'s ${f.what} is stretched ${by}`;
    case RULES.feet:
      return `${who}'s ${f.what} is ${by} off the ${f.against}`;
    case RULES.contact:
      return `${who}'s ${f.what} is ${by} short of ${f.against}`;
  }
}
