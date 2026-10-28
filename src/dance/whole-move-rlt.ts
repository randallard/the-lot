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
}

const BEATS = 8;
const PULL = 3.5;
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

  // The pull-by holds: right hands, while the two can reach each other comfortably (shoulders
  // within 60% of their two arms' reach), around the crossing. At 85% the hands were held until the
  // arms were nearly straight behind, and both couples hung back 24 cm after the crossing (10-27).
  const holds: NHold[] = [];
  for (const [a, b] of [[0, 3], [1, 2]] as const) {
    const reach = 0.6 * (bodies[a]!.upper0 + bodies[a]!.fore0 + bodies[b]!.upper0 + bodies[b]!.fore0);
    const close = frames.map((f, i) => {
      const sa = toFloor(bodies[a]!.shoulder[1], f[a]!);
      const sb = toFloor(bodies[b]!.shoulder[1], f[b]!);
      return i / per <= PULL && Math.hypot(sa[0] - sb[0], sa[2] - sb[2]) < reach;
    });
    const first = close.indexOf(true);
    const last = close.lastIndexOf(true);
    if (first >= 0) holds.push({ from: first / (n - 1), to: last / (n - 1), a: { dancer: a, side: 1 }, b: { dancer: b, side: 1 } });
  }
  // The courtesy turns: left in left, and the gent's right on her back.
  const from = (PULL + 0.25) / BEATS;
  const to = (BEATS - 0.5) / BEATS;
  for (const [g, l] of [[0, 1], [2, 3]] as const) {
    holds.push({ from, to, a: { dancer: g, side: 0 }, b: { dancer: l, side: 0 } });
    // And they end as a couple, in the ordinary handhold: his right in her left.
    holds.push({ from: to, to: 1, a: { dancer: g, side: 1 }, b: { dancer: l, side: 0 }, ease: 0.02 });
    holds.push({ from: from + 0.02, to: to - 0.02, a: { dancer: g, side: 1 }, b: { dancer: l, back: true } });
  }
  return { bodies, frames, holds };
}
