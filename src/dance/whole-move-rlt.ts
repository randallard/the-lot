/**
 * 🧪 **Right and Left Thru, for the N-dancer solve** (2026-10-27, step 5).
 *
 * The engine (square-one) has no call for four yet: facing couples are its S2 formation, and a new
 * call there is spec'd first. Ryan chose to prove the solver first, so these paths are written
 * here, in metres, and swapped for the engine's when it has them.
 *
 * Facing couples, 8 beats:
 * - **Pull by (beats 0–3.5):** each dancer gives a right hand to the opposite and passes them right
 *   shoulder to right shoulder. Each veers to their own left by half a lane, and each couple
 *   widens until the two who pass in the middle (the ladies) clear each other by a lane too.
 * - **Courtesy turn (beats 3.5–8):** the gent takes the lady's left hand in his left, puts his right
 *   hand on her back, and they turn left as a unit, half way round, the gent backing up. They end
 *   facing the other couple, on the other side.
 *
 * Dancers: 0 the first gent, 1 his partner, 2 the opposite gent, 3 his partner. The rig's +x is the
 * anatomical left (`whole-move.ts`), so a dancer facing +z (yaw 0) has their left at +x.
 */

import { lateralClearance, rigidParts, type CharacterBodyShape } from "../services/body-shapes";
import { armMetrics, touchHold } from "./arm-pose";
import { passingWidth } from "./frame";
import { bodyOf, restArm, toFloor, type Body, type DancerFrame } from "./whole-move";
import type { NHold, NMove } from "./whole-move-n";

export interface RltOptions {
  /** Samples a beat. Default 10. */
  readonly perBeat?: number;
  /** The couple's standing width, centre to centre (m). Default: the floor's (`touchHold`), the wider couple's. */
  readonly width?: number;
  /** How far apart the two couples stand, centre line to centre line (m). Default: the width and a lane, at least 1.6. */
  readonly across?: number;
  /** The pull-by's hands join within this fraction of the two arms' reach. Default {@link PULL_REACH}. */
  readonly pullReach?: number;
  /** Beats after the crossing that they let go. Default {@link PULL_AFTER}. */
  readonly pullAfter?: number;
}

const BEATS = 8;
const PULL = 3.5;
/** The pull-by's hands join when the shoulders are within this much of the two arms' reach. */
const PULL_REACH = 0.8;
/** But no further apart than this (m): ember's long arms otherwise joined hands at beat 0.3. */
const PULL_JOIN_MAX = 1.2;
/**
 * And let go this many beats after the right shoulders draw level: just before. Held past it, the
 * hands trail behind and both dancers hang back (10-28, four Ryans: 50 cm at 0.3 beat after, 18 cm
 * at 0.1 before).
 */
const PULL_AFTER = -0.1;
/** Held at least this long (beats), reaching for it if the arms are short (sprout's, myco's). */
const PULL_MIN = 0.5;
const ease = (x: number) => x * x * (3 - 2 * x);

export function rightAndLeftThru(shapes: readonly CharacterBodyShape[], o: RltOptions = {}): NMove {
  if (shapes.length !== 4) throw new Error(`Right and Left Thru is for four dancers, got ${String(shapes.length)}`);
  const bodies: Body[] = shapes.map(bodyOf);
  const per = o.perBeat ?? 10;
  // Sized as the floor sizes a couple (10-27: four Ryans at a 0.5 m width stepped 20–35 cm apart,
  // because their torsos alone are 0.6 m across): the standing width is `touchHold`'s, and two
  // bodies pass a lane apart (`passingWidth`, as the engine's Pass Thru lane is).
  const s = shapes as readonly [CharacterBodyShape, CharacterBodyShape, CharacterBodyShape, CharacterBodyShape];
  const W = o.width ?? Math.max(touchHold(armMetrics(s[0]), armMetrics(s[1])).width, touchHold(armMetrics(s[2]), armMetrics(s[3])).width);
  const pass = (a: CharacterBodyShape, b: CharacterBodyShape) => passingWidth(lateralClearance(rigidParts(a), rigidParts(b)));
  // The pairs who pass: each gent and the opposite lady, and the two ladies in the middle. Their
  // arms pass too, so the lane is the wider of the bodies' (`passingWidth`, torsos and heads) and
  // the two shoulders with an arm hanging off each (10-27: four Ryans' shoulders stand 46 cm out,
  // past their 30 cm torsos, and the gents stepped 38 cm wide of a bodies-only lane).
  const arms = (a: Body, b: Body) => Math.abs(a.shoulder[0][0]) + Math.abs(b.shoulder[0][0]) + 2 * Math.max(a.handR, b.handR) + 0.04;
  const bodyLane = Math.max(pass(s[0], s[3]), pass(s[1], s[2]), pass(s[1], s[3]));
  const lane = Math.max(bodyLane, arms(bodies[0]!, bodies[3]!), arms(bodies[1]!, bodies[2]!), arms(bodies[1]!, bodies[3]!));
  const D = o.across ?? Math.max(1.6, W + lane);
  const veer = lane / 2;
  const widen = Math.max(0, lane - W / 2);
  const n = BEATS * per + 1;

  // The first couple; the second is the same, turned half way round the middle of the set.
  // The courtesy turn is danced close, side by side: a lane apart (10-27, four Ryans: at their
  // 1.14 m standing width the solve stepped each couple 0.45 m closer through the whole turn, and
  // the hands couldn't meet without it). They close up as the pull-by ends, turn at that, and open
  // to the standing width in the last half beat, after the hands let go.
  const rc = Math.min(W, bodyLane) / 2;
  // And the lady a little ahead of him, his right arm round her back: a torso and a hand's breadth
  // (the solve put her about 0.4 m ahead of four Ryans).
  const stagger = (b: Body) => b.torso.r + b.handR;
  const TURN_END = BEATS - 0.5;
  const couple1 = (beat: number): [DancerFrame, DancerFrame] => {
    const at = (x: number, z: number, yaw: number, b: Body): DancerFrame => ({ x, z, yaw, arms: [restArm(b), restArm(b)] });
    if (beat <= PULL) {
      const u = beat / PULL;
      const z = -D / 2 + D * ease(u);
      const bump = Math.sin(Math.PI * u);
      const half = W / 2 + (rc - W / 2) * ease(u);
      // Gent at +x veers left (+x) and out; the lady at −x veers left (+x), toward the middle, and out.
      return [
        at(half + (veer + widen) * bump, z, 0, bodies[0]!),
        at(-half + (veer - widen) * bump, z, 0, bodies[1]!),
      ];
    }
    // About the couple's middle, turning left (yaw rising) half way round, the gent backing up.
    const th = Math.PI * ease(Math.min(1, (beat - PULL) / (TURN_END - PULL)));
    const r = beat <= TURN_END ? rc : rc + (W / 2 - rc) * ease((beat - TURN_END) / (BEATS - TURN_END));
    const lx = Math.cos(th);
    const lz = -Math.sin(th);
    const mz = D / 2;
    // Her lead comes in over the turn's first beat and goes as they open out.
    const lead = (stagger(bodies[1]!) / 2) * ease(Math.min(1, beat - PULL)) * (1 - ease(Math.max(0, (beat - TURN_END) / (BEATS - TURN_END))));
    const fx = Math.sin(th);
    const fz = Math.cos(th);
    return [
      at(r * lx - lead * fx, mz + r * lz - lead * fz, th, bodies[0]!),
      at(-r * lx + lead * fx, mz - r * lz + lead * fz, th, bodies[1]!),
    ];
  };

  const frames = Array.from({ length: n }, (_, i) => {
    const [g1, l1] = couple1(i / per);
    const turn = (d: DancerFrame, b: Body): DancerFrame => ({ x: -d.x, z: -d.z, yaw: d.yaw + Math.PI, arms: [restArm(b), restArm(b)] });
    return [g1, l1, turn(g1, bodies[2]!), turn(l1, bodies[3]!)];
  });

  // The pull-by holds: right hands, joined in front at chest height (`height`), taken as the two
  // come within reach (shoulders within `PULL_REACH` of their two arms) and let go a little after
  // the right shoulders draw level (`PULL_AFTER`), as they pull by.
  //
  // 10-27 held them while the shoulders were within 60% of the arms, then (10-28) only the middle
  // half of that, round the crossing, with no height: the solve met two hanging hands at the hip as
  // the right shoulders passed 17 cm apart, for a third of a beat. It scored 0.1 cm and looked like
  // no hands at all (Ryan, 10-28: "the arms should be connecting across").
  const holds: NHold[] = [];
  const reachK = o.pullReach ?? PULL_REACH;
  const after = Math.round((o.pullAfter ?? PULL_AFTER) * per);
  for (const [a, b] of [[0, 3], [1, 2]] as const) {
    const A = bodies[a]!, B = bodies[b]!;
    const reach = Math.min(PULL_JOIN_MAX, reachK * (A.upper0 + A.fore0 + B.upper0 + B.fore0));
    const apart = frames.map((f, i) => {
      if (i / per > PULL) return Infinity;
      const sa = toFloor(A.shoulder[1], f[a]!);
      const sb = toFloor(B.shoulder[1], f[b]!);
      return Math.hypot(sa[0] - sb[0], sa[2] - sb[2]);
    });
    const cross = apart.indexOf(Math.min(...apart));
    const last = Math.min(cross + after, n - 1);
    const within = apart.findIndex((x) => x < reach);
    const first = Math.max(0, Math.min(within < 0 ? last : within, last - Math.round(PULL_MIN * per)));
    const height = Math.min(A.shoulder[1][1], B.shoulder[1][1]) - 0.1 * (A.upper0 + B.upper0);
    holds.push({ from: first / (n - 1), to: last / (n - 1), a: { dancer: a, side: 1 }, b: { dancer: b, side: 1 }, height, ease: 0.04 });
  }
  // The courtesy turns: left in left, and the gent's right on her back.
  const from = (PULL + 0.25) / BEATS;
  const to = (BEATS - 0.5) / BEATS;
  for (const [g, l] of [[0, 1], [2, 3]] as const) {
    holds.push({ from, to, a: { dancer: g, side: 0 }, b: { dancer: l, side: 0 } });
    // And they end as a couple, in the ordinary handhold: his right in her left, where the floor
    // holds it (`touchHold`). Left to meet anywhere, the hands met on his side and her arm lay
    // across his forearm (10-28, Ryan: "the belles arm at the end of the move is over lapping").
    const home = touchHold(armMetrics(s[g]), armMetrics(s[l]));
    holds.push({ from: to, to: 1, a: { dancer: g, side: 1 }, b: { dancer: l, side: 0 }, ease: 0.02, height: home.height, forward: home.forward });
    // And they start in it (10-28, Ryan: "add the handhold at beat 0 too"), letting go as they
    // step off: by half a beat, or straight into the pull-by if that comes within 0.3 beat after
    // (ember ×4's at 0.7: a 0.2-beat gap between them set off an 86° jump). Held
    // until the pull-by, it fought the couple widening for the ladies to pass, and dragged the
    // gent up to 41 cm off his path (sprout–myco). It starts an ease before the move, so it's at
    // full weight on beat 0.
    const pull = holds.find((h) => h.to < 0.5 && ((h.a.dancer === g && h.a.side === 1) || (!("back" in h.b) && h.b.dancer === g && h.b.side === 1)));
    const START_EASE = 0.03;
    const START_HOLD = 0.5;
    if (pull !== undefined) holds.push({ from: -START_EASE, to: pull.from <= (START_HOLD + 0.3) / BEATS ? pull.from : START_HOLD / BEATS, a: { dancer: g, side: 1 }, b: { dancer: l, side: 0 }, ease: START_EASE, height: home.height, forward: home.forward });
    holds.push({ from: from + 0.02, to: to - 0.02, a: { dancer: g, side: 1 }, b: { dancer: l, back: true } });
  }
  return { bodies, frames, holds };
}
