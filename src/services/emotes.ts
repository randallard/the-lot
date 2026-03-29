import type { ArmPose } from "./arm-actions";
import { ZERO_POSE } from "./arm-actions";
import type { EyeShape } from "./eye-shapes";
import type { CharacterBodyShape } from "./body-shapes";

// ---------------------------------------------------------------------------
// Shared primitives

export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export const EASINGS: Easing[] = ["linear", "ease-in", "ease-out", "ease-in-out"];

// ---------------------------------------------------------------------------
// Per-track keyframe types
// All use absolute `time` (seconds from emote start).

export interface BodyKeyframe {
  id: string;
  time: number;
  deltaY: number;       // vertical offset (+ = up, for jumps)
  deltaRotY: number;    // horizontal spin in degrees
  leanX: number;        // forward/back tilt delta in degrees
  leanZ: number;        // side tilt delta in degrees
  radiusDelta: number;  // expand/contract (e.g. inhale +0.05)
  heightDelta: number;  // stretch/compress
  easing: Easing;
}

export interface HeadKeyframe {
  id: string;
  time: number;
  deltaRotation: [number, number, number];  // added on top of shape.head.rotation
  offsetX: number;      // lateral position delta
  offsetY: number;      // vertical position delta (+ = higher)
  offsetZ: number;      // forward/back position delta (+ = forward)
  radiusDelta: number;  // grow/shrink
  easing: Easing;
}

export interface ArmKeyframe {
  id: string;
  time: number;
  pose: ArmPose;
  easing: Easing;
}

export interface EyeKeyframe {
  id: string;
  time: number;
  override: Partial<EyeShape>;  // sparse — only set fields are animated
  easing: Easing;
}

export type EffectType =
  | "lightbulb" | "cloud" | "stars" | "hearts"
  | "notes"     | "sweat" | "anger" | "sparkles"
  | "zzz"       | "question"       | "exclamation";

export const EFFECT_TYPES: EffectType[] = [
  "lightbulb", "cloud", "stars", "hearts",
  "notes", "sweat", "anger", "sparkles",
  "zzz", "question", "exclamation",
];

export interface EffectKeyframe {
  id: string;
  time: number;       // when the effect appears
  type: EffectType;
  duration: number;   // how long it stays visible
  offsetY: number;    // Y above the character's head
}

// ---------------------------------------------------------------------------
// Tracks container

export interface EmoteTracks {
  body:     BodyKeyframe[];
  head:     HeadKeyframe[];
  rightArm: ArmKeyframe[];
  leftArm:  ArmKeyframe[];
  eyes:     EyeKeyframe[];
  effects:  EffectKeyframe[];
}

export type TrackName = keyof EmoteTracks;
export const TRACK_NAMES: TrackName[] = ["body", "head", "rightArm", "leftArm", "eyes", "effects"];
export const TRACK_LABELS: Record<TrackName, string> = {
  body: "body", head: "head", rightArm: "R arm", leftArm: "L arm", eyes: "eyes", effects: "effects",
};

// ---------------------------------------------------------------------------
// Emote

export interface Emote {
  id: string;
  name: string;
  tracks: EmoteTracks;
  duration: number;     // total length in seconds
  loop: boolean;
  loopCount?: number;   // undefined = infinite when loop=true
  tags: string[];       // for semantic lookup ("happy", "sad", ...)
}

// ---------------------------------------------------------------------------
// Resolved pose — what the animation controller outputs each frame

export interface ActiveEffect {
  id: string;
  type: EffectType;
  startedAt: number;    // emote-clock time when this effect started
  duration: number;
  offsetY: number;
}

export interface ResolvedPose {
  // Body
  bodyDeltaY:       number;
  bodyDeltaRotY:    number;
  bodyLeanX:        number;
  bodyLeanZ:        number;
  bodyRadiusDelta:  number;
  bodyHeightDelta:  number;
  // Head
  headDeltaRotation: [number, number, number];
  headOffsetX:      number;
  headOffsetY:      number;
  headOffsetZ:      number;
  headRadiusDelta:  number;
  // Arms / eyes / effects
  rightArm:         ArmPose;
  leftArm:          ArmPose;
  eyeOverride:      Partial<EyeShape>;
  activeEffects:    ActiveEffect[];
}

export const NEUTRAL_POSE: ResolvedPose = {
  bodyDeltaY: 0, bodyDeltaRotY: 0,
  bodyLeanX: 0, bodyLeanZ: 0,
  bodyRadiusDelta: 0, bodyHeightDelta: 0,
  headDeltaRotation: [0, 0, 0],
  headOffsetX: 0, headOffsetY: 0, headOffsetZ: 0,
  headRadiusDelta: 0,
  rightArm: { ...ZERO_POSE },
  leftArm:  { ...ZERO_POSE },
  eyeOverride: {},
  activeEffects: [],
};

// ---------------------------------------------------------------------------
// Stack depth limit

export const MAX_STACK_DEPTH = 10;

// ---------------------------------------------------------------------------
// Factory functions

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((b, i) =>
    ([4,6,8,10].includes(i) ? "-" : "") + b.toString(16).padStart(2, "0")
  ).join("");
}

export function makeEmptyTracks(): EmoteTracks {
  return { body: [], head: [], rightArm: [], leftArm: [], eyes: [], effects: [] };
}

export function makeEmote(name = "new emote"): Emote {
  return {
    id: uuid(),
    name,
    tracks: makeEmptyTracks(),
    duration: 2,
    loop: false,
    tags: [],
  };
}

export function makeBodyKf(time: number): BodyKeyframe {
  return { id: uuid(), time, deltaY: 0, deltaRotY: 0, leanX: 0, leanZ: 0, radiusDelta: 0, heightDelta: 0, easing: "ease-in-out" };
}
export function makeHeadKf(time: number): HeadKeyframe {
  return { id: uuid(), time, deltaRotation: [0, 0, 0], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0, easing: "ease-in-out" };
}
export function makeArmKf(time: number): ArmKeyframe {
  return { id: uuid(), time, pose: { ...ZERO_POSE }, easing: "ease-in-out" };
}
export function makeEyeKf(time: number): EyeKeyframe {
  return { id: uuid(), time, override: {}, easing: "linear" };
}
export function makeEffectKf(time: number): EffectKeyframe {
  return { id: uuid(), time, type: "lightbulb", duration: 1.5, offsetY: 0.3 };
}

// ---------------------------------------------------------------------------
// Easing

function applyEasing(t: number, easing: Easing): number {
  const c = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "ease-in":     return c * c;
    case "ease-out":    return 1 - (1 - c) * (1 - c);
    case "ease-in-out": return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
    default:            return c;
  }
}

// ---------------------------------------------------------------------------
// Interpolation helpers

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpV3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerpArmPose(a: ArmPose, b: ArmPose, t: number): ArmPose {
  return {
    upperArmRotation: lerpV3(a.upperArmRotation, b.upperArmRotation, t),
    forearmRotation:  lerpV3(a.forearmRotation,  b.forearmRotation,  t),
    handRotation:     lerpV3(a.handRotation,     b.handRotation,     t),
  };
}

function lerpEyeOverride(
  a: Partial<EyeShape>,
  b: Partial<EyeShape>,
  t: number,
): Partial<EyeShape> {
  const result: Partial<EyeShape> = { ...a };
  for (const key of Object.keys(b) as (keyof EyeShape)[]) {
    const bv = b[key];
    const av = a[key];
    if (typeof bv === "number" && typeof av === "number") {
      (result as Record<string, unknown>)[key] = lerpNum(av, bv, t);
    } else if (bv !== undefined) {
      (result as Record<string, unknown>)[key] = bv;
    }
  }
  return result;
}

// Generic sorted-track sampler.
// Automatically bookends with neutral at t=0 and t=duration so a single
// keyframe produces: rest → pose → rest.
function sampleTrack<T>(
  kfs: T[],
  getTime: (k: T) => number,
  getEasing: (k: T) => Easing,
  lerp: (a: T, b: T, t: number) => T,
  neutral: () => T,
  time: number,
  duration: number,
): T {
  if (kfs.length === 0) return neutral();
  const sorted = [...kfs].sort((a, b) => getTime(a) - getTime(b));
  const firstTime = getTime(sorted[0]);
  const lastTime  = getTime(sorted[sorted.length - 1]);

  // Before first keyframe: neutral → first
  if (time <= 0) return neutral();
  if (time < firstTime) {
    const raw = firstTime > 0 ? time / firstTime : 1;
    return lerp(neutral(), sorted[0], applyEasing(raw, getEasing(sorted[0])));
  }

  // After last keyframe: last → neutral
  if (time >= duration) return neutral();
  if (time > lastTime) {
    const span = duration - lastTime;
    const raw = span > 0 ? (time - lastTime) / span : 1;
    return lerp(sorted[sorted.length - 1], neutral(), applyEasing(raw, "ease-in-out"));
  }

  // Between keyframes
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= getTime(a) && time <= getTime(b)) {
      const span = getTime(b) - getTime(a);
      const raw = span > 0 ? (time - getTime(a)) / span : 1;
      return lerp(a, b, applyEasing(raw, getEasing(b)));
    }
  }
  return { ...sorted[sorted.length - 1] };
}

// ---------------------------------------------------------------------------
// Per-track samplers

type BodySample = { deltaY: number; deltaRotY: number; leanX: number; leanZ: number; radiusDelta: number; heightDelta: number };
const BODY_NEUTRAL = (): BodyKeyframe => ({ id: "", time: 0, deltaY: 0, deltaRotY: 0, leanX: 0, leanZ: 0, radiusDelta: 0, heightDelta: 0, easing: "linear" as Easing });

export function sampleBodyTrack(kfs: BodyKeyframe[], time: number, duration: number): BodySample {
  const zero: BodySample = { deltaY: 0, deltaRotY: 0, leanX: 0, leanZ: 0, radiusDelta: 0, heightDelta: 0 };
  if (kfs.length === 0) return zero;
  const result = sampleTrack(
    kfs, k => k.time, k => k.easing,
    (a, b, t) => ({ ...b,
      deltaY:      lerpNum(a.deltaY,      b.deltaY,      t),
      deltaRotY:   lerpNum(a.deltaRotY,   b.deltaRotY,   t),
      leanX:       lerpNum(a.leanX,       b.leanX,       t),
      leanZ:       lerpNum(a.leanZ,       b.leanZ,       t),
      radiusDelta: lerpNum(a.radiusDelta, b.radiusDelta, t),
      heightDelta: lerpNum(a.heightDelta, b.heightDelta, t),
    }),
    BODY_NEUTRAL, time, duration,
  );
  return { deltaY: result.deltaY, deltaRotY: result.deltaRotY, leanX: result.leanX, leanZ: result.leanZ, radiusDelta: result.radiusDelta, heightDelta: result.heightDelta };
}

type HeadSample = { rotation: [number,number,number]; offsetX: number; offsetY: number; offsetZ: number; radiusDelta: number };
const HEAD_NEUTRAL = (): HeadKeyframe => ({ id: "", time: 0, deltaRotation: [0,0,0] as [number,number,number], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0, easing: "linear" as Easing });

export function sampleHeadTrack(kfs: HeadKeyframe[], time: number, duration: number): HeadSample {
  const zero: HeadSample = { rotation: [0,0,0], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0 };
  if (kfs.length === 0) return zero;
  const result = sampleTrack(
    kfs, k => k.time, k => k.easing,
    (a, b, t) => ({ ...b,
      deltaRotation: lerpV3(a.deltaRotation, b.deltaRotation, t),
      offsetX:       lerpNum(a.offsetX,      b.offsetX,      t),
      offsetY:       lerpNum(a.offsetY,      b.offsetY,      t),
      offsetZ:       lerpNum(a.offsetZ,      b.offsetZ,      t),
      radiusDelta:   lerpNum(a.radiusDelta,  b.radiusDelta,  t),
    }),
    HEAD_NEUTRAL, time, duration,
  );
  return { rotation: result.deltaRotation, offsetX: result.offsetX, offsetY: result.offsetY, offsetZ: result.offsetZ, radiusDelta: result.radiusDelta };
}

export function sampleArmTrack(kfs: ArmKeyframe[], time: number, duration: number): ArmPose {
  if (kfs.length === 0) return { ...ZERO_POSE };
  const result = sampleTrack(
    kfs,
    k => k.time,
    k => k.easing,
    (a, b, t) => ({ ...b, pose: lerpArmPose(a.pose, b.pose, t) }),
    () => ({ id: "", time: 0, pose: { ...ZERO_POSE }, easing: "linear" as Easing }),
    time,
    duration,
  );
  return result.pose;
}

export function sampleEyeTrack(kfs: EyeKeyframe[], time: number, duration: number): Partial<EyeShape> {
  if (kfs.length === 0) return {};
  const result = sampleTrack(
    kfs,
    k => k.time,
    k => k.easing,
    (a, b, t) => ({ ...b, override: lerpEyeOverride(a.override, b.override, t) }),
    () => ({ id: "", time: 0, override: {}, easing: "linear" as Easing }),
    time,
    duration,
  );
  return result.override;
}

export function sampleEffects(kfs: EffectKeyframe[], time: number): ActiveEffect[] {
  return kfs
    .filter(kf => time >= kf.time && time < kf.time + kf.duration)
    .map(kf => ({ id: kf.id, type: kf.type, startedAt: kf.time, duration: kf.duration, offsetY: kf.offsetY }));
}

export function sampleEmote(emote: Emote, time: number): ResolvedPose {
  const t = emote.tracks;
  const d = emote.duration;
  const body = sampleBodyTrack(t.body, time, d);
  const head = sampleHeadTrack(t.head, time, d);
  return {
    bodyDeltaY:        body.deltaY,
    bodyDeltaRotY:     body.deltaRotY,
    bodyLeanX:         body.leanX,
    bodyLeanZ:         body.leanZ,
    bodyRadiusDelta:   body.radiusDelta,
    bodyHeightDelta:   body.heightDelta,
    headDeltaRotation: head.rotation,
    headOffsetX:       head.offsetX,
    headOffsetY:       head.offsetY,
    headOffsetZ:       head.offsetZ,
    headRadiusDelta:   head.radiusDelta,
    rightArm:          sampleArmTrack(t.rightArm, time, d),
    leftArm:           sampleArmTrack(t.leftArm,  time, d),
    eyeOverride:       sampleEyeTrack(t.eyes,     time, d),
    activeEffects:     sampleEffects(t.effects, time),
  };
}

export function lerpResolvedPose(a: ResolvedPose, b: ResolvedPose, t: number): ResolvedPose {
  return {
    bodyDeltaY:        lerpNum(a.bodyDeltaY,       b.bodyDeltaY,       t),
    bodyDeltaRotY:     lerpNum(a.bodyDeltaRotY,    b.bodyDeltaRotY,    t),
    bodyLeanX:         lerpNum(a.bodyLeanX,        b.bodyLeanX,        t),
    bodyLeanZ:         lerpNum(a.bodyLeanZ,        b.bodyLeanZ,        t),
    bodyRadiusDelta:   lerpNum(a.bodyRadiusDelta,  b.bodyRadiusDelta,  t),
    bodyHeightDelta:   lerpNum(a.bodyHeightDelta,  b.bodyHeightDelta,  t),
    headDeltaRotation: lerpV3(a.headDeltaRotation, b.headDeltaRotation, t),
    headOffsetX:       lerpNum(a.headOffsetX,      b.headOffsetX,      t),
    headOffsetY:       lerpNum(a.headOffsetY,      b.headOffsetY,      t),
    headOffsetZ:       lerpNum(a.headOffsetZ,      b.headOffsetZ,      t),
    headRadiusDelta:   lerpNum(a.headRadiusDelta,  b.headRadiusDelta,  t),
    rightArm:          lerpArmPose(a.rightArm,     b.rightArm,         t),
    leftArm:           lerpArmPose(a.leftArm,      b.leftArm,          t),
    eyeOverride:       lerpEyeOverride(a.eyeOverride, b.eyeOverride,   t),
    activeEffects:     b.activeEffects,
  };
}

// ---------------------------------------------------------------------------
// Storage

const STORAGE_KEY = "townage-emotes";

function loadAll(): Record<string, Emote[]> {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}

function saveAll(all: Record<string, Emote[]>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch {}
}

export function getEmotes(characterId: string): Emote[] {
  return loadAll()[characterId] ?? [];
}

export function saveEmote(characterId: string, emote: Emote): void {
  const all = loadAll();
  const list = all[characterId] ?? [];
  const idx = list.findIndex(e => e.id === emote.id);
  if (idx >= 0) list[idx] = emote; else list.push(emote);
  all[characterId] = list;
  saveAll(all);
}

export function deleteEmote(characterId: string, emoteId: string): void {
  const all = loadAll();
  all[characterId] = (all[characterId] ?? []).filter(e => e.id !== emoteId);
  saveAll(all);
}

/** Deep-copy an emote to another character's library. Returns the copy. */
export function copyEmoteTo(emote: Emote, targetCharacterId: string): Emote {
  const copy: Emote = { ...structuredClone(emote), id: uuid() };
  saveEmote(targetCharacterId, copy);
  return copy;
}

// ---------------------------------------------------------------------------
// Merge a ResolvedPose into a CharacterBodyShape snapshot for rendering.
// Used by both CharacterPreview and the live Player/Npc components.

export function mergeAnimation(shape: CharacterBodyShape, rp: ResolvedPose): CharacterBodyShape {
  return {
    ...shape,
    head: {
      ...shape.head,
      rotation: [
        shape.head.rotation[0] + rp.headDeltaRotation[0],
        shape.head.rotation[1] + rp.headDeltaRotation[1],
        shape.head.rotation[2] + rp.headDeltaRotation[2],
      ] as [number, number, number],
      offsetX: shape.head.offsetX + rp.headOffsetX,
      offsetY: shape.head.offsetY + rp.headOffsetY,
      offsetZ: shape.head.offsetZ + rp.headOffsetZ,
      radius:  shape.head.radius  + rp.headRadiusDelta,
    },
    body: {
      ...shape.body,
      leanX:  shape.body.leanX  + rp.bodyLeanX,
      leanZ:  shape.body.leanZ  + rp.bodyLeanZ,
      radius: shape.body.radius + rp.bodyRadiusDelta,
      height: shape.body.height + rp.bodyHeightDelta,
    },
  };
}
