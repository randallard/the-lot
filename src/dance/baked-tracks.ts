/**
 * 🧪 **Baked tracks** (2026-10-25, exploratory, no ADR): a solved couple's pose over one call,
 * kept in the repo, and drawn by **every** `DanceFloor`, so `#review`, `#dance`, `#review2`'s
 * engine mode and the game all show the solve, not just `#review2`'s keyframe mode.
 *
 * Plan: `work/square-dance-planning/review2/PROGRESS.md` (path A). Made by
 * `scripts/whole-move/bake.ts` from a `#review2` bundle and the floor paths it was solved on.
 *
 * ## What a bake holds, and why it is relative
 *
 * The whole-move solver (`whole-move.ts`) keeps the engine's facings and moves only the arms and
 * the beau's spot. So a bake keeps:
 *
 * - the **arm and hand dials** (`pose-dials.ts`), which are in the dancer's own frame already;
 * - each dancer's **step off the engine's path** as `<d>.offset.x` / `<d>.offset.z` (cm), in that
 *   dancer's own frame (+z forward, +x the anatomical left), *not* the couple's floor position.
 *
 * Relative, so the same bake fits wherever the couple stands and whichever way it faces: a second
 * Twirl in a sequence, a couple in a ring, a square on the town floor. The engine places the
 * dancer; the bake only adds the step and the arms.
 *
 * ## When one applies
 *
 * Matched by the call and by **both bodies' solver geometry** (`bodyPrint`), so a body that has
 * been reshaped since the solve doesn't get arms solved for someone else. It falls back to the
 * floor's own pose (`arm-pose.ts`) instead.
 *
 * Between keyframes the pose is **linear**, not eased: a solved track is dense (every 2.5%), and
 * easing in and out of each keyframe would pulse (the-lot journal 10-25-1).
 */

import * as THREE from "three";
import type { CharacterBodyShape } from "../services/body-shapes";
import { applyToRigs, mixPoses } from "./pose-dials";
import type { DialKey } from "./pose-events";
import { bodyOf } from "./whole-move";

export const BAKE_FORMAT = "townage-baked-track";

export interface BakedKeyframe {
  /** Fraction of the call, 0–1. */
  readonly t: number;
  /**
   * Arm and hand dials, `<d>.offset.x/z` (cm, the dancer's own frame), and {@link GAP_KEY}: how far
   * apart the engine had the two at this moment when it was solved.
   */
  readonly values: Readonly<Record<DialKey, number>>;
}

/**
 * The engine's beau–belle distance (cm) the solve was done on, at each keyframe. Not a dial:
 * `applyToRigs` passes over it, and {@link bakeFits} checks the live engine against it.
 */
export const GAP_KEY: DialKey = "engine.gap";

/**
 * How far (cm) the live engine's spacing may differ from the solve's before a bake is left off.
 * The arms reach across the gap the solve saw, so a wider gap leaves the hands short (10-26:
 * review 1's own arch sizing stood the pair 80 cm wider and the hands missed by 94 cm).
 */
export const GAP_TOLERANCE_CM = 5;

/**
 * How the floor sized the call's figure when the solve's paths were captured: the arch's
 * accommodation, and the join-overhead and pair-closes dials (`DanceFloor`'s `arches`). A floor
 * drawing the bake sizes the figure this way, whatever its own dials or coin flip say, so the
 * engine walks the paths the arms were solved on.
 */
export interface BakedSizing {
  readonly accommodation: "reshape" | "break";
  readonly overhead: number;
  readonly close: number;
}

/** What `#review2` sizes a twirl with: no overhead or close dial, no duck. Its coin flip gave a reshape. */
export const REVIEW2_SIZING: BakedSizing = { accommodation: "reshape", overhead: 0, close: 0 };

export interface BakedTrack {
  readonly format: typeof BAKE_FORMAT;
  readonly version: 1;
  /** The square-one call this is a solve of. */
  readonly call: string;
  /** Beau then belle, by name, for people reading the file. Matching is by `bodies`. */
  readonly pairing: string;
  /** Beau then belle: `bodyPrint` of the shapes it was solved for. */
  readonly bodies: readonly [string, string];
  /** Where it came from: the solve, its margin, the date. */
  readonly note: string;
  /** How the floor sized the figure for the solve. Missing: the floor's own sizing, and only the gap check guards it. */
  readonly sizing?: BakedSizing;
  readonly keyframes: readonly BakedKeyframe[];
}

export function isBakedTrack(x: unknown): x is BakedTrack {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    r.format === BAKE_FORMAT &&
    r.version === 1 &&
    typeof r.call === "string" &&
    Array.isArray(r.bodies) &&
    r.bodies.length === 2 &&
    Array.isArray(r.keyframes) &&
    r.keyframes.length > 0
  );
}

/** Stable JSON: keys sorted, numbers to 0.1 mm, so the same geometry always prints the same. */
function canonical(v: unknown): string {
  if (typeof v === "number") return String(Math.round(v * 1e4) / 1e4);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${k}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/**
 * A short print of the body **as the solver sees it** (`bodyOf`: shoulders, head, torso, arm
 * lengths, forearm and hand radii). Colour, eyes and the like don't change a solve, so they don't
 * change the print.
 */
export function bodyPrint(shape: CharacterBodyShape): string {
  const s = canonical(bodyOf(shape));
  // FNV-1a, 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The bake for this call and these two bodies (beau first), if there is one. */
export function findBake(
  tracks: readonly BakedTrack[],
  call: string,
  shapes: readonly CharacterBodyShape[],
): BakedTrack | undefined {
  const [a, b] = shapes;
  if (a === undefined || b === undefined) return undefined;
  const pa = bodyPrint(a);
  const pb = bodyPrint(b);
  return tracks.find((k) => k.call === call && k.bodies[0] === pa && k.bodies[1] === pb);
}

/** The pose at `t` (0–1 of the call): linear between keyframes, held past either end. */
export function sampleBaked(track: BakedTrack, t: number): Record<DialKey, number> {
  const ks = track.keyframes;
  const first = ks[0]!;
  const last = ks[ks.length - 1]!;
  if (t <= first.t) return { ...first.values };
  if (t >= last.t) return { ...last.values };
  let i = 0;
  while (i < ks.length - 2 && ks[i + 1]!.t <= t) i++;
  const a = ks[i]!;
  const b = ks[i + 1]!;
  const span = b.t - a.t;
  return mixPoses(a.values, b.values, span <= 1e-9 ? 0 : (t - a.t) / span);
}

/**
 * A floor-plane step (cm) between the couple's frame and a dancer's own, for a dancer whose
 * `rotation.y` is `yaw`. `toDancer` takes a couple-frame step into the dancer's; `toCouple` is its
 * inverse, and is what `applyBaked` does with three.js's `applyAxisAngle`.
 */
export function stepToDancer(dx: number, dz: number, yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [dx * c - dz * s, dx * s + dz * c];
}
export function stepToCouple(lx: number, lz: number, yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/**
 * Whether the live engine has the pair where the solve had them: the distance between the two
 * rigs (as the engine placed them, before the bake's step) against the sampled {@link GAP_KEY}.
 * Returns how far off it is (cm), or `0` for a bake with no gap recorded.
 */
export function gapOff(rigs: readonly THREE.Object3D[], values: Readonly<Record<DialKey, number>>): number {
  const want = values[GAP_KEY];
  const [a, b] = rigs;
  if (want === undefined || a === undefined || b === undefined) return 0;
  const have = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) * 100;
  return Math.abs(have - want);
}

export const bakeFits = (off: number) => off <= GAP_TOLERANCE_CM;

/**
 * Puts a sampled bake onto a couple's rigs (beau first), **after** the floor has placed and posed
 * them: the step onto the engine's spot, the arms over the floor's arms.
 */
export function applyBaked(
  rigs: readonly THREE.Object3D[],
  shapes: readonly CharacterBodyShape[],
  values: Readonly<Record<DialKey, number>>,
): void {
  rigs.forEach((rig, d) => {
    const ox = values[`${String(d)}.offset.x`];
    const oz = values[`${String(d)}.offset.z`];
    if (ox === undefined || oz === undefined) return;
    const [dx, dz] = stepToCouple(ox / 100, oz / 100, rig.rotation.y);
    rig.position.x += dx;
    rig.position.z += dz;
  });
  // The `offset` keys aren't dials, so `applyToRigs` passes over them.
  applyToRigs(rigs, shapes, values);
}

/** One path sample: the engine's spot (cm, couple frame) and facing (deg, rig yaw). */
export interface PathSample {
  readonly x: number;
  readonly z: number;
  readonly facing: number;
}

const DROP = /\.torso\.(x|z|facing)$/;

/**
 * A `#review2` keyframe track (absolute: the couple-frame spot and facing included) → a bake's
 * keyframes, against the engine path it was solved on (`paths[i]` at `t = i / (n − 1)`, one array
 * per dancer). The spot becomes a step in the dancer's own frame; the facing is dropped, because
 * the solver keeps the engine's.
 */
export function relativeKeyframes(
  keyframes: readonly { readonly t: number; readonly values: Readonly<Record<DialKey, number>> }[],
  paths: readonly [readonly PathSample[], readonly PathSample[]],
): BakedKeyframe[] {
  const at = (p: readonly PathSample[], t: number): PathSample => {
    const u = Math.min(1, Math.max(0, t)) * (p.length - 1);
    const i = Math.min(p.length - 2, Math.floor(u));
    const a = p[i]!;
    const b = p[i + 1]!;
    const f = u - i;
    let dy = b.facing - a.facing;
    dy = ((((dy + 180) % 360) + 360) % 360) - 180;
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, facing: a.facing + dy * f };
  };
  return keyframes.map((k) => {
    const values: Record<DialKey, number> = {};
    for (const [key, v] of Object.entries(k.values)) if (!DROP.test(key)) values[key] = v;
    paths.forEach((p, d) => {
      const x = k.values[`${String(d)}.torso.x`];
      const z = k.values[`${String(d)}.torso.z`];
      if (x === undefined || z === undefined) return;
      const e = at(p, k.t);
      const [lx, lz] = stepToDancer(x - e.x, z - e.z, (e.facing * Math.PI) / 180);
      values[`${String(d)}.offset.x`] = Math.round(lx * 10) / 10;
      values[`${String(d)}.offset.z`] = Math.round(lz * 10) / 10;
    });
    const [pa, pb] = paths;
    const ea = at(pa, k.t);
    const eb = at(pb, k.t);
    values[GAP_KEY] = Math.round(Math.hypot(ea.x - eb.x, ea.z - eb.z) * 10) / 10;
    return { t: k.t, values };
  });
}

const files = import.meta.glob("./baked/*.json", { eager: true, import: "default" });

/** Every bake in `src/dance/baked/`. */
export const BAKED_TRACKS: readonly BakedTrack[] = Object.values(files).filter(isBakedTrack);

/**
 * Which call a beat falls in (the last whose span starts at or before it), and its index. A beat
 * on a boundary belongs to the call starting there; past the end, to the last call.
 */
export function spanAt<S extends { readonly startBeat: number; readonly beats: number }>(
  spans: readonly S[],
  beat: number,
): (S & { readonly index: number }) | undefined {
  let found: (S & { readonly index: number }) | undefined;
  spans.forEach((s, index) => {
    if (s.startBeat <= beat + 1e-9) found = { ...s, index };
  });
  return found ?? (spans[0] === undefined ? undefined : { ...spans[0], index: 0 });
}
