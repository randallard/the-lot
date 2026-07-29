/**
 * The arm channel, driven by the real engine over whole calls.
 *
 * `arm-pose.test.ts` checks the poses and the tracking in isolation; this checks
 * what they add up to when square-one is actually walking two dancers around each
 * other — the part that was wrong three times and that only geometry, not a unit
 * test on one arm, can catch. It is the headless half of the render watch: the
 * numbers a screenshot can't give.
 *
 * An arm here is the segment its rig draws, elbow to hand, in world space — which is
 * what `trackForearm` reports and what a dancer would feel.
 */

import { describe, expect, it } from "vitest";
import { applyCallToPair, createPerformance, type CallName } from "square-one";
import { facingToRotationY, makeFrame, scaleForGaps, toWorld } from "./frame";
import {
  advanceGripBlend,
  armMetrics,
  armPoses,
  gripBlend,
  contact,
  forearm,
  poseArms,
  trackContact,
  trackForearm,
  type ArmMetrics,
  type Forearm,
  type ArmPoses,
  type Placement,
  type Vec3,
} from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
} from "../services/body-shapes";

const CALLS: readonly CallName[] = ["dosado", "pass-thru", "allemande-left"];
const SIDES = ["left", "right"] as const;

/** The debug scene's cast, and deliberately a mixed pair: squat Myco and tall Ember. */
const CAST: readonly [CharacterBodyShape, CharacterBodyShape] = [MYCO_DEFAULTS, EMBER_DEFAULTS];
const METRICS = CAST.map((s) => armMetrics(s)) as [ArmMetrics, ArmMetrics];
const GAP = lateralClearance(rigidParts(CAST[0]), rigidParts(CAST[1]));

interface Arm {
  readonly dancer: 0 | 1;
  readonly side: "left" | "right";
  readonly gripping: boolean;
  readonly metrics: ArmMetrics;
  readonly segment: Forearm;
  /** The arm group's offset from its dancer's centre line — `restX` when untucked. */
  readonly localX: number;
  /** The local aim's vertical component: `−1` hanging, `0` horizontal. */
  readonly aimY: number;
  /** The local aim's sideways component — how far out an emote has swung it. */
  readonly aimX: number;
}

/**
 * An expression layer swinging both arms wide, as `poseArms` receives it — the
 * debug scene's "wide arms" emote at its widest, which is the worst case the
 * envelope has to survive.
 */
function wideOpen(m: ArmMetrics): ArmPoses {
  const out = armPoses();
  for (const side of SIDES) {
    const sign = side === "left" ? 1 : -1;
    out[side].x = sign * m.restX;
    out[side].y = m.restY;
    out[side].z = 0;
    // 85° out to the side: almost horizontal, reaching toward whoever is there.
    out[side].aimX = sign * Math.sin((85 * Math.PI) / 180);
    out[side].aimY = -Math.cos((85 * Math.PI) / 180);
    out[side].aimZ = 0;
  }
  return out;
}

/** One beat's worth of both dancers' arms, in world space. */
function armsAt(call: CallName, beat: number, yaw = 0.4, emoting = false): Arm[] {
  const frame = makeFrame({ x: 0, z: 0 }, scaleForGaps([GAP]), yaw);
  const motions = applyCallToPair(call);
  const perf = createPerformance({ motions: { a: motions.a, b: motions.b } });
  perf.tick(beat);
  const states = perf.tick(0);

  const placements = states.map((st): Placement => {
    const world = toWorld(frame, st.position);
    return { x: world.x, z: world.z, yaw: facingToRotationY(frame, st.facing) };
  }) as [Placement, Placement];

  const arms: Arm[] = [];
  for (const dancer of [0, 1] as const) {
    const motion = dancer === 0 ? motions.a : motions.b;
    const grip = motion.grips.find((g) => perf.beat >= g.from && perf.beat <= g.to);
    const poses = poseArms(
      armPoses(),
      METRICS[dancer],
      METRICS[1 - dancer],
      placements[dancer],
      placements[1 - dancer],
      grip?.hand === "left" ? { left: 1, right: 0 } : { left: 0, right: 0 },
      emoting ? wideOpen(METRICS[dancer]) : undefined,
    );
    for (const side of SIDES) {
      const pose = poses[side];
      arms.push({
        dancer,
        side,
        gripping: grip?.hand === side,
        metrics: METRICS[dancer],
        segment: trackForearm(forearm(), METRICS[dancer], pose, placements[dancer]),
        localX: pose.x,
        aimY: pose.aimY,
        aimX: pose.aimX,
      });
    }
  }
  return arms;
}

/** Closest distance between two segments (Ericson, *Real-Time Collision Detection*). */
function segmentDistance(a: Forearm, b: Forearm): number {
  const d1 = sub(a.hand, a.elbow);
  const d2 = sub(b.hand, b.elbow);
  const r = sub(a.elbow, b.elbow);
  const A = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (A <= 1e-12 && e <= 1e-12) return length(r);
  if (A <= 1e-12) {
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      s = clamp01(-c / A);
    } else {
      const bb = dot(d1, d2);
      const denom = A * e - bb * bb;
      s = denom !== 0 ? clamp01((bb * f - c * e) / denom) : 0;
      t = (bb * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / A);
      } else if (t > 1) {
        t = 1;
        s = clamp01((bb - c) / A);
      }
    }
  }
  return length(sub(add(a.elbow, scale(d1, s)), add(b.elbow, scale(d2, t))));
}

const sub = (p: Vec3, q: Vec3): Vec3 => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
const add = (p: Vec3, q: Vec3): Vec3 => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
const scale = (p: Vec3, k: number): Vec3 => ({ x: p.x * k, y: p.y * k, z: p.z * k });
const dot = (p: Vec3, q: Vec3): number => p.x * q.x + p.y * q.y + p.z * q.z;
const length = (p: Vec3): number => Math.hypot(p.x, p.y, p.z);
const clamp01 = (v: number): number => (v > 0 ? (v > 1 ? 1 : v) : 0);

/** Every beat of a call, at quarter-beat resolution. */
function beatsOf(call: CallName): number[] {
  const motions = applyCallToPair(call);
  const total = Math.max(motions.a.beats, motions.b.beats);
  const out: number[] = [];
  for (let b = 0; b <= total + 1e-9; b += 0.25) out.push(Number(b.toFixed(2)));
  return out;
}

describe.each(CALLS)("%s", (call) => {
  it("never lets the two dancers' arms pass through each other", () => {
    for (const beat of beatsOf(call)) {
      const arms = armsAt(call, beat);
      for (const a of arms.filter((arm) => arm.dancer === 0)) {
        for (const b of arms.filter((arm) => arm.dancer === 1)) {
          // A joined pair is *supposed* to be touching; that is checked below.
          if (a.gripping && b.gripping) continue;
          expect(
            segmentDistance(a.segment, b.segment),
            `${call} beat ${beat}: ${a.side} arm vs partner's ${b.side}`,
          ).toBeGreaterThanOrEqual(a.metrics.armHalfWidth + b.metrics.armHalfWidth - 1e-9);
        }
      }
    }
  });

  it("lays a forearm horizontal only for a grip, and never reaches further out than rest", () => {
    for (const beat of beatsOf(call)) {
      for (const arm of armsAt(call, beat)) {
        expect(arm.aimY, `beat ${beat}`).toBe(arm.gripping ? 0 : -1);
        if (!arm.gripping) {
          expect(Math.abs(arm.localX), `beat ${beat}`).toBeLessThanOrEqual(
            arm.metrics.restX + 1e-9,
          );
        }
      }
    }
  });
});

describe("a forearm grip, over the whole Allemande", () => {
  const gripped = beatsOf("allemande-left")
    .map((beat) => ({ beat, arms: armsAt("allemande-left", beat).filter((a) => a.gripping) }))
    .filter((s) => s.arms.length === 2);

  it("happens at all, for most of the call", () => {
    // arm-turn joins at beat 1 and releases half a beat before the step-out.
    expect(gripped.length).toBeGreaterThan(beatsOf("allemande-left").length / 2);
  });

  it("uses the same hand on both dancers, the one the engine named", () => {
    for (const { beat, arms } of gripped) {
      const [a, b] = arms as [Arm, Arm];
      expect(a.side, `beat ${beat}`).toBe("left");
      expect(b.side).toBe("left");
    }
  });

  it("holds both forearms horizontal, at one shared height", () => {
    for (const { beat, arms } of gripped) {
      const [a, b] = arms as [Arm, Arm];
      const height = (a.metrics.elbowY + b.metrics.elbowY) / 2;
      for (const arm of arms) {
        expect(arm.segment.elbow.y, `beat ${beat}`).toBeCloseTo(height, 9);
        expect(arm.segment.hand.y, `beat ${beat}`).toBeCloseTo(height, 9);
      }
    }
  });

  it("alternates them — each forearm points the opposite way", () => {
    for (const { beat, arms } of gripped) {
      const [a, b] = arms as [Arm, Arm];
      const da = unit(sub(a.segment.hand, a.segment.elbow));
      const db = unit(sub(b.segment.hand, b.segment.elbow));
      expect(dot(da, db), `beat ${beat}`).toBeCloseTo(-1, 6);
    }
  });

  it("keeps each hand on the partner's forearm, holding it", () => {
    for (const { beat, arms } of gripped) {
      const [a, b] = arms as [Arm, Arm];
      for (const [holder, held] of [
        [a, b],
        [b, a],
      ] as const) {
        const c = trackContact(
          contact(),
          holder.segment.hand,
          holder.metrics.handRadius,
          held.segment,
          held.metrics.forearmHalfWidth,
        );
        // Strictly on the forearm, not off an end.
        expect(c.along, `beat ${beat}: ${holder.dancer} on ${held.dancer}`).toBeGreaterThanOrEqual(0);
        expect(c.along, `beat ${beat}`).toBeLessThanOrEqual(1);
        // Negative gap is a hold: a hand wrapping a forearm overlaps it.
        expect(c.gap, `beat ${beat}`).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it("holds the shorter-armed dancer's reach — the longer arm meets their elbow", () => {
    // Myco's forearm is the shorter, so `contactRadius` follows it: Ember's hand
    // lands on Myco's elbow, and Myco's hand holds partway up Ember's forearm.
    for (const { beat, arms } of gripped) {
      const myco = arms.find((a) => a.dancer === 0);
      const ember = arms.find((a) => a.dancer === 1);
      if (!myco || !ember) throw new Error("both dancers grip");
      const onMyco = trackContact(
        contact(),
        ember.segment.hand,
        ember.metrics.handRadius,
        myco.segment,
        myco.metrics.forearmHalfWidth,
      );
      expect(onMyco.along, `beat ${beat}`).toBeCloseTo(0, 5);
    }
  });

  it("stays centred on the pivot the pair turns about", () => {
    for (const { beat, arms } of gripped) {
      const [a, b] = arms as [Arm, Arm];
      // The two hands straddle the pivot, so their midpoint is it. Compare against
      // the dancers' own midpoint by rebuilding it from the same frame.
      const mid = {
        x: (a.segment.hand.x + b.segment.hand.x) / 2,
        z: (a.segment.hand.z + b.segment.hand.z) / 2,
      };
      const centre = pairCentre("allemande-left", beat);
      expect(mid.x, `beat ${beat}`).toBeCloseTo(centre.x, 6);
      expect(mid.z, `beat ${beat}`).toBeCloseTo(centre.z, 6);
    }
  });

  it("holds steady and only rotates while the bodies breathe around it", () => {
    // The pair's separation pulses 1.56 → 1.10 → 1.56 through the turn (`arm-turn`
    // walks the chords of its orbit, and Ryan wants that). The **grip does not
    // follow**: it is a rigid join pinned to the pivot, and the undrawn upper arm
    // is the compliant link that takes up the difference. So every gripping
    // elbow and hand keeps a constant distance from the pivot for the whole span,
    // and the joined forearms only turn.
    const radii = gripped.map(({ beat, arms }) => {
      const centre = pairCentre("allemande-left", beat);
      const at = (p: Vec3): number => Math.hypot(p.x - centre.x, p.z - centre.z);
      return { beat, arms, values: arms.flatMap((a) => [at(a.segment.elbow), at(a.segment.hand)]) };
    });
    const first = radii[0];
    if (!first) throw new Error("expected a gripped span");

    for (const { beat, values } of radii) {
      values.forEach((v, i) => {
        expect(v, `beat ${beat}, point ${i}`).toBeCloseTo(first.values[i] ?? NaN, 6);
      });
    }
  });

  it("breathes at the bodies, not at the grip", () => {
    // The premise the test above depends on: the pair's own separation does change
    // materially over the same span the grip holds constant.
    const separations = gripped.map(({ beat }) => pairSeparation("allemande-left", beat));
    expect(Math.max(...separations) - Math.min(...separations)).toBeGreaterThan(0.4);
  });
});

function unit(v: Vec3): Vec3 {
  const l = length(v);
  return l === 0 ? v : scale(v, 1 / l);
}

function pairSeparation(call: CallName, beat: number): number {
  const frame = makeFrame({ x: 0, z: 0 }, scaleForGaps([GAP]), 0.4);
  const motions = applyCallToPair(call);
  const perf = createPerformance({ motions: { a: motions.a, b: motions.b } });
  perf.tick(beat);
  const states = perf.tick(0);
  const p = states.map((st) => toWorld(frame, st.position));
  return Math.hypot(p[0]!.x - p[1]!.x, p[0]!.z - p[1]!.z);
}

function pairCentre(call: CallName, beat: number): { x: number; z: number } {
  const frame = makeFrame({ x: 0, z: 0 }, scaleForGaps([GAP]), 0.4);
  const motions = applyCallToPair(call);
  const perf = createPerformance({ motions: { a: motions.a, b: motions.b } });
  perf.tick(beat);
  const states = perf.tick(0);
  const points = states.map((st) => toWorld(frame, st.position));
  return {
    x: (points[0]!.x + points[1]!.x) / 2,
    z: (points[0]!.z + points[1]!.z) / 2,
  };
}

/**
 * The driver's own loop, replayed at 60 fps.
 *
 * Sampling `poseArms` beat by beat (everything above) checks the *intent*. It cannot
 * catch what the driver does with that intent frame to frame, and that is exactly
 * where the grip broke: while the pose was eased toward rather than written, the
 * arms lagged, and because each dancer's lag pivots on their own shoulder instead of
 * the shared pivot, the pair slid against each other and let go twice per breath —
 * `hand↔pivot` wandering 0.151–0.248 and `gap` going positive, all while every
 * beat-sampled assertion above passed. This is the test that would have caught it.
 */
describe("driven frame by frame", () => {
  interface Held {
    beat: number;
    radii: number[];
    gaps: number[];
    separation: number;
  }

  function replay(call: CallName, fps = 60, bpm = 120): Held[] {
    const frame = makeFrame({ x: 0, z: 0 }, scaleForGaps([GAP]), 0.4);
    const motions = applyCallToPair(call);
    const perf = createPerformance({ motions: { a: motions.a, b: motions.b } });
    const dt = 1 / fps;
    const ease = Math.min(1, dt * 10);
    const blends = [gripBlend(), gripBlend()];
    const places: Placement[] = [
      { x: 0, z: 0, yaw: 0 },
      { x: 0, z: 0, yaw: 0 },
    ];
    const held: Held[] = [];

    while (!perf.done) {
      const states = perf.tick(dt * (bpm / 60));
      states.forEach((st, i) => {
        const w = toWorld(frame, st.position);
        const place = places[i];
        if (!place) return;
        place.x = w.x;
        place.z = w.z;
        place.yaw = facingToRotationY(frame, st.facing);
      });
      const beat = perf.beat;

      const segments: (Forearm | null)[] = [null, null];
      const joined: boolean[] = [false, false];
      for (let i = 0; i < 2; i++) {
        const motion = i === 0 ? motions.a : motions.b;
        const grip = motion.grips.find((g) => beat >= g.from && beat <= g.to);
        const blend = blends[i];
        const me = METRICS[i];
        const them = METRICS[1 - i];
        const self = places[i];
        const partner = places[1 - i];
        if (!blend || !me || !them || !self || !partner) continue;
        advanceGripBlend(blend, grip?.hand ?? null, ease);
        const poses = poseArms(armPoses(), me, them, self, partner, blend);
        // Only the fully-joined frames are the contract; the blend in and out is a
        // transition and is allowed to move.
        joined[i] = blend.left === 1;
        segments[i] = trackForearm(forearm(), me, poses.left, self);
      }

      const [sa, sb] = segments;
      const [pa, pb] = places;
      if (joined[0] === true && joined[1] === true && sa && sb && pa && pb) {
        const px = (pa.x + pb.x) / 2;
        const pz = (pa.z + pb.z) / 2;
        const at = (p: Vec3): number => Math.hypot(p.x - px, p.z - pz);
        held.push({
          beat,
          radii: [at(sa.elbow), at(sa.hand), at(sb.elbow), at(sb.hand)],
          gaps: [
            trackContact(contact(), sa.hand, METRICS[0].handRadius, sb, METRICS[1].forearmHalfWidth).gap,
            trackContact(contact(), sb.hand, METRICS[1].handRadius, sa, METRICS[0].forearmHalfWidth).gap,
          ],
          separation: Math.hypot(pa.x - pb.x, pa.z - pb.z),
        });
      }
    }
    return held;
  }

  const held = replay("allemande-left");

  it("holds for most of the call once joined", () => {
    // 8 beats at 120 bpm is 240 frames; the grip span is beats 1 → 7.5, less the
    // blend in. Anything near that means the join really is being held, not sampled.
    expect(held.length).toBeGreaterThan(150);
  });

  it("keeps every joint a fixed distance from the pivot, every frame", () => {
    const first = held[0];
    if (!first) throw new Error("expected held frames");
    for (const f of held) {
      f.radii.forEach((r, i) => {
        expect(r, `beat ${f.beat.toFixed(2)}, joint ${i}`).toBeCloseTo(first.radii[i] ?? NaN, 6);
      });
    }
  });

  it("never lets go", () => {
    for (const f of held) {
      for (const gap of f.gaps) {
        expect(gap, `beat ${f.beat.toFixed(2)}`).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it("breathes at the bodies over the same frames", () => {
    const seps = held.map((f) => f.separation);
    expect(Math.max(...seps) - Math.min(...seps)).toBeGreaterThan(0.4);
  });
});

describe("an emote during a call", () => {
  // The arbitration this channel exists for: expression plays, and cannot put an arm
  // through another dancer. Both dancers swing both arms wide for the whole call —
  // far more than any real emote asks for at the worst possible moment.
  it.each(CALLS)("never lets wide-swung arms cross during %s", (call) => {
    for (const beat of beatsOf(call)) {
      const arms = armsAt(call, beat, 0.4, true);
      for (const a of arms.filter((arm) => arm.dancer === 0)) {
        for (const b of arms.filter((arm) => arm.dancer === 1)) {
          if (a.gripping && b.gripping) continue;
          expect(
            segmentDistance(a.segment, b.segment),
            `${call} beat ${beat}: ${a.side} vs partner's ${b.side}`,
          ).toBeGreaterThanOrEqual(a.metrics.armHalfWidth + b.metrics.armHalfWidth - 1e-9);
        }
      }
    }
  });

  it("still plays — the arms are folded, not parked", () => {
    // Away from a pass the emote is untouched; the fold is local to the trespass.
    const roomy = armsAt("dosado", 0, 0.4, true);
    for (const arm of roomy) {
      expect(Math.abs(arm.localX)).toBeCloseTo(arm.metrics.restX, 9);
      expect(arm.aimY).toBeLessThan(-0.05);
      expect(Math.abs(arm.aimX)).toBeGreaterThan(0.9);
    }
  });

  it("gives a gripped hand to the choreography, emote or not", () => {
    const mid = armsAt("allemande-left", 4, 0.4, true).filter((a) => a.gripping);
    expect(mid).toHaveLength(2);
    for (const arm of mid) {
      // Horizontal into the grip, not swung wide by the emote.
      expect(arm.aimY).toBe(0);
    }
  });
});

describe("hands-free calls", () => {
  it.each(["dosado", "pass-thru"] as const)("%s never engages a grip", (call) => {
    for (const beat of beatsOf(call)) {
      expect(armsAt(call, beat).filter((a) => a.gripping)).toHaveLength(0);
    }
  });

  it("hangs both arms at rest before the dosado starts", () => {
    for (const arm of armsAt("dosado", 0)) {
      expect(Math.abs(arm.localX)).toBeCloseTo(arm.metrics.restX, 9);
    }
  });

  it("folds the passing arm in at the dosado's closest pass, and only that one", () => {
    // The defect this channel exists to fix. At the tightest beat exactly one arm on
    // each dancer — the one on the side they are passing — is folded in, and the
    // outside arm is still hanging free.
    const tightest = beatsOf("dosado")
      .map((beat) => armsAt("dosado", beat))
      .map((arms) => ({
        arms,
        fold: Math.max(...arms.map((a) => a.metrics.restX - Math.abs(a.localX))),
      }))
      .sort((a, b) => b.fold - a.fold)[0];
    if (!tightest) throw new Error("expected beats");

    const folded = tightest.arms.filter((a) => a.metrics.restX - Math.abs(a.localX) > 1e-6);
    expect(folded).toHaveLength(2);
    expect(new Set(folded.map((a) => a.side)).size, "the same side on both dancers").toBe(1);
    for (const arm of tightest.arms.filter((a) => !folded.includes(a))) {
      expect(Math.abs(arm.localX)).toBeCloseTo(arm.metrics.restX, 9);
    }
  });
});
