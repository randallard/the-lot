/**
 * 🧪 **Four-dancer bakes** (2026-10-28, exploratory, no ADR): a solved call for two facing
 * couples (`whole-move-n.ts`), kept in the repo so `#review2` can draw all 25 sets without solving
 * 25 times (≈3.5 s each) when it opens.
 *
 * Not the couple bakes' format (`baked-tracks.ts`). Those keep each dancer's step **off the
 * engine's path**, because the engine places a couple. square-one has no call for four yet, so
 * these paths are the-lot's own (`whole-move-rlt.ts`) and a bake keeps the whole solve: each
 * dancer's floor spot, facing and arms, in metres and radians about the middle of the set.
 *
 * Compact on purpose: four dancers at 10 samples a beat in the couple bakes' dial records would
 * be ~230 KB a set. A row here is one sample, 15 numbers a dancer ({@link FIELDS}), rounded to
 * 0.1 mm / 0.0001 rad. The files are loaded one set at a time, when it's drawn.
 *
 * Matched by every dancer's solver geometry (`bodyPrint`), like the couple bakes: a body reshaped
 * since the solve gets a fresh solve instead (`SolvedFloor`).
 */

import type { CharacterBodyShape } from "../services/body-shapes";
import { bodyPrint } from "./baked-tracks";
import { toDials, type Arm, type DancerFrame } from "./whole-move";

export const FOUR_FORMAT = "townage-baked-four";

/** The calls the-lot solves for four. Only one so far (step 5). */
export type FourCall = "right-and-left-thru";

export interface FourBake {
  readonly format: typeof FOUR_FORMAT;
  readonly version: 1;
  readonly call: FourCall;
  /** The cast, gent 1 · his partner · gent 2 · his partner. */
  readonly cast: readonly string[];
  /** `bodyPrint` of each, in the same order. */
  readonly bodies: readonly string[];
  readonly perBeat: number;
  /** How it was made and how it scored. */
  readonly note: string;
  /** One row a sample: {@link FIELDS} for each dancer in turn. */
  readonly rows: readonly (readonly number[])[];
}

const ARM_FIELDS = ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const;
/** x, z, yaw, then the left arm and the right arm. */
export const FIELDS = 3 + 2 * ARM_FIELDS.length;

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function encodeRows(frames: readonly (readonly DancerFrame[])[]): number[][] {
  return frames.map((f) => f.flatMap((d) => [r4(d.x), r4(d.z), r4(d.yaw), ...d.arms.flatMap((a) => ARM_FIELDS.map((k) => r4(a[k])))]));
}

export function decodeRows(rows: readonly (readonly number[])[]): DancerFrame[][] {
  return rows.map((row) => {
    const out: DancerFrame[] = [];
    for (let o = 0; o + FIELDS <= row.length; o += FIELDS) {
      const arm = (at: number): Arm => {
        const a = { raise: 0, toward: 0, ulen: 0, pitch: 0, heading: 0, flen: 0 };
        ARM_FIELDS.forEach((k, i) => { a[k] = row[o + at + i] ?? 0; });
        return a;
      };
      out.push({ x: row[o] ?? 0, z: row[o + 1] ?? 0, yaw: row[o + 2] ?? 0, arms: [arm(3), arm(3 + ARM_FIELDS.length)] });
    }
    return out;
  });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sample `u` (fractional) of the frames: each number straight between its neighbours. */
export function frameAt(frames: readonly (readonly DancerFrame[])[], u: number): DancerFrame[] {
  const i = Math.max(0, Math.min(frames.length - 1, Math.floor(u)));
  const j = Math.min(frames.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, u - i));
  const a = frames[i]!;
  const b = frames[j]!;
  return a.map((d, k) => {
    const e = b[k]!;
    const arm = (s: 0 | 1): Arm => {
      const p = d.arms[s];
      const q = e.arms[s];
      return {
        raise: lerp(p.raise, q.raise, t), toward: lerp(p.toward, q.toward, t), ulen: lerp(p.ulen, q.ulen, t),
        pitch: lerp(p.pitch, q.pitch, t), heading: lerp(p.heading, q.heading, t), flen: lerp(p.flen, q.flen, t),
      };
    };
    return { x: lerp(d.x, e.x, t), z: lerp(d.z, e.z, t), yaw: lerp(d.yaw, e.yaw, t), arms: [arm(0), arm(1)] };
  });
}

/** Every dancer's dials at `beat`, as `applyToRigs` takes them. */
export function dialsAt(frames: readonly (readonly DancerFrame[])[], perBeat: number, beat: number): Record<string, number> {
  return Object.assign({}, ...frameAt(frames, beat * perBeat).map((d, k) => toDials(d, k))) as Record<string, number>;
}

export function fourFileName(call: FourCall, cast: readonly string[]): string {
  return `${call}.${cast.join("-")}.json`;
}

function isFourBake(x: unknown): x is FourBake {
  return typeof x === "object" && x !== null && (x as { format?: unknown }).format === FOUR_FORMAT;
}

const files = import.meta.glob("./baked-four/*.json", { import: "default" });

/**
 * The bake for this call and cast, if there is one and every body still matches it. Loaded when
 * asked for, not with the page.
 */
export async function loadFourBake(call: FourCall, cast: readonly string[], shapes: readonly CharacterBodyShape[]): Promise<FourBake | undefined> {
  const load = files[`./baked-four/${fourFileName(call, cast)}`];
  if (load === undefined) return undefined;
  const got = await load();
  if (!isFourBake(got)) return undefined;
  return got.bodies.every((p, i) => shapes[i] !== undefined && p === bodyPrint(shapes[i])) ? got : undefined;
}
