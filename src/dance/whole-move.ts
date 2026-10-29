/**
 * 🧪 **Solve the whole move** (2026-10-24, exploratory, no ADR): pose both dancers over every
 * sample of a move at once, as one optimisation, rather than one frame at a time.
 *
 * Brief: `work/square-dance-planning/briefs/solve-the-whole-move.md`. Ryan: *"I really just don't
 * want body parts to clip into each other or flip rapidly between angles / sizes - all should be
 * smooth and "natural"."* Stretching, shrinking and growing are allowed.
 *
 * The variables are `#review2`'s own dials (`pose-dials.ts`), so a solution is a keyframe track
 * `#review2` can load and play as it is. Per dancer, per sample: each arm's upper-arm raise, toward
 * and length, and its forearm pitch, heading and length. For the beau, an offset from the floor's
 * path too ("just the beau steps out to create the room if necessary").
 *
 * The objective:
 * - **No clipping**: torso capsules, head spheres, forearm capsules and hand spheres keep a margin,
 *   between the two dancers and against each dancer's own head. Hands stay above the floor.
 * - **Held hands stay held**, for the spans the engine declares.
 * - **Smooth**: every variable's change and its change of change between samples cost.
 * - **Natural**: stretch costs gently; free arms prefer to hang; held arms prefer to be low
 *   (gravity), so an arch is only as high and as long as the bodies under it need.
 *
 * 🔑 Nothing says *when* the arch is up. That should fall out: the hands must stay joined, and her
 * head must not pass through them.
 *
 * Pure: no three.js. The forward model is `Dancer.tsx` + `computePositions` + `applyToRigs`,
 * restated: the rig faces +z, +x is the anatomical left, `rotation.y` is the facing.
 */

import { computePositions, NPC_BODY_CENTER_Y, SHAPE_BOUNDS, type CharacterBodyShape } from "../services/body-shapes";

export type Vec = readonly [number, number, number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** One arm's dials, in radians and metres. */
export interface Arm {
  raise: number;
  toward: number;
  ulen: number;
  pitch: number;
  heading: number;
  flen: number;
}

/** One dancer at one sample: where the floor puts them, and their two arms (left, right). */
export interface DancerFrame {
  x: number;
  z: number;
  /** Rig yaw, radians (`rotation.y`). */
  yaw: number;
  arms: [Arm, Arm];
  /** 🧪 Body height grown (m; negative shrinks), feet planted: see {@link Body.rise}. Default 0. */
  grow?: number;
}

export type Frame = [DancerFrame, DancerFrame];

/** What the forward model needs from a body shape, in the rig's own frame. */
export interface Body {
  /** Left, right. */
  shoulder: [Vec, Vec];
  head: { c: Vec; r: number };
  torso: { a: Vec; b: Vec; r: number };
  upper0: number;
  /** Elbow to hand centre at rest. */
  fore0: number;
  /** Elbow to wrist along the forearm, at rest. */
  forearm: number;
  forearmR: number;
  handR: number;
  /**
   * 🧪 What growing does (2026-10-27, step 3b): how far each point moves per metre the body's
   * height grows, the way the floor draws it (`growBody` with `standingLift`, ADR-0043: the bottom
   * of the body stays put). The torso's top and the head rise one for one; a shoulder rises by
   * what `computePositions` gives it (half for a body with an authored `shoulderY`). The arms ride
   * the shoulder at their own lengths. `height` is the dancer standing (crown over the floor), and
   * `room` is the shape editor's own limits on the change (`growBody` clamps to them). Not part of
   * a body's print (`bodyPrint`): it follows from the rest.
   */
  rise: { top: Vec; head: Vec; shoulder: [Vec, Vec]; height: number; room: [number, number] };
}

export function bodyOf(shape: CharacterBodyShape): Body {
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);
  const { head, body, forearm, hand } = shape;
  // Linear in the height, so one step measures it; unclamped, so the slope is the slope.
  const D = 0.1;
  const grown = computePositions({ ...shape, body: { ...body, height: body.height + D } }, NPC_BODY_CENTER_Y);
  const lift = D / 2;
  const shoulderRise: Vec = [0, (grown.shoulderY - pos.shoulderY + lift) / D, (grown.shoulderZ - pos.shoulderZ) / D];
  const { min, max } = SHAPE_BOUNDS.body.height;
  return {
    shoulder: [
      [pos.forearmX, pos.shoulderY, pos.shoulderZ],
      [-pos.forearmX, pos.shoulderY, pos.shoulderZ],
    ],
    head: { c: [head.offsetX, pos.headY + head.offsetY, head.offsetZ], r: head.radius },
    torso: {
      a: [0, NPC_BODY_CENTER_Y - body.height / 2, 0],
      b: [0, NPC_BODY_CENTER_Y + body.height / 2, 0],
      r: body.radius,
    },
    upper0: pos.upperArmLength,
    fore0: pos.elbowY - pos.handCenterY,
    forearm: forearm.height,
    forearmR: forearm.topRadius,
    handR: hand.open.radius,
    rise: {
      top: [0, 1, 0],
      head: [0, (grown.headY - pos.headY + lift) / D, 0],
      shoulder: [shoulderRise, shoulderRise],
      height: pos.headY + head.offsetY + head.radius,
      room: [min - body.height, max - body.height],
    },
  };
}

/** A body grown by `g` (m): its torso top, head and shoulders where {@link Body.rise} puts them. */
export function wornBody(b: Body, g: number): Body {
  if (g === 0) return b;
  const up = (p: Vec, r: Vec): Vec => [p[0] + r[0] * g, p[1] + r[1] * g, p[2] + r[2] * g];
  return {
    ...b,
    shoulder: [up(b.shoulder[0], b.rise.shoulder[0]), up(b.shoulder[1], b.rise.shoulder[1])],
    head: { ...b.head, c: up(b.head.c, b.rise.head) },
    torso: { ...b.torso, b: up(b.torso.b, b.rise.top) },
  };
}

export function restArm(b: Body): Arm {
  return { raise: 0, toward: 0, ulen: b.upper0, pitch: -Math.PI / 2, heading: 0, flen: b.fore0 };
}

const SIDES = ["left", "right"] as const;
const sign = (side: 0 | 1) => (side === 0 ? 1 : -1);

/** Shoulder, elbow, wrist and hand centre of one arm, in the rig's frame (`applyToRigs`'s maths). */
export function armPoints(b: Body, side: 0 | 1, a: Arm): { s: Vec; e: Vec; w: Vec; h: Vec } {
  const s = b.shoulder[side];
  const g = sign(side);
  const hz = Math.sin(a.raise);
  const e: Vec = [
    s[0] + g * hz * Math.sin(a.toward) * a.ulen,
    s[1] - Math.cos(a.raise) * a.ulen,
    s[2] + hz * Math.cos(a.toward) * a.ulen,
  ];
  const cp = Math.cos(a.pitch);
  const d: Vec = [g * cp * Math.sin(a.heading), Math.sin(a.pitch), cp * Math.cos(a.heading)];
  // The forearm mesh scales with the forearm-length dial, as `applyToRigs` does.
  const k = a.flen / b.fore0;
  const w: Vec = [e[0] + d[0] * b.forearm * k, e[1] + d[1] * b.forearm * k, e[2] + d[2] * b.forearm * k];
  const h: Vec = [e[0] + d[0] * a.flen, e[1] + d[1] * a.flen, e[2] + d[2] * a.flen];
  return { s, e, w, h };
}

/** Rig frame → the couple's floor frame. */
export function toFloor(p: Vec, f: DancerFrame): Vec {
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [p[0] * c + p[2] * s + f.x, p[1], -p[0] * s + p[2] * c + f.z];
}

// ── Distances ────────────────────────────────────────────────────────────────────────────────

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec) => Math.sqrt(dot(a, a));
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Closest distance between segments p1–q1 and p2–q2 (Ericson, Real-Time Collision Detection 5.1.9). */
export function segSeg(p1: Vec, q1: Vec, p2: Vec, q2: Vec): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s: number;
  let t: number;
  if (a <= 1e-12 && e <= 1e-12) return len(r);
  if (a <= 1e-12) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const c1: Vec = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2: Vec = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return len(sub(c1, c2));
}

/** A capsule; a sphere is a capsule with `a === b`. */
interface Shape {
  name: string;
  a: Vec;
  b: Vec;
  r: number;
}

/** Every collidable of one dancer at one frame, in the floor frame. */
export function shapesOf(built: Body, f: DancerFrame): Shape[] {
  const b = wornBody(built, f.grow ?? 0);
  const out: Shape[] = [
    { name: "torso", a: toFloor(b.torso.a, f), b: toFloor(b.torso.b, f), r: b.torso.r },
    { name: "head", a: toFloor(b.head.c, f), b: toFloor(b.head.c, f), r: b.head.r },
  ];
  for (const side of [0, 1] as const) {
    const p = armPoints(b, side, f.arms[side]);
    const e = toFloor(p.e, f);
    const h = toFloor(p.h, f);
    // The upper arm isn't drawn, but it is there: an arm that passes through a body to get
    // round it is the cheapest wrong answer otherwise.
    out.push({ name: `upper-${SIDES[side]}`, a: toFloor(p.s, f), b: e, r: b.forearmR });
    out.push({ name: `forearm-${SIDES[side]}`, a: e, b: toFloor(p.w, f), r: b.forearmR });
    out.push({ name: `hand-${SIDES[side]}`, a: h, b: h, r: b.handR });
  }
  return out;
}

/**
 * 🧪 How clear an upper arm is of its own torso (`own` 0) or head (1) at rest, before any margin
 * (m; negative is inside). Some bodies attach the arm against or inside their own head: blends
 * of the stock cast do (2026-10-26, step 3), and the upper arm isn't drawn. **An upper arm needn't
 * be clearer of its own body than it is at rest**, so its own-body margin is the smaller of the
 * margin and this. The stock cast has 15 cm, more than any margin used, so nothing changes for it.
 */
const REST_GAP = new WeakMap<Body, number[]>();
export function restGap(b: Body, side: 0 | 1, own: 0 | 1): number {
  let g = REST_GAP.get(b);
  if (g === undefined) {
    g = [];
    for (const sd of [0, 1] as const) {
      const p = armPoints(b, sd, restArm(b));
      g.push(segSeg(p.s, p.e, b.torso.a, b.torso.b) - b.torso.r - b.forearmR);
      g.push(segSeg(p.s, p.e, b.head.c, b.head.c) - b.head.r - b.forearmR);
    }
    REST_GAP.set(b, g);
  }
  return g[side * 2 + own] ?? 0;
}

/** How near `x` is to a limit it shouldn't pass, 0 (a centimetre or more inside) to 1 (at or past it), and its slope. */
const TRADE_BAND = 0.01;
function atLimit(x: number, lim: number, below: boolean): [number, number] {
  const t = (below ? x - lim : lim - x) / TRADE_BAND;
  if (t <= 0) return [1, 0];
  if (t >= 1) return [0, 0];
  return [1 - t, (below ? -1 : 1) / TRADE_BAND];
}

/**
 * 🧪 The `meet` trade's cost for one sample, and its slope in each dancer's growth (10-27). The
 * shares `g / height` should cancel (`d = 0`). Too much growth overall (`d > 0`) is excused as far
 * as either dancer is at their lowest, since the one shrinking can't shrink further; too much
 * shrinking (`d < 0`), as far as either is at their highest.
 */
export function tradeCost(gb: number, gg: number, hb: number, hg: number, room: readonly [GrowRoom, GrowRoom], w: number): [number, number, number] {
  const d = gb / hb + gg / hg;
  const [lb, lbd] = d > 0 ? atLimit(gb, room[0].min, true) : atLimit(gb, room[0].max, false);
  const [lg, lgd] = d > 0 ? atLimit(gg, room[1].min, true) : atLimit(gg, room[1].max, false);
  const byB = lb >= lg;
  const excuse = byB ? lb : lg;
  const keep = 1 - excuse;
  const c = w * d * d * keep;
  return [c, 2 * w * d * keep / hb - (byB ? w * d * d * lbd : 0), 2 * w * d * keep / hg - (byB ? 0 : w * d * d * lgd)];
}

/**
 * 🧪 What a change of height costs at sample `i`: `WEIGHTS.grow`, and `clip` on the first and last
 * samples, so a call starts and ends as built and the next call doesn't begin with a pop. Left
 * free, the ryan → ryan duck started 9 cm down (10-27). With the arms pinned too (`Move.home`), 10 ×
 * `clip`: at 1 ×, myco → sprout ended 4.4 cm tall against the standing couple's arms.
 */
const growEnds = (m: Move, i: number, w: Weights) =>
  i === 0 || i === m.frames.length - 1 ? (m.home === true ? 10 : 1) * w.clip : w.grow;

/** The margin an arm shape (`shapesOf` index 2–7) keeps from its own torso or head. */
export const ownMargin = (b: Body, shape: number, own: 0 | 1, margin: number) =>
  shape === 2 || shape === 5 ? Math.min(margin, restGap(b, shape === 2 ? 0 : 1, own)) : margin;

// ── The move ─────────────────────────────────────────────────────────────────────────────────

/** A held pair of hands over a stretch of the move (fractions 0–1), from the engine's grips. */
export interface Hold {
  from: number;
  to: number;
  beau: 0 | 1;
  belle: 0 | 1;
  /**
   * 🧪 An arch: the joined hands keep to this upright plane (a point on it and its horizontal
   * normal). It's the 10-19 reading of the video, *"up in an arc on the same plane"*: the plane
   * through the centre of the exchange, along the couple's facing. Nothing says how high or when.
   * That comes from her crossing the plane under them.
   */
  plane?: { p: Vec; n: Vec };
  /**
   * 🧪 Scales `WEIGHTS.hold` (default 1). A break (10-27) is a hold this weak: the hands reach for
   * each other but aren't owed contact. Ryan, 10-13: *"the gable just won't connect, but shows a
   * bit of effort towards it"*. `metrics` doesn't count a weak hold's gap.
   */
  weight?: number;
  /**
   * 🧪 A forearm grip (step 7, 2026-10-28): each hand at the **other's elbow**, the two forearms
   * along each other, rather than hand in hand. square-one's `forearm` grip, the Allemande Left's
   * (*"two horizontal, antiparallel forearms … each hand at the other's elbow"*, its `GripStyle`).
   */
  forearm?: boolean;
  /**
   * 🧪 Where a forearm grip is held (10-28): both hands and both elbows on this height (m), the
   * forearms level along each other, and the elbows' midpoint over the point between the two
   * held shoulders. The Allemande's shape, as the arch's plane is the twirl's: without it the 25 solved
   * apart, hands 3–9 cm off the elbow and the arm flipping over. The floor's `planForearm` height.
   */
  gripHeight?: number;
}

/**
 * 🧪 One of Ryan's keyframe dials as a pull on the solve (2026-10-26): at sample `i`, dancer
 * `dancer`'s `side` arm wants `key` at `value` (radians, or metres for the lengths). `weight`
 * scales `WEIGHTS.target`: 1 for a dial he set, more for a locked keyframe, and a keyframe between
 * two samples splits its weight between them.
 */
export interface Target {
  i: number;
  dancer: 0 | 1;
  side: 0 | 1;
  key: ArmKey;
  value: number;
  weight: number;
}

/**
 * 🧪 How far one dancer may grow or shrink during a move (m of body height, feet planted), and
 * what it costs them (2026-10-27, step 3b). See {@link growRoom}.
 */
export interface GrowRoom {
  min: number;
  max: number;
  /** Scales `WEIGHTS.grow`. */
  weight: number;
}

/**
 * 🧪 Who changes height to make a move, beau then belle (Ryan, 2026-10-27: *"proportional, torso
 * first, keep belle-ducks as a style"*):
 *
 * - `meet`: they trade height and meet in the middle **in proportion to their heights**: as one
 *   grows by a share of their own height, the other shrinks by the same share of theirs (held
 *   firmly, at `WEIGHTS.clip`). Left free, each used it for their own reach: ryan → ryan's beau
 *   grew 39 cm while she shrank 15, and myco → sprout both grew (10-27). **Once one of them is at
 *   the editor's limit the other may go on alone**: ryan, myco and sprout have 30 cm torsos, so
 *   they can shrink only 20 cm, and a tie held there capped the partner's growth at the same
 *   share. It's `growBody`'s own rule, a change asked for against a change taken. See {@link tradeCost}.
 * - `duck`: the belle shrinks under the arch, the beau stays as built (`turn-under.ts`'s
 *   `DUCK_UNDER`).
 * - `none`: as built (the solves before 10-27).
 *
 * Every change stays inside the shape editor's limits, as the floor's `growBody` does.
 */
export type GrowStyle = "meet" | "duck" | "none";

export function growRoom(style: GrowStyle, bodies: readonly [Body, Body]): Pick<Move, "grow" | "trade"> {
  if (style === "none") return {};
  const [b, g] = bodies;
  const full = (x: Body): GrowRoom => ({ min: x.rise.room[0], max: x.rise.room[1], weight: 1 });
  if (style === "duck") return { grow: [{ min: 0, max: 0, weight: 1 }, { min: g.rise.room[0], max: 0, weight: 1 }] };
  return { grow: [full(b), full(g)], trade: true };
}

export interface Move {
  bodies: [Body, Body];
  /** One per sample, evenly over t = 0…1. Arms are the starting guess. */
  frames: Frame[];
  holds: Hold[];
  /**
   * 🧪 Ryan's keyframes, as pulls (see {@link targetsFromKeyframes}). Soft: the hard terms
   * (clearance, held hands) and smoothness still win, so a pose that would clip is got as close
   * to as it can be without clipping.
   */
  targets?: readonly Target[];
  /** 🧪 Who may change height, beau then belle ({@link growRoom}). Absent: nobody. */
  grow?: [GrowRoom, GrowRoom];
  /** 🧪 The two changes are one trade, split in proportion to their heights (`meet`). */
  trade?: boolean;
  /**
   * 🧪 The beau starts and ends on his spot (step 4, 2026-10-27): his step costs 10 × `WEIGHTS.clip` on
   * the first and last samples, so the next call's floor pose starts where this one ends. The
   * arms' ends are pinned by targets (`standingTargets`, `whole-move-twirl.ts`).
   */
  home?: boolean;
  /**
   * 🧪 A floor for the held hands, per sample (m; their midpoint's height). Below it costs
   * `WEIGHTS.plane` per m². A join between two twirls (`chain-join.ts`, 10-27) keeps the arch up
   * across it, as square-one ADR-0026 says: without it the hands dipped to the chest at the join.
   */
  lift?: readonly (number | undefined)[];
  /**
   * 🧪 How far the beau may step off the floor's path (m) before it costs ten times clipping (step 7,
   * 2026-10-28). The brief's B.5: *"with 20 couples, a 26 cm step-out is how neighbouring couples
   * collide"*. Absent: only `WEIGHTS.step`'s soft pull, as before.
   */
  stepCap?: number;
}

export interface Weights {
  clip: number;
  margin: number;
  hold: number;
  /** Clasped hand centres sit this fraction of the two radii apart. */
  clasp: number;
  smooth1: number;
  smooth2: number;
  stretch: number;
  rest: number;
  gravity: number;
  step: number;
  range: number;
  plane: number;
  /**
   * A keyframe dial's pull, per radian² (lengths count a metre as `METRE` radians). 600 honours a
   * set dial closely: on the twirl, a beau's raise asked 14° below the solve's landed within 2°,
   * still clear of every head (60 moved it 4°; 10-26-2). A locked keyframe pulls 10× that.
   */
  target: number;
  /**
   * 🧪 A change of body height, per m² over the dancer's height in m (`g² / height`), per sample.
   * Set below what the same reach costs in arm stretch, so a torso changes first (2026-10-27).
   */
  grow: number;
}

export const WEIGHTS: Weights = {
  clip: 30000,
  margin: 0.02,
  hold: 2000,
  clasp: 0.6,
  smooth1: 2,
  smooth2: 60,
  stretch: 6,
  rest: 2,
  gravity: 0.3,
  step: 4,
  range: 200,
  plane: 400,
  target: 600,
  grow: 4,
};

/**
 * 🧪 How far a segment may shrink before it costs like an angle out of range (2026-10-28): a fifth of
 * its length. Stretch alone costs gently both ways, and the Allemande's solve found it cheaper to
 * shrink each forearm to nothing, hand on its own elbow, than to hold the grip (ryan ×2: forearms
 * at 0.15× for most of the turn, the arm flipping 178° into it).
 */
export const SHRINK = 0.2;
// 🧪 And the upper arm is never longer than it is (10-28, 12): costed like a clip, as `pose-rules`'
// length rule holds the drawn one to its length within a centimetre. Stretch alone let myco → ember's
// bake draw ember's upper arm 4.2 cm long, a broken rule on the floor under a "clean" solve.

/**
 * 🧪 In a forearm grip, whether dancer `k`'s hand **slides up the partner's forearm** rather than
 * sitting at their elbow (2026-10-28, 12): when their own forearm is the shorter. "My hand at your
 * elbow" both ways forces equal forearms; with unequal ones the longer reaches the elbow and the
 * shorter holds further up, as the floor's `contactRadius` has always said. Held to the elbow both
 * ways, sprout → ember stretched sprout's forearm 1.5× and squashed ember's to 0.76×.
 */
export const gripSlides = (m: Move, k: 0 | 1): boolean => m.bodies[k].fore0 < m.bodies[1 - k].fore0 - 1e-6;

/** Where on the segment `a`–`b` a hand at `p` holds: the closest point's parameter, or 0 (at `a`). */
const along = (p: Vec, a: Vec, b: Vec, slide: boolean): number => {
  if (!slide) return 0;
  const d = sub(b, a);
  const l2 = dot(d, d);
  return l2 > 1e-12 ? clamp01(dot(sub(p, a), d) / l2) : 0;
};
const at = (a: Vec, b: Vec, u: number): Vec => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

const held = (m: Move, t: number) => m.holds.filter((h) => t >= h.from - 1e-9 && t <= h.to + 1e-9);

/**
 * Pairs that may touch: a held hand on its partner's held hand, and on the wrist behind it; and
 * the two held forearms (10-27, step 4), whose wrists are only a clasp apart, so no margin between
 * them can hold. The floor's standing handhold has them 1–3 cm apart.
 */
function exempt(m: Move, t: number, a: string, b: string): boolean {
  return held(m, t).some((h) => {
    const ha = `hand-${SIDES[h.beau]}`;
    const hb = `hand-${SIDES[h.belle]}`;
    const fa = `forearm-${SIDES[h.beau]}`;
    const fb = `forearm-${SIDES[h.belle]}`;
    // 🧪 A forearm grip's hand is on the other's elbow, which is the end of their upper arm too; and
    // the wrist behind that hand lies on it (10-28). Kept apart by the margin, a thick forearm
    // (ember's 10 cm on a 7 cm hand) can't clasp the elbow: ember ×2 held its elbows 0.82 apart on
    // 0.60 forearms, the hands 3 cm short.
    const ub = `upper-${SIDES[h.belle]}`;
    const ua = `upper-${SIDES[h.beau]}`;
    if (h.forearm === true && (((a === ha || a === fa) && b === ub) || ((b === hb || b === fb) && a === ua))) return true;
    return (a === ha && (b === hb || b === fb)) || (b === hb && a === fa) || (a === fa && b === fb);
  });
}

/**
 * The rest of the two held arms, upper arm on upper arm or forearm, keep at most
 * {@link HELD_MARGIN} between them, whatever margin the solve asks of everything else (10-27). In
 * an arch over a short couple the held arms rise side by side, and the bakes' 6 cm between them
 * pushed the beau a step out (sprout → sprout, 15–17 cm at the join between two twirls), past
 * where the hands could still meet: 3.4 cm apart. With 2 cm they're 0.6. At no margin the arms
 * crossed into each other (0.1–0.5 cm of clip).
 */
export const HELD_MARGIN = 0.02;

function heldArms(m: Move, t: number, a: string, b: string): boolean {
  return held(m, t).some((h) => {
    const arm = (n: string, side: number) => n === `upper-${SIDES[side]}` || n === `forearm-${SIDES[side]}`;
    return arm(a, h.beau) && arm(b, h.belle) && (a.startsWith("upper") || b.startsWith("upper"));
  });
}

/** Everything about one sample that doesn't involve its neighbours. */
export function frameCost(m: Move, i: number, f: Frame, w: Weights = WEIGHTS, guide?: { at: Vec; weight: number }): number {
  const t = m.frames.length > 1 ? i / (m.frames.length - 1) : 0;
  const [bb, gb] = m.bodies;
  const A = shapesOf(bb, f[0]);
  const B = shapesOf(gb, f[1]);
  let c = 0;
  const pen = (s1: Shape, s2: Shape, margin: number) => {
    const d = segSeg(s1.a, s1.b, s2.a, s2.b);
    const over = s1.r + s2.r + margin - d;
    if (over > 0) c += w.clip * over * over;
  };
  for (const s1 of A) for (const s2 of B) if (!exempt(m, t, s1.name, s2.name)) pen(s1, s2, heldArms(m, t, s1.name, s2.name) ? Math.min(w.margin, HELD_MARGIN) : w.margin);
  // Each dancer's own arms against their own head and torso (an arm overhead goes round the head;
  // no arm goes through its own body). The upper arm starts at the shoulder, clear of the torso.
  [A, B].forEach((S, k) => {
    const body = m.bodies[k as 0 | 1];
    for (let j = 2; j < S.length; j++) for (const own of [0, 1] as const) {
      const s1 = S[j];
      const s2 = S[own];
      if (s1 !== undefined && s2 !== undefined) pen(s1, s2, ownMargin(body, j, own, w.margin));
    }
  });
  // Hands above the floor.
  for (const S of [A, B]) for (const s of S) if (s.name.startsWith("hand")) {
    const under = s.r - s.a[1];
    if (under > 0) c += w.clip * under * under;
  }
  // Held hands meet.
  const hs = held(m, t);
  for (const h of hs) {
    const ha = A.find((s) => s.name === `hand-${SIDES[h.beau]}`);
    const hb = B.find((s) => s.name === `hand-${SIDES[h.belle]}`);
    if (ha === undefined || hb === undefined) continue;
    if (h.forearm === true) {
      // Each hand on the other's elbow, a clasp of hand and forearm apart.
      const ea = A.find((s) => s.name === `forearm-${SIDES[h.beau]}`);
      const eb = B.find((s) => s.name === `forearm-${SIDES[h.belle]}`);
      if (ea === undefined || eb === undefined) continue;
      for (const [hand, fore, k] of [[ha, eb, 0], [hb, ea, 1]] as const) {
        const spot = at(fore.a, fore.b, along(hand.a, fore.a, fore.b, gripSlides(m, k)));
        const e = len(sub(hand.a, spot)) - w.clasp * (hand.r + fore.r);
        c += w.hold * (h.weight ?? 1) * e * e;
      }
      if (h.gripHeight !== undefined) {
        for (const p of [ha.a, hb.a, ea.a, eb.a]) c += w.plane * (p[1] - h.gripHeight) ** 2;
        // Over the two held shoulders (10-28), not the two bodies: ryan's shoulder is 46 cm off his
        // centre and sprout's 20, and over the bodies sprout's 10 cm upper arm was pulled out level.
        const fa = A.find((s) => s.name === `upper-${SIDES[h.beau]}`);
        const fb = B.find((s) => s.name === `upper-${SIDES[h.belle]}`);
        if (fa && fb) {
          const mx = (ea.a[0] + eb.a[0]) / 2 - (fa.a[0] + fb.a[0]) / 2;
          const mz = (ea.a[2] + eb.a[2]) / 2 - (fa.a[2] + fb.a[2]) / 2;
          c += w.plane * (mx * mx + mz * mz);
        }
      }
      continue;
    }
    const d = len(sub(ha.a, hb.a));
    const want = w.clasp * (ha.r + hb.r);
    c += w.hold * (h.weight ?? 1) * (d - want) * (d - want);
    if (h.plane !== undefined) {
      const mid: Vec = [(ha.a[0] + hb.a[0]) / 2, (ha.a[1] + hb.a[1]) / 2, (ha.a[2] + hb.a[2]) / 2];
      const off = dot(sub(mid, h.plane.p), h.plane.n);
      c += w.plane * off * off;
    }
    if (guide !== undefined && guide.weight > 0) {
      const mid: Vec = [(ha.a[0] + hb.a[0]) / 2, (ha.a[1] + hb.a[1]) / 2, (ha.a[2] + hb.a[2]) / 2];
      const g = sub(mid, guide.at);
      c += guide.weight * dot(g, g);
    }
    const lift = m.lift?.[i];
    if (lift !== undefined) {
      const low = lift - (ha.a[1] + hb.a[1]) / 2;
      if (low > 0) c += w.plane * low * low;
    }
  }
  // Natural: stretch, free arms hang, held arms are low, angles in range, the beau near his path.
  f.forEach((d, k) => {
    const built = m.bodies[k];
    if (built === undefined) return;
    const body = wornBody(built, d.grow ?? 0);
    const room = m.grow?.[k];
    if (room !== undefined) {
      const g = d.grow ?? 0;
      c += growEnds(m, i, w) * room.weight * g * g / built.rise.height;
      if (g < room.min) c += w.clip * (room.min - g) ** 2;
      if (g > room.max) c += w.clip * (g - room.max) ** 2;
    }
    d.arms.forEach((a, side) => {
      const su = a.ulen / body.upper0 - 1;
      const sf = a.flen / body.fore0 - 1;
      c += w.stretch * (su * su + sf * sf);
      if (su < -SHRINK) c += w.range * (su + SHRINK) ** 2;
      if (a.ulen > body.upper0) c += w.clip * (a.ulen - body.upper0) ** 2;
      if (sf < -SHRINK) c += w.range * (sf + SHRINK) ** 2;
      // Held arms low against their own shoulder, so growing isn't paid for twice.
      const isHeld = hs.some((h) => (k === 0 ? h.beau : h.belle) === side);
      if (isHeld) {
        const p = armPoints(body, side as 0 | 1, a);
        c += w.gravity * (p.e[1] + p.h[1] - 2 * body.shoulder[0][1]);
      } else {
        const r = restArm(body);
        c += w.rest * ((a.raise - r.raise) ** 2 + (a.pitch - r.pitch) ** 2 + 0.1 * (a.heading ** 2 + a.toward ** 2));
      }
      // The shoulder's range: a raised arm swung far behind the back costs.
      const back = -Math.sin(a.raise) * Math.cos(a.toward);
      if (back > 0.3) c += w.range * (back - 0.3) ** 2;
      if (a.raise < 0) c += w.range * a.raise * a.raise;
      if (a.raise > Math.PI) c += w.range * (a.raise - Math.PI) ** 2;
      if (a.pitch > Math.PI / 2) c += w.range * (a.pitch - Math.PI / 2) ** 2;
      if (a.pitch < -Math.PI / 2) c += w.range * (a.pitch + Math.PI / 2) ** 2;
    });
  });
  if (m.trade === true && m.grow !== undefined) c += tradeCost(f[0].grow ?? 0, f[1].grow ?? 0, bb.rise.height, gb.rise.height, m.grow, w.clip)[0];
  // Ryan's keyframes: each dial he set pulls its variable toward his value.
  if (m.targets !== undefined) for (const g of m.targets) {
    if (g.i !== i) continue;
    const a = f[g.dancer].arms[g.side];
    const v = a[g.key];
    const d = isLength(g.key) ? (v - g.value) * METRE : wrapRad(v - g.value);
    c += w.target * g.weight * d * d;
  }
  return c;
}

const isLength = (k: ArmKey) => k === "ulen" || k === "flen";
const wrapRad = (d: number) => Math.atan2(Math.sin(d), Math.cos(d));

/** A `#review2` arm dial (`<dancer>.<part>.<aspect>`) → the solver variable it is, in solver units. */
const DIAL_TO_ARM: Readonly<Record<string, { key: ArmKey; scale: number }>> = {
  "upper-arm.raise": { key: "raise", scale: D2R },
  "upper-arm.toward": { key: "toward", scale: D2R },
  "upper-arm.length": { key: "ulen", scale: 0.01 },
  "forearm.pitch": { key: "pitch", scale: D2R },
  "forearm.heading": { key: "heading", scale: D2R },
  "forearm.length": { key: "flen", scale: 0.01 },
};

/**
 * 🧪 Ryan's keyframes → {@link Target}s on `n` samples (2026-10-26). Only the dials he **set**
 * (`setKeys`) pull: the rest of a keyframe is what the figure happened to show, and pulling toward
 * that would pull the solve back to the floor's pose. A keyframe between two samples splits its
 * weight between them by nearness. Dials the solver has no variable for (torso, head, hand turn)
 * come back in `unused`, so a caller can say they were left out.
 */
export function targetsFromKeyframes(
  keyframes: readonly { t: number; values: Readonly<Record<string, number>>; setKeys: readonly string[]; weight?: number }[],
  n: number,
): { targets: Target[]; unused: string[] } {
  const targets: Target[] = [];
  const unused = new Set<string>();
  for (const k of keyframes) {
    const u = Math.min(1, Math.max(0, k.t)) * (n - 1);
    const i0 = Math.floor(u);
    const i1 = Math.min(n - 1, i0 + 1);
    const frac = u - i0;
    for (const key of k.setKeys) {
      const value = k.values[key];
      const m = /^([01])\.(upper-arm|forearm)-(left|right)\.(\w+)$/.exec(key);
      const spec = m === null ? undefined : DIAL_TO_ARM[`${m[2] ?? ""}.${m[4] ?? ""}`];
      if (m === null || spec === undefined || value === undefined) {
        unused.add(key);
        continue;
      }
      const base = { dancer: (m[1] === "0" ? 0 : 1) as 0 | 1, side: (m[3] === "left" ? 0 : 1) as 0 | 1, key: spec.key, value: value * spec.scale };
      const w = k.weight ?? 1;
      if (1 - frac > 1e-6) targets.push({ ...base, i: i0, weight: w * (1 - frac) });
      if (frac > 1e-6 && i1 !== i0) targets.push({ ...base, i: i1, weight: w * frac });
    }
  }
  return { targets, unused: [...unused].sort() };
}

// ── Variables ────────────────────────────────────────────────────────────────────────────────

const ARM_KEYS = ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const;
export type ArmKey = (typeof ARM_KEYS)[number];
/**
 * Per sample: 2 dancers × 2 arms × 6, then the beau's step out (away from her) and sideways, then
 * each dancer's growth (beau, belle; 10-27).
 */
export const PER = 2 * 2 * 6 + 2 + 2;
/** Where sample `i`'s growth for `dancer` sits in `v`. */
export const GROW_AT = (i: number, dancer: 0 | 1) => i * PER + 26 + dancer;
/** Lengths and offsets are metres; weigh their smoothness as if a metre were this many radians. */
const METRE = 3;
const isMetric = (k: number) => k >= 24 || ARM_KEYS[k % 6] === "ulen" || ARM_KEYS[k % 6] === "flen";

export function pack(frames: readonly Frame[]): Float64Array {
  const v = new Float64Array(frames.length * PER);
  frames.forEach((f, i) => {
    let k = i * PER;
    for (const d of f) for (const a of d.arms) for (const key of ARM_KEYS) v[k++] = a[key];
    v[k++] = 0;
    v[k++] = 0;
    v[k++] = f[0].grow ?? 0;
    v[k++] = f[1].grow ?? 0;
  });
  return v;
}

export function unpackOne(v: Float64Array, i: number, base: Frame): Frame {
  let k = i * PER;
  const dancer = (d: DancerFrame, dx: number, dz: number): DancerFrame => {
    const arms = d.arms.map(() => {
      const a = {} as Arm;
      for (const key of ARM_KEYS) a[key] = v[k++] ?? 0;
      return a;
    }) as [Arm, Arm];
    return { ...d, x: d.x + dx, z: d.z + dz, arms };
  };
  const grow = (d: 0 | 1) => v[GROW_AT(i, d)] ?? 0;
  // "Just the beau steps out": along the line from her to him, plus a (costly) sideways part.
  const out = v[i * PER + 24] ?? 0;
  const side = v[i * PER + 25] ?? 0;
  const ux = base[0].x - base[1].x;
  const uz = base[0].z - base[1].z;
  const ul = Math.hypot(ux, uz) || 1;
  const beau = dancer(base[0], (ux / ul) * out - (uz / ul) * side, (uz / ul) * out + (ux / ul) * side);
  const belle = dancer(base[1], 0, 0);
  return [{ ...beau, grow: grow(0) }, { ...belle, grow: grow(1) }];
}

function smoothCost(v: Float64Array, n: number, w: Weights, grad?: Float64Array, home = false, stepCap?: number): number {
  let c = 0;
  for (let k = 0; k < PER; k++) {
    const sc = isMetric(k) ? METRE * METRE : 1;
    for (let i = 0; i + 1 < n; i++) {
      const d = (v[(i + 1) * PER + k] ?? 0) - (v[i * PER + k] ?? 0);
      c += w.smooth1 * sc * d * d;
      if (grad) {
        grad[(i + 1) * PER + k] = (grad[(i + 1) * PER + k] ?? 0) + 2 * w.smooth1 * sc * d;
        grad[i * PER + k] = (grad[i * PER + k] ?? 0) - 2 * w.smooth1 * sc * d;
      }
    }
    for (let i = 1; i + 1 < n; i++) {
      const a = (v[(i + 1) * PER + k] ?? 0) - 2 * (v[i * PER + k] ?? 0) + (v[(i - 1) * PER + k] ?? 0);
      c += w.smooth2 * sc * a * a;
      if (grad) {
        const g = 2 * w.smooth2 * sc * a;
        grad[(i + 1) * PER + k] = (grad[(i + 1) * PER + k] ?? 0) + g;
        grad[i * PER + k] = (grad[i * PER + k] ?? 0) - 2 * g;
        grad[(i - 1) * PER + k] = (grad[(i - 1) * PER + k] ?? 0) + g;
      }
    }
    // The beau's offset costs for itself, not only for changing.
    if (k === 24 || k === 25) for (let i = 0; i < n; i++) {
      const x = v[i * PER + k] ?? 0;
      const ws = home && (i === 0 || i === n - 1) ? 10 * w.clip : k === 25 ? w.step * 25 : w.step;
      c += ws * x * x;
      if (grad) grad[i * PER + k] = (grad[i * PER + k] ?? 0) + 2 * ws * x;
    }
  }
  // 🧪 The step cap (step 7, 10-28): past `stepCap` the beau's step costs ten times clipping, as
  // `home` pins a call's ends. At clipping's own weight the twirl still stepped 4 cm past a 10 cm cap.
  if (stepCap !== undefined) for (let i = 0; i < n; i++) {
    const x = v[i * PER + 24] ?? 0;
    const y = v[i * PER + 25] ?? 0;
    const r = Math.hypot(x, y);
    if (r <= stepCap) continue;
    const over = r - stepCap;
    c += 10 * w.clip * over * over;
    if (grad) {
      const k = (20 * w.clip * over) / r;
      grad[i * PER + 24] = (grad[i * PER + 24] ?? 0) + k * x;
      grad[i * PER + 25] = (grad[i * PER + 25] ?? 0) + k * y;
    }
  }
  return c;
}

// ── The exact gradient (2026-10-26, step 2) ──────────────────────────────────────────────────
//
// `frameCost` again, with its gradient worked out by hand: each term's derivative with respect to
// the shapes' end points, then back through `toFloor` and `armPoints` to the dials and the beau's
// step. A clearance's derivative is the closest-points direction (the closest points are a
// minimum, so they don't move the distance to first order). It's checked against `frameCost` by
// central differences in the tests. Flat arrays and no allocation in the loop: this is what runs
// 120,000 times a solve.
//
// Per dancer, points: 0 torso foot, 1 torso top, 2 head, then per side 3 + 4·side + (shoulder,
// elbow, wrist, hand). Shapes, in `shapesOf`'s order: torso, head, then per side upper arm,
// forearm, hand.

const NPT = 11;
/** Each shape's two end points (a sphere's are the same point). */
const SHAPE_PTS = [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10] as const;
const HAND_PT = (side: 0 | 1) => 6 + 4 * side;
const ELBOW_PT = (side: 0 | 1) => 4 + 4 * side;
const PTS = new Float64Array(2 * NPT * 3);
const GPT = new Float64Array(2 * NPT * 3);
/** Per arm: d elbow / d (raise, toward, ulen), the forearm's direction, d dir / d (pitch, heading). */
const JAC = new Float64Array(4 * 18);
const SHAPE_R = new Float64Array(16);

/** What about a sample doesn't change during a solve: what's held, and what may touch. */
export interface SamplePlan {
  holds: Hold[];
  /** Beau shape × belle shape, 8 × 8: 1 where a held hand may touch, 2 where held arms keep only {@link HELD_MARGIN}. */
  exempt: Uint8Array;
  /** dancer · 2 + side: that arm is held. */
  heldArm: [boolean, boolean, boolean, boolean];
  targets: Target[];
}

export function planOf(m: Move): SamplePlan[] {
  const n = m.frames.length;
  return m.frames.map((_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const holds = held(m, t);
    const exempt = new Uint8Array(64);
    for (const h of holds) {
      const ha = 4 + 3 * h.beau;
      const hb = 4 + 3 * h.belle;
      exempt[ha * 8 + hb] = 1;
      exempt[ha * 8 + hb - 1] = 1;
      exempt[(ha - 1) * 8 + hb] = 1;
      exempt[(ha - 1) * 8 + hb - 1] = 1;
      // 🧪 A forearm grip's hand is on the other's elbow, the end of their upper arm too, and the
      // wrist behind it lies on it (10-28; `exempt`).
      if (h.forearm === true) {
        exempt[ha * 8 + hb - 2] = 1;
        exempt[(ha - 2) * 8 + hb] = 1;
        exempt[(ha - 1) * 8 + hb - 2] = 1;
        exempt[(ha - 2) * 8 + hb - 1] = 1;
      }
      for (const [x, y] of [[ha - 2, hb - 2], [ha - 2, hb - 1], [ha - 1, hb - 2]] as const) if (exempt[x * 8 + y] === 0) exempt[x * 8 + y] = 2;
    }
    const heldArm: SamplePlan["heldArm"] = [false, false, false, false];
    for (const h of holds) {
      heldArm[h.beau] = true;
      heldArm[2 + h.belle] = true;
    }
    return { holds, exempt, heldArm, targets: (m.targets ?? []).filter((g) => g.i === i) };
  });
}

let segS = 0;
let segT = 0;
const SEG_N = new Float64Array(3);

/** `segSeg` on `PTS` by point index; leaves the closest points' parameters and their unit direction. */
function segSegAt(p1: number, q1: number, p2: number, q2: number): number {
  const P = PTS;
  const d1x = P[q1]! - P[p1]!, d1y = P[q1 + 1]! - P[p1 + 1]!, d1z = P[q1 + 2]! - P[p1 + 2]!;
  const d2x = P[q2]! - P[p2]!, d2y = P[q2 + 1]! - P[p2 + 1]!, d2z = P[q2 + 2]! - P[p2 + 2]!;
  const rx = P[p1]! - P[p2]!, ry = P[p1 + 1]! - P[p2 + 1]!, rz = P[p1 + 2]! - P[p2 + 2]!;
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e <= 1e-12) {
    // Two points.
  } else if (a <= 1e-12) {
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-12) {
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const x = rx + d1x * s - d2x * t;
  const y = ry + d1y * s - d2y * t;
  const z = rz + d1z * s - d2z * t;
  const d = Math.sqrt(x * x + y * y + z * z);
  segS = s;
  segT = t;
  const inv = d > 1e-12 ? 1 / d : 0;
  SEG_N[0] = x * inv;
  SEG_N[1] = y * inv;
  SEG_N[2] = z * inv;
  return d;
}

const addPt = (p: number, k: number, x: number, y: number, z: number) => {
  GPT[p] = GPT[p]! + k * x;
  GPT[p + 1] = GPT[p + 1]! + k * y;
  GPT[p + 2] = GPT[p + 2]! + k * z;
};

/**
 * `frameCost` of sample `i` (its variables at `v[i·PER…]`), and its gradient added into `grad` at
 * the same place. Same terms, same weights; `frameCost` stays as the readable statement of them.
 */
export function frameCostGrad(
  m: Move, plan: SamplePlan, i: number, v: Float64Array, base: Frame, w: Weights,
  guide: { at: Vec; weight: number } | undefined, grad: Float64Array,
): number {
  const o = i * PER;
  GPT.fill(0);
  // The beau's step: along the line from her to him, plus sideways.
  const ux0 = base[0].x - base[1].x;
  const uz0 = base[0].z - base[1].z;
  const ul = Math.hypot(ux0, uz0) || 1;
  const ux = ux0 / ul;
  const uz = uz0 / ul;
  const out = v[o + 24]!;
  const side = v[o + 25]!;
  // Forward: every point in the floor frame.
  for (let d = 0; d < 2; d++) {
    const b = m.bodies[d as 0 | 1];
    const f = base[d as 0 | 1];
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    const tx = f.x + (d === 0 ? ux * out - uz * side : 0);
    const tz = f.z + (d === 0 ? uz * out + ux * side : 0);
    const put = (p: number, x: number, y: number, z: number) => {
      const j = (d * NPT + p) * 3;
      PTS[j] = x * c + z * s + tx;
      PTS[j + 1] = y;
      PTS[j + 2] = -x * s + z * c + tz;
    };
    // Growing (10-27): the torso's top, the head and the shoulders rise; the feet stay put.
    const gr = v[o + 26 + d]!;
    const R = b.rise;
    put(0, b.torso.a[0], b.torso.a[1], b.torso.a[2]);
    put(1, b.torso.b[0] + R.top[0] * gr, b.torso.b[1] + R.top[1] * gr, b.torso.b[2] + R.top[2] * gr);
    put(2, b.head.c[0] + R.head[0] * gr, b.head.c[1] + R.head[1] * gr, b.head.c[2] + R.head[2] * gr);
    for (let sd = 0; sd < 2; sd++) {
      const k = o + d * 12 + sd * 6;
      const raise = v[k]!, toward = v[k + 1]!, ulen = v[k + 2]!, pitch = v[k + 3]!, heading = v[k + 4]!, flen = v[k + 5]!;
      const S0 = b.shoulder[sd as 0 | 1];
      const RS = R.shoulder[sd as 0 | 1];
      const S = [S0[0] + RS[0] * gr, S0[1] + RS[1] * gr, S0[2] + RS[2] * gr] as const;
      const g = sign(sd as 0 | 1);
      const sr = Math.sin(raise), cr = Math.cos(raise), st = Math.sin(toward), ct = Math.cos(toward);
      const sp = Math.sin(pitch), cp = Math.cos(pitch), sh = Math.sin(heading), ch = Math.cos(heading);
      const ex = S[0] + g * sr * st * ulen, ey = S[1] - cr * ulen, ez = S[2] + sr * ct * ulen;
      const dx = g * cp * sh, dy = sp, dz = cp * ch;
      const wl = (b.forearm * flen) / b.fore0;
      put(3 + 4 * sd, S[0], S[1], S[2]);
      put(4 + 4 * sd, ex, ey, ez);
      put(5 + 4 * sd, ex + dx * wl, ey + dy * wl, ez + dz * wl);
      put(6 + 4 * sd, ex + dx * flen, ey + dy * flen, ez + dz * flen);
      const J = (d * 2 + sd) * 18;
      JAC[J] = g * cr * st * ulen; JAC[J + 1] = sr * ulen; JAC[J + 2] = cr * ct * ulen;
      JAC[J + 3] = g * sr * ct * ulen; JAC[J + 4] = 0; JAC[J + 5] = -sr * st * ulen;
      JAC[J + 6] = g * sr * st; JAC[J + 7] = -cr; JAC[J + 8] = sr * ct;
      JAC[J + 9] = dx; JAC[J + 10] = dy; JAC[J + 11] = dz;
      JAC[J + 12] = -g * sp * sh; JAC[J + 13] = cp; JAC[J + 14] = -sp * ch;
      JAC[J + 15] = g * cp * ch; JAC[J + 16] = 0; JAC[J + 17] = -cp * sh;
    }
  }
  for (let d = 0; d < 2; d++) {
    const b = m.bodies[d as 0 | 1];
    const r = SHAPE_R;
    const q = d * 8;
    r[q] = b.torso.r; r[q + 1] = b.head.r;
    r[q + 2] = r[q + 3] = r[q + 5] = r[q + 6] = b.forearmR;
    r[q + 4] = r[q + 7] = b.handR;
  }
  let cost = 0;
  const pen = (da: number, sa: number, db: number, sb: number, margin: number) => {
    const p1 = (da * NPT + SHAPE_PTS[sa * 2]!) * 3, q1 = (da * NPT + SHAPE_PTS[sa * 2 + 1]!) * 3;
    const p2 = (db * NPT + SHAPE_PTS[sb * 2]!) * 3, q2 = (db * NPT + SHAPE_PTS[sb * 2 + 1]!) * 3;
    const dist = segSegAt(p1, q1, p2, q2);
    const over = SHAPE_R[da * 8 + sa]! + SHAPE_R[db * 8 + sb]! + margin - dist;
    if (over <= 0) return;
    cost += w.clip * over * over;
    const k = -2 * w.clip * over;
    const nx = SEG_N[0]!, ny = SEG_N[1]!, nz = SEG_N[2]!;
    addPt(p1, k * (1 - segS), nx, ny, nz);
    addPt(q1, k * segS, nx, ny, nz);
    addPt(p2, -k * (1 - segT), nx, ny, nz);
    addPt(q2, -k * segT, nx, ny, nz);
  };
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if (plan.exempt[a * 8 + b] !== 1) pen(0, a, 1, b, plan.exempt[a * 8 + b] === 2 ? Math.min(w.margin, HELD_MARGIN) : w.margin);
  for (let d = 0; d < 2; d++) for (let s = 2; s < 8; s++) for (const own of [0, 1] as const) pen(d, s, d, own, ownMargin(m.bodies[d as 0 | 1], s, own, w.margin));
  // Hands above the floor.
  for (let d = 0; d < 2; d++) for (let sd = 0; sd < 2; sd++) {
    const p = (d * NPT + HAND_PT(sd as 0 | 1)) * 3;
    const under = m.bodies[d as 0 | 1].handR - PTS[p + 1]!;
    if (under > 0) {
      cost += w.clip * under * under;
      GPT[p + 1] = GPT[p + 1]! - 2 * w.clip * under;
    }
  }
  // Held hands meet, in their plane, and (early in the run) near the guide.
  for (const h of plan.holds) {
    const pa = HAND_PT(h.beau) * 3;
    const pb = (NPT + HAND_PT(h.belle)) * 3;
    if (h.forearm === true) {
      const wh = w.hold * (h.weight ?? 1);
      const ea = ELBOW_PT(h.beau) * 3;
      const eb = (NPT + ELBOW_PT(h.belle)) * 3;
      // Each hand at the partner's elbow, or (the shorter forearm's, `gripSlides`) at the closest
      // point of their forearm: the elbow and wrist share the pull as the clamp parameter splits it.
      for (const [hp, ep, want, slide] of [
        [pa, eb, w.clasp * (m.bodies[0].handR + m.bodies[1].forearmR), gripSlides(m, 0)],
        [pb, ea, w.clasp * (m.bodies[1].handR + m.bodies[0].forearmR), gripSlides(m, 1)],
      ] as const) {
        const wp = ep + 3;
        let u = 0;
        if (slide) {
          const dx = PTS[wp]! - PTS[ep]!, dy = PTS[wp + 1]! - PTS[ep + 1]!, dz = PTS[wp + 2]! - PTS[ep + 2]!;
          const l2 = dx * dx + dy * dy + dz * dz;
          if (l2 > 1e-12) u = clamp01(((PTS[hp]! - PTS[ep]!) * dx + (PTS[hp + 1]! - PTS[ep + 1]!) * dy + (PTS[hp + 2]! - PTS[ep + 2]!) * dz) / l2);
        }
        const cx = PTS[ep]! + (PTS[wp]! - PTS[ep]!) * u;
        const cy = PTS[ep + 1]! + (PTS[wp + 1]! - PTS[ep + 1]!) * u;
        const cz = PTS[ep + 2]! + (PTS[wp + 2]! - PTS[ep + 2]!) * u;
        const x = PTS[hp]! - cx, y = PTS[hp + 1]! - cy, z = PTS[hp + 2]! - cz;
        const dist = Math.sqrt(x * x + y * y + z * z);
        cost += wh * (dist - want) * (dist - want);
        if (dist > 1e-12) {
          const k = (2 * wh * (dist - want)) / dist;
          addPt(hp, k, x, y, z);
          addPt(ep, -k * (1 - u), x, y, z);
          if (u > 0) addPt(wp, -k * u, x, y, z);
        }
      }
      if (h.gripHeight !== undefined) {
        for (const p of [pa, pb, ea, eb]) {
          const dy = PTS[p + 1]! - h.gripHeight;
          cost += w.plane * dy * dy;
          GPT[p + 1] = GPT[p + 1]! + 2 * w.plane * dy;
        }
        // The elbows' midpoint over the two held shoulders' (point 3 + 4·side).
        const fa = (3 + 4 * h.beau) * 3, fb = (NPT + 3 + 4 * h.belle) * 3;
        const mx = (PTS[ea]! + PTS[eb]! - PTS[fa]! - PTS[fb]!) / 2;
        const mz = (PTS[ea + 2]! + PTS[eb + 2]! - PTS[fa + 2]! - PTS[fb + 2]!) / 2;
        cost += w.plane * (mx * mx + mz * mz);
        addPt(ea, w.plane, mx, 0, mz);
        addPt(eb, w.plane, mx, 0, mz);
        addPt(fa, -w.plane, mx, 0, mz);
        addPt(fb, -w.plane, mx, 0, mz);
      }
      continue;
    }
    const x = PTS[pa]! - PTS[pb]!, y = PTS[pa + 1]! - PTS[pb + 1]!, z = PTS[pa + 2]! - PTS[pb + 2]!;
    const dist = Math.sqrt(x * x + y * y + z * z);
    const want = w.clasp * (m.bodies[0].handR + m.bodies[1].handR);
    const wh = w.hold * (h.weight ?? 1);
    cost += wh * (dist - want) * (dist - want);
    if (dist > 1e-12) {
      const k = (2 * wh * (dist - want)) / dist;
      addPt(pa, k, x, y, z);
      addPt(pb, -k, x, y, z);
    }
    const mx = (PTS[pa]! + PTS[pb]!) / 2, my = (PTS[pa + 1]! + PTS[pb + 1]!) / 2, mz = (PTS[pa + 2]! + PTS[pb + 2]!) / 2;
    if (h.plane !== undefined) {
      const { p, n } = h.plane;
      const off = (mx - p[0]) * n[0] + (my - p[1]) * n[1] + (mz - p[2]) * n[2];
      cost += w.plane * off * off;
      const k = w.plane * off; // 2·w·off, half to each hand
      addPt(pa, k, n[0], n[1], n[2]);
      addPt(pb, k, n[0], n[1], n[2]);
    }
    if (guide !== undefined && guide.weight > 0) {
      const gx = mx - guide.at[0], gy = my - guide.at[1], gz = mz - guide.at[2];
      cost += guide.weight * (gx * gx + gy * gy + gz * gz);
      addPt(pa, guide.weight, gx, gy, gz);
      addPt(pb, guide.weight, gx, gy, gz);
    }
    const lift = m.lift?.[i];
    if (lift !== undefined && lift > my) {
      const low = lift - my;
      cost += w.plane * low * low;
      // d/d my = −2·w·low, half to each hand.
      addPt(pa, -w.plane * low, 0, 1, 0);
      addPt(pb, -w.plane * low, 0, 1, 0);
    }
  }
  // Natural, straight on the dials (gravity on the elbow's and hand's height over the shoulder's).
  for (let d = 0; d < 2; d++) {
    const b = m.bodies[d as 0 | 1];
    const gk = o + 26 + d;
    const gr = v[gk]!;
    const room = m.grow?.[d];
    if (room !== undefined) {
      const wg = growEnds(m, i, w);
      cost += wg * room.weight * gr * gr / b.rise.height;
      grad[gk] = grad[gk]! + 2 * wg * room.weight * gr / b.rise.height;
      if (gr < room.min) {
        cost += w.clip * (room.min - gr) ** 2;
        grad[gk] = grad[gk]! - 2 * w.clip * (room.min - gr);
      }
      if (gr > room.max) {
        cost += w.clip * (gr - room.max) ** 2;
        grad[gk] = grad[gk]! + 2 * w.clip * (gr - room.max);
      }
    }
    const shoulderY = b.shoulder[0][1] + b.rise.shoulder[0][1] * gr;
    for (let sd = 0; sd < 2; sd++) {
      const k = o + d * 12 + sd * 6;
      const raise = v[k]!, toward = v[k + 1]!, ulen = v[k + 2]!, pitch = v[k + 3]!, heading = v[k + 4]!, flen = v[k + 5]!;
      const su = ulen / b.upper0 - 1;
      const sf = flen / b.fore0 - 1;
      cost += w.stretch * (su * su + sf * sf);
      grad[k + 2] = grad[k + 2]! + (2 * w.stretch * su) / b.upper0;
      grad[k + 5] = grad[k + 5]! + (2 * w.stretch * sf) / b.fore0;
      if (su < -SHRINK) {
        cost += w.range * (su + SHRINK) ** 2;
        grad[k + 2] = grad[k + 2]! + (2 * w.range * (su + SHRINK)) / b.upper0;
      }
      if (ulen > b.upper0) {
        cost += w.clip * (ulen - b.upper0) ** 2;
        grad[k + 2] = grad[k + 2]! + 2 * w.clip * (ulen - b.upper0);
      }
      if (sf < -SHRINK) {
        cost += w.range * (sf + SHRINK) ** 2;
        grad[k + 5] = grad[k + 5]! + (2 * w.range * (sf + SHRINK)) / b.fore0;
      }
      if (plan.heldArm[d * 2 + sd] === true) {
        const pe = (d * NPT + 4 + 4 * sd) * 3;
        const ph = (d * NPT + 6 + 4 * sd) * 3;
        cost += w.gravity * (PTS[pe + 1]! + PTS[ph + 1]! - 2 * shoulderY);
        GPT[pe + 1] = GPT[pe + 1]! + w.gravity;
        GPT[ph + 1] = GPT[ph + 1]! + w.gravity;
        grad[gk] = grad[gk]! - 2 * w.gravity * b.rise.shoulder[0][1];
      } else {
        const dp = pitch + Math.PI / 2;
        cost += w.rest * (raise * raise + dp * dp + 0.1 * (heading * heading + toward * toward));
        grad[k] = grad[k]! + 2 * w.rest * raise;
        grad[k + 1] = grad[k + 1]! + 0.2 * w.rest * toward;
        grad[k + 3] = grad[k + 3]! + 2 * w.rest * dp;
        grad[k + 4] = grad[k + 4]! + 0.2 * w.rest * heading;
      }
      const back = -Math.sin(raise) * Math.cos(toward);
      if (back > 0.3) {
        cost += w.range * (back - 0.3) ** 2;
        const g = 2 * w.range * (back - 0.3);
        grad[k] = grad[k]! - g * Math.cos(raise) * Math.cos(toward);
        grad[k + 1] = grad[k + 1]! + g * Math.sin(raise) * Math.sin(toward);
      }
      if (raise < 0) {
        cost += w.range * raise * raise;
        grad[k] = grad[k]! + 2 * w.range * raise;
      }
      if (raise > Math.PI) {
        cost += w.range * (raise - Math.PI) ** 2;
        grad[k] = grad[k]! + 2 * w.range * (raise - Math.PI);
      }
      if (pitch > Math.PI / 2) {
        cost += w.range * (pitch - Math.PI / 2) ** 2;
        grad[k + 3] = grad[k + 3]! + 2 * w.range * (pitch - Math.PI / 2);
      }
      if (pitch < -Math.PI / 2) {
        cost += w.range * (pitch + Math.PI / 2) ** 2;
        grad[k + 3] = grad[k + 3]! + 2 * w.range * (pitch + Math.PI / 2);
      }
    }
  }
  if (m.trade === true && m.grow !== undefined) {
    const [c, db, dg] = tradeCost(v[o + 26]!, v[o + 27]!, m.bodies[0].rise.height, m.bodies[1].rise.height, m.grow, w.clip);
    cost += c;
    grad[o + 26] = grad[o + 26]! + db;
    grad[o + 27] = grad[o + 27]! + dg;
  }
  // Ryan's keyframes.
  for (const g of plan.targets) {
    const k = o + g.dancer * 12 + g.side * 6 + ARM_KEYS.indexOf(g.key);
    const x = v[k]!;
    const scale = isLength(g.key) ? METRE : 1;
    const dv = isLength(g.key) ? (x - g.value) * METRE : wrapRad(x - g.value);
    cost += w.target * g.weight * dv * dv;
    grad[k] = grad[k]! + 2 * w.target * g.weight * dv * scale;
  }
  // Back: points → dials and the beau's step.
  for (let d = 0; d < 2; d++) {
    const b = m.bodies[d as 0 | 1];
    const f = base[d as 0 | 1];
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    let sumX = 0;
    let sumZ = 0;
    // Each point's floor gradient, turned into the rig's frame, in place.
    for (let p = 0; p < NPT; p++) {
      const j = (d * NPT + p) * 3;
      const gx = GPT[j]!, gz = GPT[j + 2]!;
      sumX += gx;
      sumZ += gz;
      GPT[j] = gx * c - gz * s;
      GPT[j + 2] = gx * s + gz * c;
    }
    if (d === 0) {
      grad[o + 24] = grad[o + 24]! + sumX * ux + sumZ * uz;
      grad[o + 25] = grad[o + 25]! - sumX * uz + sumZ * ux;
    }
    // Growing moves the torso's top and the head, and each shoulder with its whole arm.
    {
      const R = b.rise;
      const at = (p: number, r: Vec) => {
        const j = (d * NPT + p) * 3;
        return GPT[j]! * r[0] + GPT[j + 1]! * r[1] + GPT[j + 2]! * r[2];
      };
      let gg = at(1, R.top) + at(2, R.head);
      for (let sd = 0; sd < 2; sd++) for (let p = 3; p < 7; p++) gg += at(p + 4 * sd, R.shoulder[sd as 0 | 1]);
      grad[o + 26 + d] = grad[o + 26 + d]! + gg;
    }
    for (let sd = 0; sd < 2; sd++) {
      const k = o + d * 12 + sd * 6;
      const flen = v[k + 5]!;
      const J = (d * 2 + sd) * 18;
      const je = (d * NPT + 4 + 4 * sd) * 3;
      const jw = je + 3;
      const jh = je + 6;
      // Elbow dials move the elbow, wrist and hand alike.
      const Sx = GPT[je]! + GPT[jw]! + GPT[jh]!;
      const Sy = GPT[je + 1]! + GPT[jw + 1]! + GPT[jh + 1]!;
      const Sz = GPT[je + 2]! + GPT[jw + 2]! + GPT[jh + 2]!;
      grad[k] = grad[k]! + Sx * JAC[J]! + Sy * JAC[J + 1]! + Sz * JAC[J + 2]!;
      grad[k + 1] = grad[k + 1]! + Sx * JAC[J + 3]! + Sy * JAC[J + 4]! + Sz * JAC[J + 5]!;
      grad[k + 2] = grad[k + 2]! + Sx * JAC[J + 6]! + Sy * JAC[J + 7]! + Sz * JAC[J + 8]!;
      // Forearm dials: the wrist sits forearm/fore0 of the way along the hand's reach.
      const kl = b.forearm / b.fore0;
      const Tx = GPT[jw]! * kl + GPT[jh]!, Ty = GPT[jw + 1]! * kl + GPT[jh + 1]!, Tz = GPT[jw + 2]! * kl + GPT[jh + 2]!;
      grad[k + 3] = grad[k + 3]! + flen * (Tx * JAC[J + 12]! + Ty * JAC[J + 13]! + Tz * JAC[J + 14]!);
      grad[k + 4] = grad[k + 4]! + flen * (Tx * JAC[J + 15]! + Ty * JAC[J + 16]! + Tz * JAC[J + 17]!);
      grad[k + 5] = grad[k + 5]! + Tx * JAC[J + 9]! + Ty * JAC[J + 10]! + Tz * JAC[J + 11]!;
    }
  }
  return cost;
}

export interface SolveOptions {
  iterations?: number;
  rate?: number;
  weights?: Weights;
  /** A warm-start pull for the joined hands, faded out over the first `guideFor` of the run. */
  guide?: (i: number) => Vec;
  guideFor?: number;
  /**
   * 🧪 How the gradient is had (2026-10-26, step 2): `exact` (`frameCostGrad`, the default) or
   * `numeric`, central differences on `frameCost` as before, kept to compare against.
   */
  gradient?: "exact" | "numeric";
  /** 🧪 The step size at the end of the run; it falls geometrically from `rate`. Default: `rate`. */
  rateEnd?: number;
  /** 🧪 Gaussian noise on each step, in units of the step, falling with it (default 0). */
  jitter?: number;
  /** 🧪 The jitter's seed: a solve is deterministic for a seed; different seeds try other valleys. */
  seed?: number;
  /**
   * 🧪 A starting point for every variable (`PER` per sample, as `v` comes back), in place of
   * `m.frames`' arms and no step (2026-10-26, step 3: a model's prediction, polished). `m.frames`
   * stays the floor's path, so the step is still measured from it.
   */
  init?: Float64Array;
  /**
   * 🧪 Samples whose variables stay as `init` has them (10-27, step 4): the edges of a window
   * re-solved inside a longer track (`chain-join.ts`), so the window joins what's either side.
   */
  frozen?: readonly number[];
  onProgress?: (it: number, cost: number) => void;
}

/**
 * Adam over every sample at once. A sample's own cost depends on its own variables only; its
 * gradient is exact (`frameCostGrad`), or by central differences with `gradient: "numeric"`.
 * Smoothness is exact either way.
 */
export function solve(m: Move, o: SolveOptions = {}): { frames: Frame[]; cost: number; v: Float64Array } {
  const w = o.weights ?? WEIGHTS;
  const n = m.frames.length;
  const base = m.frames;
  if (o.init !== undefined && o.init.length !== n * PER) throw new Error(`solve: init has ${String(o.init.length)} values, wants ${String(n * PER)}`);
  const v = o.init !== undefined ? Float64Array.from(o.init) : pack(base);
  const iters = o.iterations ?? 1500;
  const lr0 = o.rate ?? 0.02;
  const lrEnd = o.rateEnd ?? lr0;
  const jitter = o.jitter ?? 0;
  let seed = Math.abs(Math.floor(o.seed ?? 1)) % 2147483648;
  const gauss = () => {
    // Box–Muller on a fixed LCG: the solve stays deterministic.
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const u = (seed + 1) / 2147483649;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const w = seed / 2147483648;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  };
  const mom = new Float64Array(v.length);
  const vel = new Float64Array(v.length);
  const b1 = 0.9;
  const b2 = 0.999;
  const h = 1e-4;
  const exact = o.gradient !== "numeric";
  const plans = exact ? planOf(m) : [];
  const guides = o.guide ? base.map((_, i) => o.guide?.(i)) : [];
  // A dancer with no room to grow keeps their height, and takes no step or noise: a solve with
  // nobody growing is the solve it was before growing existed, seed for seed.
  const fixed = [0, 1].map((d) => {
    const r = m.grow?.[d];
    return r === undefined || (r.min === 0 && r.max === 0);
  });
  const frozen = new Uint8Array(n);
  for (const i of o.frozen ?? []) if (i >= 0 && i < n) frozen[i] = 1;
  let cost = 0;
  for (let it = 1; it <= iters; it++) {
    const grad = new Float64Array(v.length);
    cost = smoothCost(v, n, w, grad, m.home === true, m.stepCap);
    const fade = o.guide && o.guideFor ? Math.max(0, 1 - it / (iters * o.guideFor)) : 0;
    for (let i = 0; i < n; i++) {
      const baseF = base[i];
      if (baseF === undefined) continue;
      const at = guides[i];
      const g = at !== undefined && fade > 0 ? { at, weight: 400 * fade } : undefined;
      const plan = plans[i];
      if (plan !== undefined) {
        cost += frameCostGrad(m, plan, i, v, baseF, w, g, grad);
        continue;
      }
      const f0 = frameCost(m, i, unpackOne(v, i, baseF), w, g);
      cost += f0;
      for (let k = 0; k < PER; k++) {
        const j = i * PER + k;
        const x = v[j] ?? 0;
        v[j] = x + h;
        const up = frameCost(m, i, unpackOne(v, i, baseF), w, g);
        v[j] = x - h;
        const dn = frameCost(m, i, unpackOne(v, i, baseF), w, g);
        v[j] = x;
        grad[j] = (grad[j] ?? 0) + (up - dn) / (2 * h);
      }
    }
    const lr = lr0 * (lrEnd / lr0) ** ((it - 1) / Math.max(1, iters - 1));
    for (let j = 0; j < v.length; j++) {
      const kk = j % PER;
      if (kk >= 26 && fixed[kk - 26] === true) continue;
      if (frozen[Math.floor(j / PER)] === 1) continue;
      const g = grad[j] ?? 0;
      mom[j] = b1 * (mom[j] ?? 0) + (1 - b1) * g;
      vel[j] = b2 * (vel[j] ?? 0) + (1 - b2) * g * g;
      const mh = (mom[j] ?? 0) / (1 - b1 ** it);
      const vh = (vel[j] ?? 0) / (1 - b2 ** it);
      v[j] = (v[j] ?? 0) - (lr * mh) / (Math.sqrt(vh) + 1e-8) + (jitter > 0 ? jitter * lr * gauss() : 0);
    }
    if (o.onProgress && (it % 100 === 0 || it === iters)) o.onProgress(it, cost);
  }
  const frames = base.map((f, i) => unpackOne(v, i, f));
  return { frames, cost, v };
}

/**
 * 🧪 The schedule for the exact gradient (2026-10-26, step 2, measured on the ryan → ryan twirl).
 * An exact gradient has none of central differences' rounding noise, and Adam, which scales each
 * variable's step by its own gradient, had been turning that noise into a useful shake: plain
 * exact Adam settled in a worse valley (cost 159, worst jump 31°) than the numeric run (148,
 * 26°). So the shake is put back on purpose: noise of half a step, with the step falling from 0.04
 * to 0.001 so it settles. Over 8 seeds, 5 land at cost about 137 (jumps 17–23°) and 3 at 147–162;
 * none clip. The best of 4 seeds finds the good valley about 98% of the time.
 */
export const SCHEDULE = { iterations: 6000, rate: 0.04, rateEnd: 0.001, jitter: 0.5, tries: 4 } as const;

/**
 * `solve` once per seed (1…`tries`), keeping the cheapest, on `SCHEDULE` unless `o` says otherwise.
 * In a browser, give each seed its own worker (`whole-move-client.ts`).
 */
export function solveBest(m: Move, o: SolveOptions = {}, tries: number = SCHEDULE.tries): { frames: Frame[]; cost: number; v: Float64Array; seed: number; costs: number[] } {
  let best: { frames: Frame[]; cost: number; v: Float64Array; seed: number } | undefined;
  const costs: number[] = [];
  for (let seed = 1; seed <= Math.max(1, tries); seed++) {
    const r = solve(m, { ...SCHEDULE, ...o, seed });
    costs.push(r.cost);
    if (best === undefined || r.cost < best.cost) best = { ...r, seed };
  }
  if (best === undefined) throw new Error("solveBest: no tries");
  return { ...best, costs };
}

// ── Reading it: the same numbers for the floor's pose and the solver's ────────────────────────

export interface Metrics {
  /** Deepest overlap of any two parts that shouldn't touch (m), and where. */
  clip: number;
  clipAt: string;
  /** Furthest the held hands come apart, beyond clasped (m). */
  holdGap: number;
  /** Largest change of any limb's direction between neighbouring samples (deg). */
  jump: number;
  jumpAt: string;
  /** Largest stretch of any segment, as a ratio of its rest length. */
  stretch: number;
  /** 🧪 Furthest any upper arm is past its own length (m): `pose-rules`' length rule, on the solve. */
  upperOver: number;
  /** The beau's furthest step off the floor's path (m). */
  step: number;
  /** 🧪 Each dancer's largest change of height (m, signed: negative is a shrink), beau then belle. */
  grow: [number, number];
}

const angleBetween = (a: Vec, b: Vec) => {
  const c = dot(a, b) / Math.max(len(a) * len(b), 1e-12);
  return Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
};

export function metrics(m: Move, frames: readonly Frame[], path?: readonly Frame[]): Metrics {
  const out: Metrics = { clip: 0, clipAt: "", holdGap: 0, jump: 0, jumpAt: "", stretch: 1, upperOver: 0, step: 0, grow: [0, 0] };
  const n = frames.length;
  const noMargin = { ...WEIGHTS, margin: 0 };
  frames.forEach((f, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const A = shapesOf(m.bodies[0], f[0]);
    const B = shapesOf(m.bodies[1], f[1]);
    const check = (s1: Shape, s2: Shape, who: string, margin = noMargin.margin) => {
      const over = s1.r + s2.r + margin - segSeg(s1.a, s1.b, s2.a, s2.b);
      if (over > out.clip) {
        out.clip = over;
        out.clipAt = `t=${t.toFixed(3)} ${who} ${s1.name}/${s2.name}`;
      }
    };
    for (const s1 of A) for (const s2 of B) if (!exempt(m, t, s1.name, s2.name)) check(s1, s2, "beau/belle");
    [A, B].forEach((S, k) => {
      const body = m.bodies[k as 0 | 1];
      for (let j = 2; j < S.length; j++) for (const own of [0, 1] as const) {
        const s1 = S[j];
        const s2 = S[own];
        if (s1 !== undefined && s2 !== undefined) check(s1, s2, k === 0 ? "beau" : "belle", ownMargin(body, j, own, noMargin.margin));
      }
    });
    for (const h of held(m, t)) {
      const ha = A.find((s) => s.name === `hand-${SIDES[h.beau]}`);
      const hb = B.find((s) => s.name === `hand-${SIDES[h.belle]}`);
      if (!ha || !hb || (h.weight ?? 1) < 1) continue;
      if (h.forearm === true) {
        const ea = A.find((s) => s.name === `forearm-${SIDES[h.beau]}`);
        const eb = B.find((s) => s.name === `forearm-${SIDES[h.belle]}`);
        if (ea && eb) {
          const sa = at(eb.a, eb.b, along(ha.a, eb.a, eb.b, gripSlides(m, 0)));
          const sb = at(ea.a, ea.b, along(hb.a, ea.a, ea.b, gripSlides(m, 1)));
          out.holdGap = Math.max(out.holdGap, len(sub(ha.a, sa)) - WEIGHTS.clasp * (ha.r + eb.r), len(sub(hb.a, sb)) - WEIGHTS.clasp * (hb.r + ea.r));
        }
        continue;
      }
      out.holdGap = Math.max(out.holdGap, len(sub(ha.a, hb.a)) - WEIGHTS.clasp * (ha.r + hb.r));
    }
    f.forEach((d, k) => {
      const g = d.grow ?? 0;
      if (Math.abs(g) > Math.abs(out.grow[k] ?? 0)) out.grow[k] = g;
      const body = m.bodies[k];
      if (!body) return;
      for (const a of d.arms) {
        out.stretch = Math.max(out.stretch, a.ulen / body.upper0, a.flen / body.fore0);
        out.upperOver = Math.max(out.upperOver, a.ulen - body.upper0);
      }
    });
    const p = path?.[i]?.[0];
    if (p) out.step = Math.max(out.step, Math.hypot(f[0].x - p.x, f[0].z - p.z));
    const prev = frames[i - 1];
    if (prev) {
      f.forEach((d, k) => {
        const body = m.bodies[k];
        const pd = prev[k];
        if (!body || !pd) return;
        for (const side of [0, 1] as const) {
          const a = armPoints(body, side, d.arms[side]);
          const b = armPoints(body, side, pd.arms[side]);
          const du = angleBetween(sub(a.e, a.s), sub(b.e, b.s));
          const df = angleBetween(sub(a.h, a.e), sub(b.h, b.e));
          const worst = Math.max(du, df);
          if (worst > out.jump) {
            out.jump = worst;
            out.jumpAt = `t=${t.toFixed(3)} ${k === 0 ? "beau" : "belle"} ${SIDES[side]} ${du >= df ? "upper arm" : "forearm"}`;
          }
        }
      });
    }
  });
  return out;
}

// ── To and from `#review2`'s dials ───────────────────────────────────────────────────────────

const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** One dancer's dial values (`<dancer>.<part>.<aspect>`) at one frame. */
export function toDials(d: DancerFrame, dancer: number): Record<string, number> {
  const out: Record<string, number> = {};
  const k = (part: string, aspect: string) => `${String(dancer)}.${part}.${aspect}`;
  out[k("torso", "x")] = Math.round(d.x * 1000) / 10;
  out[k("torso", "z")] = Math.round(d.z * 1000) / 10;
  out[k("torso", "facing")] = Math.round(wrapDeg(d.yaw * R2D));
  // 🧪 Not a `#review2` dial: the floor wears it as a reshape (`DanceFloor`, under a bake).
  if (d.grow !== undefined && d.grow !== 0) out[k("torso", "grow")] = Math.round(d.grow * 1000) / 10;
  d.arms.forEach((a, side) => {
    const s = SIDES[side];
    out[k(`upper-arm-${s}`, "raise")] = Math.round(a.raise * R2D * 10) / 10;
    out[k(`upper-arm-${s}`, "toward")] = Math.round(wrapDeg(a.toward * R2D) * 10) / 10;
    out[k(`upper-arm-${s}`, "length")] = Math.round(a.ulen * 1000) / 10;
    out[k(`forearm-${s}`, "pitch")] = Math.round(a.pitch * R2D * 10) / 10;
    out[k(`forearm-${s}`, "heading")] = Math.round(wrapDeg(a.heading * R2D) * 10) / 10;
    out[k(`forearm-${s}`, "length")] = Math.round(a.flen * 1000) / 10;
    // The solver doesn't pose the hand, so it's set straight along the forearm. Left out, the
    // drawn hand keeps whatever turn the floor gave it that frame, which flips about.
    out[k(`hand-${s}`, "bend")] = 0;
    out[k(`hand-${s}`, "side")] = 0;
    out[k(`hand-${s}`, "roll")] = 0;
  });
  return out;
}

/** A dancer's frame from dial values (as `readRigs` gives them). Missing arm dials fall back to rest. */
export function fromDials(values: Readonly<Record<string, number>>, dancer: number, b: Body): DancerFrame {
  const g = (part: string, aspect: string) => values[`${String(dancer)}.${part}.${aspect}`];
  const r = restArm(b);
  const arm = (s: "left" | "right"): Arm => ({
    raise: (g(`upper-arm-${s}`, "raise") ?? r.raise * R2D) * D2R,
    toward: (g(`upper-arm-${s}`, "toward") ?? 0) * D2R,
    ulen: (g(`upper-arm-${s}`, "length") ?? r.ulen * 100) / 100,
    pitch: (g(`forearm-${s}`, "pitch") ?? r.pitch * R2D) * D2R,
    heading: (g(`forearm-${s}`, "heading") ?? 0) * D2R,
    flen: (g(`forearm-${s}`, "length") ?? r.flen * 100) / 100,
  });
  const grow = g("torso", "grow");
  return {
    x: (g("torso", "x") ?? 0) / 100,
    z: (g("torso", "z") ?? 0) / 100,
    yaw: (g("torso", "facing") ?? 0) * D2R,
    arms: [arm("left"), arm("right")],
    ...(grow === undefined ? {} : { grow: grow / 100 }),
  };
}

// ── A starting shape ─────────────────────────────────────────────────────────────────────────

/** The couple's floor frame → one dancer's rig frame (the inverse of `toFloor`). */
export function toRig(p: Vec, f: DancerFrame): Vec {
  const x = p[0] - f.x;
  const z = p[2] - f.z;
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [x * c - z * s, p[1], x * s + z * c];
}

/**
 * Two-bone IK onto the dials: an arm whose hand centre is at `target` (floor frame), elbow bent
 * toward `pole` (a floor-frame direction). If the target is out of reach both segments lengthen by
 * the same ratio, to 95% of full reach, which is the stretch Ryan allows.
 */
export function reachArm(b: Body, side: 0 | 1, f: DancerFrame, target: Vec, pole: Vec): Arm {
  const S = b.shoulder[side];
  const H = toRig(target, f);
  const pr = toRig([pole[0] + f.x, pole[1], pole[2] + f.z], f);
  const d = sub(H, S);
  const r = Math.max(len(d), 1e-6);
  const k = Math.max(1, r / (0.95 * (b.upper0 + b.fore0)));
  const L1 = b.upper0 * k;
  const L2 = b.fore0 * k;
  const dn: Vec = [d[0] / r, d[1] / r, d[2] / r];
  const a = (L1 * L1 - L2 * L2 + r * r) / (2 * r);
  const hgt = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  // The pole, made perpendicular to the shoulder–hand line.
  const pd = dot(pr, dn);
  let q: Vec = [pr[0] - dn[0] * pd, pr[1] - dn[1] * pd, pr[2] - dn[2] * pd];
  const ql = len(q);
  q = ql > 1e-9 ? [q[0] / ql, q[1] / ql, q[2] / ql] : [0, -1, 0];
  const E: Vec = [S[0] + dn[0] * a + q[0] * hgt, S[1] + dn[1] * a + q[1] * hgt, S[2] + dn[2] * a + q[2] * hgt];
  const u = sub(E, S);
  const fv = sub(H, E);
  const g = sign(side);
  const ul = Math.max(len(u), 1e-9);
  const fl = Math.max(len(fv), 1e-9);
  return {
    raise: Math.acos(Math.max(-1, Math.min(1, -u[1] / ul))),
    toward: Math.atan2(g * u[0], u[2]),
    ulen: ul,
    pitch: Math.asin(Math.max(-1, Math.min(1, fv[1] / fl))),
    heading: Math.atan2(g * fv[0], fv[2]),
    flen: fl,
  };
}

/**
 * Put every held arm's hand on `at(i)`, elbows bent away from the dancer's own centre and a little
 * down. Angles are unwrapped along the move so the start has no ±360° steps of its own.
 */
/**
 * 🧪 A forearm grip's starting pose (2026-10-28): the two elbows the longer forearm apart at `height`,
 * centred on the line between the two held shoulders, each hand its own forearm out along that line
 * (the longer's a clasp short of the other's elbow). Reaching
 * both hands for one point, the twirl's start, began every Allemande with the hands together and the
 * elbows wherever that put them.
 */
function forearmStart(m: Move, f: Frame, h: Hold, height: number): Frame {
  const bb = wornBody(m.bodies[0], f[0].grow ?? 0);
  const gb = wornBody(m.bodies[1], f[1].grow ?? 0);
  const sa = toFloor(bb.shoulder[h.beau], f[0]);
  const sb = toFloor(gb.shoulder[h.belle], f[1]);
  const dx = sb[0] - sa[0];
  const dz = sb[2] - sa[2];
  const dl = Math.max(Math.hypot(dx, dz), 1e-9);
  const ux = dx / dl;
  const uz = dz / dl;
  const mx = (sa[0] + sb[0]) / 2;
  const mz = (sa[2] + sb[2]) / 2;
  // The longer forearm sets the elbows apart; the shorter one's hand lands on it (`gripSlides`).
  const clasp = WEIGHTS.clasp * ((bb.handR + gb.forearmR + gb.handR + bb.forearmR) / 2);
  const fore = Math.max(0.05, Math.max(bb.fore0, gb.fore0) - clasp);
  const ea: Vec = [mx - (ux * fore) / 2, height, mz - (uz * fore) / 2];
  const eb: Vec = [mx + (ux * fore) / 2, height, mz + (uz * fore) / 2];
  const toward = (from: Vec, to: Vec, reach: number): Vec => {
    const k = Math.min(1, Math.max(0.05, reach - clasp) / fore);
    return [from[0] + (to[0] - from[0]) * k, height, from[2] + (to[2] - from[2]) * k];
  };
  const set = (d: DancerFrame, body: Body, side: 0 | 1, e: Vec, hand: Vec): DancerFrame => {
    const arms = [...d.arms] as [Arm, Arm];
    arms[side] = armThrough(body, side, d, e, hand);
    return { ...d, arms };
  };
  return [set(f[0], bb, h.beau, ea, toward(ea, eb, bb.fore0)), set(f[1], gb, h.belle, eb, toward(eb, ea, gb.fore0))];
}

/**
 * 🧪 The arm that puts its elbow at `elbow` and its hand centre at `hand` (floor frame), at whatever
 * lengths that takes (2026-10-28). The forearm grip's start: the elbows are placed, not found.
 */
export function armThrough(b: Body, side: 0 | 1, f: DancerFrame, elbow: Vec, hand: Vec): Arm {
  const S = b.shoulder[side];
  const E = toRig(elbow, f);
  const H = toRig(hand, f);
  const u = sub(E, S);
  const fv = sub(H, E);
  const g = sign(side);
  const ul = Math.max(len(u), 1e-9);
  const fl = Math.max(len(fv), 1e-9);
  return {
    raise: Math.acos(Math.max(-1, Math.min(1, -u[1] / ul))),
    toward: Math.atan2(g * u[0], u[2]),
    ulen: ul,
    pitch: Math.asin(Math.max(-1, Math.min(1, fv[1] / fl))),
    heading: Math.atan2(g * fv[0], fv[2]),
    flen: fl,
  };
}

export function startOnPath(m: Move, at: (i: number) => Vec): Frame[] {
  const frames = m.frames.map((f, i) => {
    const t = m.frames.length > 1 ? i / (m.frames.length - 1) : 0;
    const hs = held(m, t);
    const fh = hs.find((h) => h.forearm === true);
    if (fh !== undefined) return forearmStart(m, f, fh, at(i)[1]);
    return f.map((d, k) => {
      const body = m.bodies[k];
      if (!body) return d;
      const arms = d.arms.map((a, side) => {
        const isHeld = hs.some((h) => (k === 0 ? h.beau : h.belle) === side);
        if (!isHeld) return a;
        const s = toFloor(body.shoulder[side], d);
        const out: Vec = [s[0] - d.x, -0.4, s[2] - d.z];
        return reachArm(body, side as 0 | 1, d, at(i), out);
      }) as [Arm, Arm];
      return { ...d, arms };
    }) as Frame;
  });
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const cur = frames[i];
    if (!prev || !cur) continue;
    cur.forEach((d, k) => d.arms.forEach((a, side) => {
      const p = prev[k]?.arms[side];
      if (!p) return;
      for (const key of ["toward", "heading"] as const) {
        while (a[key] - p[key] > Math.PI) a[key] -= 2 * Math.PI;
        while (a[key] - p[key] < -Math.PI) a[key] += 2 * Math.PI;
      }
    }));
  }
  return frames;
}
