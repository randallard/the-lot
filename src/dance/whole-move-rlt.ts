/**
 * 🧪 **Right and Left Thru, for the N-dancer solve** (2026-10-27, step 5).
 *
 * **The paths are square-one's** (2026-10-28): its first formation of four, facing couples, and
 * its first call from it (`applyCallToFacingCouples`, spec `docs/spec/calls/right-and-left-thru.md`
 * there). Until then they were written here; the engine's are the same figure, built from its
 * blocks, at the chart's **6 beats** from facing couples rather than the 8 these were (the
 * squared-set figure).
 *
 * - **Right Pull By (beats 0–2):** each dancer walks straight across, passing the opposite right
 *   shoulders; each crossing pair and the two belles in the middle keep a clearance, both couples
 *   spreading for the belles.
 * - **Courtesy Turn (beats 2–6):** each couple turns half way round to the left about its middle,
 *   the gent backing up, closing to their clearance mid-turn and opening back out.
 *
 * What stays here is the bodies: each couple's width (`touchHold`), the lane their arms need to
 * pass, how far apart the couples stand, and the holds the solve keeps.
 *
 * Dancers: 0 the first gent, 1 his partner, 2 the opposite gent, 3 his partner. The rig's +x is the
 * anatomical left (`whole-move.ts`), so a dancer facing +z (yaw 0) has their left at +x.
 */

import { lateralClearance, rigidParts, type CharacterBodyShape } from "../services/body-shapes";
import { armMetrics, touchHold } from "./arm-pose";
import { applyCallToFacingCouples, sampleMotion, setFacingCouples } from "square-one";
import { facingToRotationY, makeFrame, passingWidth, toWorld } from "./frame";
import { passingClearance } from "./passing";
import { bodyOf, restArm, toFloor, type Body, type DancerFrame } from "./whole-move";
import { backPoint, type NHold, type NMove } from "./whole-move-n";

export interface RltOptions {
  /** Samples a beat. Default 10. */
  readonly perBeat?: number;
  /** Both couples' standing width, centre to centre (m). Default: each couple's own (`touchHold`). */
  readonly width?: number;
  /** How far apart the two couples stand, centre line to centre line (m): at least 1.6 (the default), and never less than the engine's `roomToFace`, a lane and half of each width. */
  readonly across?: number;
  /** The pull-by's hands join within this fraction of the two arms' reach. Default {@link PULL_REACH}. */
  readonly pullReach?: number;
  /** Beats after the crossing that they let go. Default {@link PULL_AFTER}. */
  readonly pullAfter?: number;
}

const ease = (x: number) => x * x * (3 - 2 * x);
/** The chart's, from facing couples. */
const BEATS = 6;
/** The Right Pull By's beats; the Courtesy Turn is the rest. */
const PULL = 2;
/** The pull-by's hands join when the shoulders are within this much of the two arms' reach. */
const PULL_REACH = 0.8;
/** But no further apart than this (m): ember's long arms otherwise joined hands at beat 0.3. */
const PULL_JOIN_MAX = 1.2;
/**
 * And let go this many beats after the right shoulders draw level: just before. Held past it, the
 * hands trail behind and both dancers hang back (10-28, four Ryans: 50 cm at 0.3 beat after, 18 cm
 * at 0.1 before).
 */
const PULL_AFTER = -0.06;
/** How far into the Courtesy Turn his right goes to her back, and how long before its end it comes off (beats). */
const BACK_IN = 0.5;
const BACK_EASE = 0.5 / 6;
/** His hand goes to her back only while his shoulder is within this much of his arm from it. */
const BACK_REACH = 0.95;
/** The reach toward her back where he can't get there: this much of a hold. */
const BACK_REACH_WEIGHT = 0.2;
/** Held at least this long (beats), reaching for it if the arms are short (sprout's, myco's). */
const PULL_MIN = 0.3;

export function rightAndLeftThru(shapes: readonly CharacterBodyShape[], o: RltOptions = {}): NMove {
  if (shapes.length !== 4) throw new Error(`Right and Left Thru is for four dancers, got ${String(shapes.length)}`);
  const bodies: Body[] = shapes.map(bodyOf);
  const per = o.perBeat ?? 10;
  // Sized as the floor sizes a couple (10-27: four Ryans at a 0.5 m width stepped 20–35 cm apart,
  // because their torsos alone are 0.6 m across): the standing width is `touchHold`'s, and two
  // bodies pass a lane apart (`passingWidth`, as the engine's Pass Thru lane is).
  const s = shapes as readonly [CharacterBodyShape, CharacterBodyShape, CharacterBodyShape, CharacterBodyShape];
  const width = (a: CharacterBodyShape, b: CharacterBodyShape) => o.width ?? touchHold(armMetrics(a), armMetrics(b)).width;
  const W1 = width(s[0], s[1]);
  const W2 = width(s[2], s[3]);
  const pass = (a: CharacterBodyShape, b: CharacterBodyShape) => passingWidth(lateralClearance(rigidParts(a), rigidParts(b)));
  // The pairs who pass: each gent and the opposite lady, and the two ladies in the middle. Their
  // arms pass too, so the lane is the wider of the bodies' (`passingWidth`, torsos and heads) and
  // the two shoulders with an arm hanging off each (10-27: four Ryans' shoulders stand 46 cm out,
  // past their 30 cm torsos, and the gents stepped 38 cm wide of a bodies-only lane).
  // (`passingClearance`, which every figure's pass uses since 10-28.)
  const bodyLane = Math.max(pass(s[0], s[3]), pass(s[1], s[2]), pass(s[1], s[3]));
  const lane = Math.max(passingClearance(s[0], s[3]), passingClearance(s[1], s[2]), passingClearance(s[1], s[3]));
  const n = BEATS * per + 1;

  // The engine's set, in metres: its frame at scale 1. The first couple faces the engine's −y,
  // which is the floor's +z (`toWorld`), so they start at z = −D/2 facing +z with the gent at +x,
  // where they always have. The engine stands them at least a lane and half of each width apart
  // (`roomToFace`); 1.6 m is this floor's own least.
  //
  // Two clearances, as the engine has them: each couple's is how close the Courtesy Turn closes in
  // (10-27: at a standing width the hand on her back couldn't reach); the set's is the arm-aware
  // lane the dancers of the two couples pass at.
  //
  // The couple's is the widest **bodies'** clearance in the set (`bodyLane`), as the hand-written
  // turn closed to, not the partners' own: closed to that, a big gent with a small lady
  // (ember–sprout, ryan–player) had to wrap his right arm behind her and the solve flipped it over
  // (85°, the hand 21 cm off her back).
  const set = setFacingCouples(
    { beau: "0", belle: "1", shape: { width: W1, clearance: bodyLane } },
    { beau: "2", belle: "3", shape: { width: W2, clearance: bodyLane } },
    o.across ?? 1.6,
    { x: 0, y: 0 },
    270,
    lane,
  );
  const motions = applyCallToFacingCouples("right-and-left-thru", set);
  const frame = makeFrame({ x: 0, z: 0 }, 1);
  const unwrap = (prev: number | undefined, yaw: number) =>
    prev === undefined ? Math.atan2(Math.sin(yaw), Math.cos(yaw)) : prev + Math.atan2(Math.sin(yaw - prev), Math.cos(yaw - prev));
  const last: (number | undefined)[] = [undefined, undefined, undefined, undefined];
  // And the lady a little ahead of him through the Courtesy Turn, his right arm round her back: a
  // torso and a hand's breadth between them along the way they face (the solve put her about 0.4 m
  // ahead of four Ryans, 10-27). It comes in over the turn's first beat and goes in its last half.
  // The engine turns them level, side by side, and with her there a big gent's hand had to go
  // behind his own back to reach hers: ember–sprout's flipped over (93°, 29 cm off her back).
  const lead = (beat: number, lady: Body) =>
    beat <= PULL
      ? 0
      : ((lady.torso.r + lady.handR) / 2) * ease(Math.min(1, beat - PULL)) * (1 - ease(Math.max(0, (beat - (BEATS - 0.5)) / 0.5)));
  const frames: DancerFrame[][] = Array.from({ length: n }, (_, i) =>
    bodies.map((b, d) => {
      const m = motions[String(d)];
      if (m === undefined) throw new Error(`rightAndLeftThru: no motion for dancer ${String(d)}`);
      const at = sampleMotion(m, i / per);
      const p = toWorld(frame, at.position);
      const yaw = unwrap(last[d], facingToRotationY(frame, at.facing));
      last[d] = yaw;
      // She forward, he back, by half the lead each; his partner is the next dancer, hers the last.
      const ahead = (d % 2 === 1 ? 1 : -1) * lead(i / per, bodies[d % 2 === 1 ? d : d + 1]!);
      return { x: p.x + ahead * Math.sin(yaw), z: p.z + ahead * Math.cos(yaw), yaw, arms: [restArm(b), restArm(b)] };
    }),
  );

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
    // (ember ×4's at 0.7: a 0.2-beat gap between them set off an 86° jump). In the engine's 6 beats
    // the pull-by is 2 beats rather than 3.5, and the times are scaled with it (0.3 and 0.2). Held
    // until the pull-by, it fought the couple widening for the ladies to pass, and dragged the
    // gent up to 41 cm off his path (sprout–myco). It starts an ease before the move, so it's at
    // full weight on beat 0.
    const pull = holds.find((h) => h.to < 0.5 && ((h.a.dancer === g && h.a.side === 1) || (!("back" in h.b) && h.b.dancer === g && h.b.side === 1)));
    const START_EASE = 0.03;
    const START_HOLD = 0.3;
    if (pull !== undefined) holds.push({ from: -START_EASE, to: pull.from <= (START_HOLD + 0.2) / BEATS ? pull.from : START_HOLD / BEATS, a: { dancer: g, side: 1 }, b: { dancer: l, side: 0 }, ease: START_EASE, height: home.height, forward: home.forward });
    // His right on her back once the turn has closed in, off before it opens out, and only while
    // he can reach it: his shoulder within `BACK_REACH` of his arm from the small of her back. The
    // engine's turn bows in from their standing width and back out (`orbit`'s lane). From a
    // quarter beat in, his right arm crossed her left forearm (sprout–player) and the gent stepped
    // 29 cm in (four Ryans); and a tall gent with the smallest lady (ember–sprout, shoulder 1.40 m,
    // her back 0.52, arm 0.94) can reach her back only at the turn's tightest, so a fixed window
    // flipped his arm over trying (93°, 29 cm short).
    const G = bodies[g]!, L = bodies[l]!;
    const lo = Math.round((PULL + BACK_IN) * per), hi = Math.round((BEATS - BACK_IN) * per);
    let best: [number, number] | null = null;
    for (let i = lo, run = -1; i <= hi + 1; i++) {
      const f = frames[i];
      const ok = f !== undefined && i <= hi && (() => {
        const sh = toFloor(G.shoulder[1], f[g]!);
        const bk = toFloor(backPoint(L), f[l]!);
        return Math.hypot(sh[0] - bk[0], sh[1] - bk[1], sh[2] - bk[2]) < BACK_REACH * (G.upper0 + G.fore0);
      })();
      if (ok && run < 0) run = i;
      if (!ok && run >= 0) {
        if (best === null || i - 1 - run > best[1] - best[0]) best = [run, i - 1];
        run = -1;
      }
    }
    if (best !== null && best[1] - best[0] >= per / 2) {
      holds.push({ from: best[0] / (n - 1), to: best[1] / (n - 1), a: { dancer: g, side: 1 }, b: { dancer: l, back: true }, ease: BACK_EASE });
    }
    // And through the whole turn, his arm goes round to her back even where it can't reach it: a
    // reach, at a fraction of a hold's weight, so it points there without being forced (Ryan,
    // 10-28: "put it in position even if it doesn't reach"). Without it, 18 of the 25 sets had
    // no hand at her back at all; at full weight where he can't reach, the arm flipped over.
    holds.push({ from: (PULL + BACK_IN) / BEATS, to: (BEATS - BACK_IN) / BEATS, a: { dancer: g, side: 1 }, b: { dancer: l, back: true }, ease: BACK_EASE, weight: BACK_REACH_WEIGHT });
  }
  return { bodies, frames, holds };
}
