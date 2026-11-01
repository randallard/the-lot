/**
 * 🧪 What `#review2`'s dials are, and what each one reads off the drawn rig. (2026-10-18)
 *
 * Every dial is an **absolute** value of the pose on screen: between keyframes, a dial shows what
 * the figure is doing (Ryan, 2026-10-18), and a keyframe keeps all of them. So each aspect is
 * something that can be **measured from what is drawn**: mesh rotations, and the shoulder, elbow
 * and hand positions in the dancer's own frame. It is not a solver input. That is why the upper
 * arm has no twist (it is undrawn, so nothing shows one), and why the forearm is described by
 * where it points rather than by the solve's aim vector.
 *
 * The dancer's frame: facing +z, up +y, and +x is the anatomical **left** (ADR-0017's `SIGN`).
 * "Toward" angles are 0° straight ahead and +90° out to that arm's own side.
 *
 * The hand's three angles are its mesh rotation inside the forearm group, rest styling included.
 * They are approximate and will move when the hand is modelled properly.
 *
 * ## Writing a dial back (`applyToRigs`)
 *
 * The inverse, onto the drawn rig, after the floor has posed it: a dial **moves the picture**,
 * not the solver. So it's what you dial, exactly, with no rule keeping anything else right. The
 * shoulders don't follow a torso lean, and a hand stays where its forearm puts it even if that
 * breaks a hold. **Elbow bend is a readout only**: it's fixed by where the upper arm and the
 * forearm point, which are the dials that move it.
 */

import * as THREE from "three";
import type { CharacterBodyShape } from "../services/body-shapes";
import type { DialKey, Keyframe } from "./pose-events";

export type PartId =
  | "torso"
  | "head"
  | "upper-arm-left"
  | "upper-arm-right"
  | "forearm-left"
  | "forearm-right"
  | "hand-left"
  | "hand-right";

export interface Aspect {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: "°" | "cm";
  /** Measured, not set: follows from other dials. */
  readonly readOnly?: true;
}

export interface PartSpec {
  readonly label: string;
  readonly aspects: readonly Aspect[];
  readonly linked: readonly PartId[];
  readonly note?: string;
  /** What the note is waiting on, for its hover. */
  readonly why?: string;
}

const deg = (id: string, label: string, min: number, max: number): Aspect => ({ id, label, min, max, step: 1, unit: "°" });
const cm = (id: string, label: string, min: number, max: number): Aspect => ({ id, label, min, max, step: 0.5, unit: "cm" });

function upperArm(side: "left" | "right"): PartSpec {
  return {
    label: `Upper arm (${side})`,
    aspects: [
      deg("raise", "raised from hanging", 0, 180),
      deg("toward", "raised toward (0 fwd, 90 side)", -180, 180),
      cm("length", "shoulder to elbow", 0, 80),
    ],
    linked: ["torso", `forearm-${side}`, `hand-${side}`],
    note: "Undrawn — the gap between shoulder and elbow. It is where the elbow ends up.",
  };
}

function forearm(side: "left" | "right"): PartSpec {
  return {
    label: `Forearm (${side})`,
    aspects: [
      { ...deg("bend", "elbow bend (0 straight)", 0, 180), readOnly: true },
      deg("pitch", "points up / down (0 level)", -90, 90),
      deg("heading", "points toward (0 fwd, 90 side)", -180, 180),
      cm("length", "elbow to hand", 0, 80),
    ],
    linked: [`upper-arm-${side}`, `hand-${side}`],
  };
}

function hand(side: "left" | "right"): PartSpec {
  return {
    label: `Hand (${side})`,
    aspects: [
      deg("bend", "wrist bend", -180, 180),
      deg("side", "wrist side to side", -180, 180),
      deg("roll", "palm roll", -180, 180),
    ],
    linked: [`forearm-${side}`, `upper-arm-${side}`],
    note: "When this hand is in a hold, the partner's hand is linked too — not wired yet.",
    why:
      "A held hand and its partner's are one point, so dialling one has to move the other. Once wired, " +
      "the partner's hand (and the forearm and upper arm behind it) appear here as linked parts. Which " +
      "hand is held comes from square-one's declared hold (GripSpan.hand, ADR-0056), not from where " +
      "the hands happen to be. The three angles here are read off the hand mesh and are approximate.",
  };
}

export const PARTS: Readonly<Record<PartId, PartSpec>> = {
  torso: {
    label: "Torso",
    aspects: [
      deg("lean-fwd", "lean forward / back", -45, 45),
      deg("lean-side", "lean side to side", -30, 30),
      deg("facing", "facing (floor)", -180, 180),
      cm("x", "floor position x", -300, 300),
      cm("z", "floor position z", -300, 300),
      cm("length", "torso length", 0, 250),
    ],
    linked: ["head", "upper-arm-left", "upper-arm-right"],
  },
  head: {
    label: "Head",
    aspects: [deg("turn", "turn", -120, 120), deg("nod", "nod", -60, 60), deg("tilt", "tilt", -45, 45)],
    linked: ["torso"],
  },
  "upper-arm-left": upperArm("left"),
  "upper-arm-right": upperArm("right"),
  "forearm-left": forearm("left"),
  "forearm-right": forearm("right"),
  "hand-left": hand("left"),
  "hand-right": hand("right"),
};

export const isPartId = (s: string): s is PartId => s in PARTS;

export const dialKey = (dancer: number, part: PartId, aspect: string): DialKey => `${String(dancer)}.${part}.${aspect}`;

/** The couple's width: the two dancers' floor positions apart, in cm. */
export const WIDTH_KEY: DialKey = "couple.width";

/** A checked index read, local on purpose (journal 10-31 (8): an imported helper is slower in the bakes). */
const nth = <T>(a: readonly T[], i: number): T => {
  const x = a[i];
  if (x === undefined) throw new RangeError(`pose-dials: index ${String(i)} outside ${String(a.length)}`);
  return x;
};

const R2D = 180 / Math.PI;
const round = (v: number, step: number) => Math.round(v / step) * step;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _h = new THREE.Vector3();
const _u = new THREE.Vector3();
const _f = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _euler = new THREE.Euler();

/** Every dial's value off the drawn rigs, beau first. Parts that cannot be found are left out. */
export function readRigs(rigs: readonly THREE.Object3D[], shapes: readonly CharacterBodyShape[]): Record<DialKey, number> {
  const out: Record<DialKey, number> = {};
  const put = (k: DialKey, v: number, unit: "°" | "cm") => { out[k] = round(v, unit === "°" ? 1 : 0.5); };

  rigs.forEach((rig, d) => {
    const torso = rig.getObjectByName("torso");
    const shape = shapes[d];
    if (torso !== undefined) {
      put(dialKey(d, "torso", "lean-fwd"), torso.rotation.x * R2D, "°");
      put(dialKey(d, "torso", "lean-side"), torso.rotation.z * R2D, "°");
      if (shape !== undefined) put(dialKey(d, "torso", "length"), torso.scale.y * shape.body.height * 100, "cm");
    }
    put(dialKey(d, "torso", "facing"), wrap(rig.rotation.y * R2D), "°");
    put(dialKey(d, "torso", "x"), rig.position.x * 100, "cm");
    put(dialKey(d, "torso", "z"), rig.position.z * 100, "cm");

    const head = rig.getObjectByName("head")?.parent;
    if (head !== undefined && head !== null) {
      put(dialKey(d, "head", "turn"), head.rotation.y * R2D, "°");
      put(dialKey(d, "head", "nod"), head.rotation.x * R2D, "°");
      put(dialKey(d, "head", "tilt"), head.rotation.z * R2D, "°");
    }

    for (const side of ["left", "right"] as const) {
      const sign = side === "left" ? 1 : -1;
      const fore = rig.getObjectByName(`forearm-${side}`);
      const handMesh = rig.getObjectByName(`hand-${side}`);
      const arm = fore?.parent;
      const shoulder = arm?.parent;
      if (fore === undefined || handMesh === undefined || arm == null || shoulder == null) continue;
      rig.worldToLocal(shoulder.getWorldPosition(_s));
      rig.worldToLocal(arm.getWorldPosition(_e));
      rig.worldToLocal(handMesh.getWorldPosition(_h));
      _u.subVectors(_e, _s);
      _f.subVectors(_h, _e);
      const upper = `upper-arm-${side}` as const;
      const forearmId = `forearm-${side}` as const;
      put(dialKey(d, upper, "raise"), _u.angleTo(_down) * R2D, "°");
      put(dialKey(d, upper, "toward"), Math.atan2(sign * _u.x, _u.z) * R2D, "°");
      put(dialKey(d, upper, "length"), _u.length() * 100, "cm");
      put(dialKey(d, forearmId, "bend"), _u.angleTo(_f) * R2D, "°");
      put(dialKey(d, forearmId, "pitch"), Math.asin(Math.max(-1, Math.min(1, _f.y / Math.max(_f.length(), 1e-9)))) * R2D, "°");
      put(dialKey(d, forearmId, "heading"), Math.atan2(sign * _f.x, _f.z) * R2D, "°");
      put(dialKey(d, forearmId, "length"), _f.length() * 100, "cm");
      _euler.setFromQuaternion(handMesh.quaternion, "YXZ");
      put(dialKey(d, `hand-${side}`, "bend"), _euler.x * R2D, "°");
      put(dialKey(d, `hand-${side}`, "side"), _euler.z * R2D, "°");
      put(dialKey(d, `hand-${side}`, "roll"), _euler.y * R2D, "°");
    }
  });

  const [a, b] = rigs;
  if (a !== undefined && b !== undefined) {
    put(WIDTH_KEY, Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) * 100, "cm");
  }
  return out;
}

const D2R = Math.PI / 180;
const _dir = new THREE.Vector3();

/**
 * Put dial values onto the drawn rigs, beau first — the inverse of `readRigs`. Only the keys
 * present are written; everything else stays as the floor posed it.
 */
export function applyToRigs(rigs: readonly THREE.Object3D[], shapes: readonly CharacterBodyShape[], values: Readonly<Record<DialKey, number>>): void {
  const get = (k: DialKey) => values[k];
  rigs.forEach((rig, d) => {
    const v = (part: PartId, aspect: string) => get(dialKey(d, part, aspect));
    const torso = rig.getObjectByName("torso");
    const shape = shapes[d];
    if (torso !== undefined) {
      const lf = v("torso", "lean-fwd");
      const ls = v("torso", "lean-side");
      const len = v("torso", "length");
      if (lf !== undefined) torso.rotation.x = lf * D2R;
      if (ls !== undefined) torso.rotation.z = ls * D2R;
      if (len !== undefined && shape !== undefined && shape.body.height > 0) torso.scale.y = len / 100 / shape.body.height;
    }
    const facing = v("torso", "facing");
    const x = v("torso", "x");
    const z = v("torso", "z");
    if (facing !== undefined) rig.rotation.y = facing * D2R;
    if (x !== undefined) rig.position.x = x / 100;
    if (z !== undefined) rig.position.z = z / 100;

    const head = rig.getObjectByName("head")?.parent;
    if (head != null) {
      const turn = v("head", "turn");
      const nod = v("head", "nod");
      const tilt = v("head", "tilt");
      if (turn !== undefined) head.rotation.y = turn * D2R;
      if (nod !== undefined) head.rotation.x = nod * D2R;
      if (tilt !== undefined) head.rotation.z = tilt * D2R;
    }

    for (const side of ["left", "right"] as const) {
      const sign = side === "left" ? 1 : -1;
      const fore = rig.getObjectByName(`forearm-${side}`);
      const handMesh = rig.getObjectByName(`hand-${side}`);
      const arm = fore?.parent;
      if (fore === undefined || handMesh === undefined || arm == null) continue;
      const upper = `upper-arm-${side}` as const;
      const forearmId = `forearm-${side}` as const;

      // Upper arm: the elbow's place out of the shoulder (the shoulder group isn't rotated).
      const raise = v(upper, "raise");
      const toward = v(upper, "toward");
      const ulen = v(upper, "length");
      if (raise !== undefined || toward !== undefined || ulen !== undefined) {
        const cur = arm.position;
        const len = ulen !== undefined ? ulen / 100 : cur.length();
        const r = (raise ?? cur.clone().angleTo(_down) / D2R) * D2R;
        const tw = (toward ?? Math.atan2(sign * cur.x, cur.z) / D2R) * D2R;
        const h = Math.sin(r);
        arm.position.set(sign * h * Math.sin(tw) * len, -Math.cos(r) * len, h * Math.cos(tw) * len);
      }

      // Forearm: where it points, in the rig's frame — the elbow group's own rotation.
      const pitch = v(forearmId, "pitch");
      const heading = v(forearmId, "heading");
      if (pitch !== undefined || heading !== undefined) {
        _dir.set(0, -1, 0).applyQuaternion(arm.quaternion);
        const p = (pitch ?? Math.asin(Math.max(-1, Math.min(1, _dir.y))) / D2R) * D2R;
        const hd = (heading ?? Math.atan2(sign * _dir.x, _dir.z) / D2R) * D2R;
        _dir.set(sign * Math.cos(p) * Math.sin(hd), Math.sin(p), Math.cos(p) * Math.cos(hd));
        arm.quaternion.setFromUnitVectors(_down, _dir);
        // The hand goes on the forearm's axis, at the reach the floor gave it. The floor's own
        // solve can leave it beside the axis (ADR-0054), and keeping that offset under a dialled
        // direction draws the hand 10–20° off where the dial (and `readRigs`) say it is.
        const reach = handMesh.position.length();
        handMesh.position.set(0, -reach, 0);
      }
      const flen = v(forearmId, "length");
      if (flen !== undefined) {
        const now = handMesh.position.length();
        if (now > 1e-6) {
          const k = flen / 100 / now;
          handMesh.position.multiplyScalar(k);
          fore.scale.y *= k;
          fore.position.y *= k;
        }
      }

      const bend = v(`hand-${side}`, "bend");
      const sideA = v(`hand-${side}`, "side");
      const roll = v(`hand-${side}`, "roll");
      if (bend !== undefined || sideA !== undefined || roll !== undefined) {
        _euler.setFromQuaternion(handMesh.quaternion, "YXZ");
        _euler.set((bend ?? _euler.x / D2R) * D2R, (roll ?? _euler.y / D2R) * D2R, (sideA ?? _euler.z / D2R) * D2R, "YXZ");
        handMesh.quaternion.setFromEuler(_euler);
      }
    }
  });

  // The couple's width last: both dancers move apart along the line between them, about its middle.
  const w = get(WIDTH_KEY);
  const [a, b] = rigs;
  if (w !== undefined && a !== undefined && b !== undefined) {
    const mx = (a.position.x + b.position.x) / 2;
    const mz = (a.position.z + b.position.z) / 2;
    let dx = b.position.x - a.position.x;
    let dz = b.position.z - a.position.z;
    const n = Math.hypot(dx, dz);
    if (n > 1e-6) {
      dx /= n;
      dz /= n;
      const half = w / 200;
      a.position.set(mx - dx * half, a.position.y, mz - dz * half);
      b.position.set(mx + dx * half, b.position.y, mz + dz * half);
    }
  }
}


/** Whether a dial key is an angle, so it's eased the short way round. */
function isAngle(k: DialKey): boolean {
  if (k === WIDTH_KEY) return false;
  const [, part, aspect] = k.split(".");
  if (part === undefined || !isPartId(part)) return false;
  return PARTS[part].aspects.find((a) => a.id === aspect)?.unit === "°";
}

/** Ease in and out: slow leaving a keyframe, slow arriving at the next. */
export const ease = (u: number) => u * u * (3 - 2 * u);

/** How much of the move a couple spends blending from the solver into its keyframes, and back out. */
export const EDGE_BLEND = 0.1;

/** `a` toward `b` by `u`, each value; angles the short way round. A key missing from one side keeps the other's. */
export function mixPoses(a: Readonly<Record<DialKey, number>>, b: Readonly<Record<DialKey, number>>, u: number): Record<DialKey, number> {
  const out: Record<DialKey, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k];
    const vb = b[k];
    if (va === undefined || vb === undefined) {
      const only = va ?? vb;
      if (only !== undefined) out[k] = only;
      continue;
    }
    if (isAngle(k)) {
      const d = ((((vb - va + 180) % 360) + 360) % 360) - 180;
      out[k] = va + d * u;
    } else out[k] = va + (vb - va) * u;
  }
  return out;
}

/**
 * A couple's pose at moment `t` from its keyframes.
 *
 * - **Between two keyframes**, each value eases in and out from one to the next (`ease`), angles
 *   the short way round.
 * - **Into the first and out of the last**, given the solver's pose underneath (`solver`), it
 *   blends from the solver over the `EDGE_BLEND` of the move before the first keyframe, and back
 *   over the same after the last, so the keyframes neither pop in nor out.
 * - **Further out**, or with no solver pose to blend from, `undefined`: the solver plays.
 */
export function sampleTrack(
  frames: readonly Keyframe[],
  t: number,
  solver?: Readonly<Record<DialKey, number>>,
): Record<DialKey, number> | undefined {
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (first === undefined || last === undefined) return undefined;
  if (t < first.t - 1e-6) {
    const w = (t - (first.t - EDGE_BLEND)) / EDGE_BLEND;
    if (solver === undefined || w <= 0) return undefined;
    return mixPoses(solver, first.values, ease(Math.min(1, w)));
  }
  if (t > last.t + 1e-6) {
    const w = 1 - (t - last.t) / EDGE_BLEND;
    if (solver === undefined || w <= 0) return undefined;
    return mixPoses(solver, last.values, ease(Math.min(1, w)));
  }
  let i = 0;
  while (i < frames.length - 1 && nth(frames, i + 1).t <= t) i++;
  const a = nth(frames, i);
  const b = nth(frames, Math.min(i + 1, frames.length - 1));
  const span = b.t - a.t;
  const u = span <= 1e-9 ? 0 : Math.min(1, Math.max(0, (t - a.t) / span));
  return mixPoses(a.values, b.values, ease(u));
}

