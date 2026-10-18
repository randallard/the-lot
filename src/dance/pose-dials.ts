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
 */

import * as THREE from "three";
import type { CharacterBodyShape } from "../services/body-shapes";
import type { DialKey } from "./pose-events";

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
      deg("bend", "elbow bend (0 straight)", 0, 180),
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
