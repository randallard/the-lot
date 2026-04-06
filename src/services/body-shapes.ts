/**
 * Body shape configuration for player and NPCs.
 * Stores per-part geometry args and positional layout params.
 */

import {
  type CharacterEyes,
  PLAYER_EYE_DEFAULTS,
  NPC_EYE_DEFAULTS,
  migrateEyes,
  complementaryColor,
} from "./eye-shapes";
import { getNpcById } from "../config/npcs";

export type { CharacterEyes };

const STORAGE_KEY = "townage-body-shapes";

export interface HeadShape {
  radius: number;
  widthSegments: number;
  heightSegments: number;
  /** Euler rotation in degrees [x, y, z] */
  rotation: [number, number, number];
  /** Position offset from computed placement (world units). 0 = default. */
  offsetX: number;
  /** offsetY > 0 = higher, < 0 = lower */
  offsetY: number;
  /** offsetZ > 0 = forward (toward camera), < 0 = back */
  offsetZ: number;
}

export interface BodyShape {
  radius: number;
  height: number;
  capSegments: number;
  radialSegments: number;
  /** Body tilt in degrees. leanX: + = lean back, - = lean forward */
  leanX: number;
  /** Body tilt in degrees. leanZ: + = lean right, - = lean left */
  leanZ: number;
}

export interface ForearmShape {
  /** Top/elbow end radius (wider) */
  topRadius: number;
  /** Bottom/wrist end radius (narrower) */
  bottomRadius: number;
  height: number;
  radialSegments: number;
}

/**
 * One hand pose — full geometry description plus rotation.
 * Rotation is in degrees [x, y, z]. The left hand auto-mirrors Y and Z.
 */
export interface HandPose {
  radius: number;
  /** Z scale — 1.0 = sphere, 0.1 = very thin disc (flat of hand faces forward, parallel to body) */
  flattenZ: number;
  widthSegments: number;
  heightSegments: number;
  /** Euler rotation in degrees [x, y, z] — pivot is at the palm base (top of hand).
   *  x = flapper fwd/back, y = wrist-to-fingertip twist, z = lateral flapper.
   *  Right hand uses these directly.
   *  Left hand mirrors: [x, -y, -z] for natural symmetry. */
  rotation: [number, number, number];
  /** Gap between wrist (forearm bottom) and palm base. Negative = overlap */
  handForearmGap: number;
}

export interface HandShape {
  /** Natural resting state — what is rendered by default */
  open: HandPose;
  /** Fist / closed state — stored for future animation; not rendered yet */
  closed: HandPose;
}

export interface BodyLayout {
  /** How far left/right the forearms are from body center */
  forearmXOffset: number;
  /** Distance from body top down to the forearm elbow. 0 = flush with top, positive = hangs down */
  upperArmSpacing: number;
  /** Gap between head bottom and body top. Negative = overlap (natural look) */
  headBodyGap: number;
}

export interface CharacterBodyShape {
  head: HeadShape;
  body: BodyShape;
  forearm: ForearmShape;
  hand: HandShape;
  layout: BodyLayout;
  eyes: CharacterEyes;
  bodyColor: string;
}

/** Y of body capsule center within character group (local space) */
export const PLAYER_BODY_CENTER_Y = 0;
export const NPC_BODY_CENTER_Y = 0.5;

const PLAYER_HAND_OPEN: HandPose = {
  radius: 0.09, flattenZ: 0.15, widthSegments: 10, heightSegments: 8,
  rotation: [3, -32, -17], handForearmGap: 0.005,
};
const PLAYER_HAND_CLOSED: HandPose = {
  radius: 0.07, flattenZ: 1, widthSegments: 12, heightSegments: 8,
  rotation: [3, 13, -3], handForearmGap: 0.025,
};
const NPC_HAND_OPEN: HandPose = {
  radius: 0.11, flattenZ: 0.15, widthSegments: 10, heightSegments: 8,
  rotation: [0, 0, 0], handForearmGap: 0.01,
};
const NPC_HAND_CLOSED: HandPose = {
  radius: 0.09, flattenZ: 0.28, widthSegments: 8, heightSegments: 6,
  rotation: [0, 0, 35], handForearmGap: 0.01,
};

export const PLAYER_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.28, widthSegments: 32, heightSegments: 24, rotation: [-180, -91, -93], offsetX: 0, offsetY: 0, offsetZ: 0 },
  body: { radius: 0.15, height: 0.52, capSegments: 2, radialSegments: 8, leanX: 0, leanZ: 0 },
  forearm: { topRadius: 0.065, bottomRadius: 0.035, height: 0.23, radialSegments: 8 },
  hand: { open: PLAYER_HAND_OPEN, closed: PLAYER_HAND_CLOSED },
  layout: { forearmXOffset: 0.25, upperArmSpacing: 0.22, headBodyGap: -0.02 },
  eyes: {
    ...PLAYER_EYE_DEFAULTS,
    positioning: { fromTopOfHead: 0.4, separation: 0.16 },
    clipOverlap: true,
    right: { width: 0.28, height: 0.18, cornerTL: 0, cornerTR: 0, cornerBL: 0, cornerBR: 0, arcTop: -0.06, arcBottom: -0.06, arcLeft: 0.06, arcRight: 0.06, irisColor: "#554bdd", irisSize: 0.75, irisOffsetY: 0, showWhite: true, rotation: 0 },
    left:  { width: 0.28, height: 0.18, cornerTL: 0, cornerTR: 0, cornerBL: 0, cornerBR: 0, arcTop: -0.06, arcBottom: -0.06, arcLeft: 0.06, arcRight: 0.06, irisColor: "#554bdd", irisSize: 0.75, irisOffsetY: 0, showWhite: true, rotation: 0 },
  },
  bodyColor: "#3f808d",
};

export const NPC_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.3, widthSegments: 12, heightSegments: 12, rotation: [0, 0, 0], offsetX: 0, offsetY: 0, offsetZ: 0 },
  body: { radius: 0.3, height: 0.3, capSegments: 8, radialSegments: 16, leanX: 0, leanZ: 0 },
  forearm: { topRadius: 0.058, bottomRadius: 0.045, height: 0.24, radialSegments: 10 },
  hand: { open: NPC_HAND_OPEN, closed: NPC_HAND_CLOSED },
  layout: { forearmXOffset: 0.46, upperArmSpacing: 0.33, headBodyGap: -0.20 },
  eyes: NPC_EYE_DEFAULTS,
  bodyColor: "#5a5a6e",
};

export const MYCO_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.49, widthSegments: 32, heightSegments: 24, rotation: [-77, 0, -93], offsetX: 0, offsetY: 0, offsetZ: 0 },
  body: { radius: 0.3, height: 0.3, capSegments: 8, radialSegments: 16, leanX: 0, leanZ: 0 },
  forearm: { topRadius: 0.058, bottomRadius: 0.045, height: 0.24, radialSegments: 10 },
  hand: {
    open:   { radius: 0.11, flattenZ: 0.23, widthSegments: 10, heightSegments: 8, rotation: [0, 0, 0], handForearmGap: 0.01 },
    closed: { ...NPC_HAND_CLOSED },
  },
  layout: { forearmXOffset: 0.46, upperArmSpacing: 0.33, headBodyGap: -0.4 },
  eyes: {
    ...NPC_EYE_DEFAULTS,
    positioning: { fromTopOfHead: 0.36, separation: 0.2 },
    right: { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#e4a1df", irisSize: 0.75, irisOffsetY: 0, showWhite: false, rotation: 0 },
    left:  { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#e4a1df", irisSize: 0.75, irisOffsetY: 0, showWhite: false, rotation: 0 },
  },
  bodyColor: "#1B5E20",
};

export const EMBER_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.44, widthSegments: 3, heightSegments: 3, rotation: [-180, 78, 113], offsetX: 0, offsetY: 0.05, offsetZ: 0.28 },
  body: { radius: 0.22, height: 1.41, capSegments: 2, radialSegments: 4, leanX: 14, leanZ: 0 },
  forearm: { topRadius: 0.1, bottomRadius: 0.025, height: 0.52, radialSegments: 3 },
  hand: {
    open:   { radius: 0.07, flattenZ: 0.15, widthSegments: 4, heightSegments: 3, rotation: [-23, 45, -14], handForearmGap: 0.015 },
    closed: { ...NPC_HAND_CLOSED },
  },
  layout: { forearmXOffset: 0.36, upperArmSpacing: 0.33, headBodyGap: -0.2 },
  eyes: {
    ...NPC_EYE_DEFAULTS,
    positioning: { fromTopOfHead: 0.36, separation: 0.2 },
    right: { width: 0.16, height: 0.095, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#0fcd00", irisSize: 0.75, irisOffsetY: -0.006, showWhite: false, rotation: 0 },
    left:  { width: 0.16, height: 0.095, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#0fcd00", irisSize: 0.75, irisOffsetY: -0.006, showWhite: false, rotation: 0 },
  },
  bodyColor: "#ff7e55",
};

export const RYAN_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.34, widthSegments: 12, heightSegments: 12, rotation: [0, 0, 4], offsetX: 0, offsetY: 0.16, offsetZ: 0 },
  body: { radius: 0.3, height: 0.3, capSegments: 8, radialSegments: 16, leanX: 0, leanZ: 0 },
  forearm: { topRadius: 0.058, bottomRadius: 0.045, height: 0.24, radialSegments: 10 },
  hand: {
    open:   { radius: 0.11, flattenZ: 0.15, widthSegments: 10, heightSegments: 8, rotation: [0, 0, 0], handForearmGap: 0.01 },
    closed: { ...NPC_HAND_CLOSED },
  },
  layout: { forearmXOffset: 0.46, upperArmSpacing: 0.33, headBodyGap: -0.2 },
  eyes: {
    ...NPC_EYE_DEFAULTS,
    positioning: { fromTopOfHead: 0.36, separation: 0.2 },
    right: { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#605b00", irisSize: 0.6, irisOffsetY: 0, showWhite: true, rotation: 0 },
    left:  { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#605b00", irisSize: 0.6, irisOffsetY: 0, showWhite: true, rotation: 0 },
  },
  bodyColor: "#0300e3",
};

export const SPROUT_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.19, widthSegments: 3, heightSegments: 3, rotation: [0, -1, 0], offsetX: 0, offsetY: 0.24, offsetZ: 0 },
  body: { radius: 0.1, height: 0.3, capSegments: 2, radialSegments: 4, leanX: 0, leanZ: 0 },
  forearm: { topRadius: 0.025, bottomRadius: 0.01, height: 0.14, radialSegments: 3 },
  hand: {
    open:   { radius: 0.05, flattenZ: 0.15, widthSegments: 10, heightSegments: 8, rotation: [0, 0, 0], handForearmGap: 0.01 },
    closed: { ...NPC_HAND_CLOSED },
  },
  layout: { forearmXOffset: 0.2, upperArmSpacing: 0.1, headBodyGap: -0.2 },
  eyes: {
    ...NPC_EYE_DEFAULTS,
    positioning: { fromTopOfHead: 0.36, separation: 0.2 },
    right: { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#3a6ea8", irisSize: 0.75, irisOffsetY: 0, showWhite: false, rotation: 0 },
    left:  { width: 0.13, height: 0.08, cornerTL: 0.5, cornerTR: 0.5, cornerBL: 0.5, cornerBR: 0.5, arcTop: 0, arcBottom: 0, arcLeft: 0, arcRight: 0, irisColor: "#3a6ea8", irisSize: 0.75, irisOffsetY: 0, showWhite: false, rotation: 0 },
  },
  bodyColor: "#15ba00",
};

export const SHAPE_BOUNDS = {
  head: {
    radius:         { min: 0.10, max: 0.60, step: 0.01 },
    widthSegments:  { min: 3,    max: 32,   step: 1 },
    heightSegments: { min: 3,    max: 24,   step: 1 },
    rotation:       { min: -180, max: 180,  step: 1 },
    offsetX:        { min: -0.5, max: 0.5,  step: 0.01 },
    offsetY:        { min: -0.5, max: 0.5,  step: 0.01 },
    offsetZ:        { min: -0.5, max: 0.5,  step: 0.01 },
  },
  body: {
    radius:         { min: 0.10, max: 0.60, step: 0.01 },
    height:         { min: 0.10, max: 2.00, step: 0.01 },
    capSegments:    { min: 2,    max: 16,   step: 1 },
    radialSegments: { min: 4,    max: 32,   step: 1 },
    leanX:          { min: -45,  max: 45,   step: 1 },
    leanZ:          { min: -45,  max: 45,   step: 1 },
  },
  forearm: {
    topRadius:      { min: 0.02, max: 0.15, step: 0.005 },
    bottomRadius:   { min: 0.01, max: 0.12, step: 0.005 },
    height:         { min: 0.05, max: 0.60, step: 0.01 },
    radialSegments: { min: 3,    max: 24,   step: 1 },
  },
  hand: {
    radius:         { min: 0.04, max: 0.25, step: 0.01 },
    flattenZ:       { min: 0.05, max: 1.00, step: 0.01 },
    widthSegments:  { min: 4,    max: 24,   step: 1 },
    heightSegments: { min: 3,    max: 16,   step: 1 },
    rotation:       { min: -180, max: 180,  step: 1 },
    handForearmGap: { min: -0.10, max: 0.20, step: 0.005 },
  },
  layout: {
    forearmXOffset:  { min: 0.20, max: 1.00, step: 0.01 },
    upperArmSpacing: { min: -0.50, max: 1.00, step: 0.01 },
    headBodyGap:     { min: -0.40, max: 0.30, step: 0.01 },
  },
} as const;

export interface ComputedPositions {
  headY: number;
  /** Top of body = shoulder joint height */
  shoulderY: number;
  /** Top of forearm = elbow joint height */
  elbowY: number;
  /** Length of the invisible upper arm (shoulder → elbow) */
  upperArmLength: number;
  /** Forearm cylinder center Y (for legacy flat-mesh world characters) */
  forearmCenterY: number;
  /** Hand mesh center Y (for legacy flat-mesh world characters) */
  handCenterY: number;
  /** Horizontal distance from body center to arm */
  forearmX: number;
}

/**
 * Derive mesh center positions from shape params.
 * bodyCenterY is the Y of the body capsule mesh within the character group.
 */
export function computePositions(
  shape: CharacterBodyShape,
  bodyCenterY: number,
  pose: "open" | "closed" = "open",
): ComputedPositions {
  const { body, head, forearm, hand, layout } = shape;
  const activePose = hand[pose];

  const bodyTop = bodyCenterY + body.height / 2 + body.radius;
  const shoulderY = bodyTop;
  const elbowY = bodyTop - layout.upperArmSpacing;
  const upperArmLength = layout.upperArmSpacing;
  const forearmCenterY = elbowY - forearm.height / 2;
  const forearmWristY = forearmCenterY - forearm.height / 2;
  // Y is unscaled (flat is in Z); hand center is one full radius below the palm base
  const handHalfHeight = activePose.radius;
  const handCenterY = forearmWristY - activePose.handForearmGap - handHalfHeight;
  const headCenterY = bodyTop + layout.headBodyGap + head.radius;

  return {
    headY: headCenterY,
    shoulderY,
    elbowY,
    upperArmLength,
    forearmCenterY,
    handCenterY,
    forearmX: layout.forearmXOffset,
  };
}

/** Convert degrees to radians. */
export function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Euler rotation [x, y, z] in radians for each hand.
 * Left hand mirrors Y and Z for natural symmetry.
 */
export function handRotations(pose: HandPose): {
  left: [number, number, number];
  right: [number, number, number];
} {
  const [rx, ry, rz] = pose.rotation;
  return {
    right: [deg2rad(rx), deg2rad(ry), deg2rad(rz)],
    left:  [deg2rad(rx), deg2rad(-ry), deg2rad(-rz)],
  };
}

// ---------------------------------------------------------------------------
// Storage

function load(): Record<string, unknown> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function save(shapes: Record<string, CharacterBodyShape>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
  } catch {}
}

function defaultsForId(id: string): CharacterBodyShape {
  if (id === "player") return PLAYER_DEFAULTS;
  if (id === "myco")   return MYCO_DEFAULTS;
  if (id === "ember")  return EMBER_DEFAULTS;
  if (id === "ryan")   return RYAN_DEFAULTS;
  if (id === "sprout") return SPROUT_DEFAULTS;
  return NPC_DEFAULTS;
}

/** Migrate and fill defaults for any missing fields (handles schema evolution). */
function migrate(raw: unknown, id: string): CharacterBodyShape {
  const defaults = defaultsForId(id);
  if (!raw || typeof raw !== "object") return JSON.parse(JSON.stringify(defaults));

  const r = raw as Record<string, unknown>;

  // Migrate old flat HandShape → new { open, closed } format
  const rawHand = r.hand as Record<string, unknown> | undefined;
  let hand: HandShape;
  if (!rawHand || !rawHand.open) {
    // Legacy: migrate flat fields into open pose
    const legacyOpen: HandPose = {
      radius:         (rawHand?.radius as number)         ?? defaults.hand.open.radius,
      flattenZ:       (rawHand?.flattenZ as number) ?? (rawHand?.flattenY as number) ?? defaults.hand.open.flattenZ,
      widthSegments:  (rawHand?.widthSegments as number)  ?? defaults.hand.open.widthSegments,
      heightSegments: (rawHand?.heightSegments as number) ?? defaults.hand.open.heightSegments,
      rotation:       [0, 0, 0],
      handForearmGap: defaults.hand.open.handForearmGap,
    };
    hand = { open: legacyOpen, closed: JSON.parse(JSON.stringify(defaults.hand.closed)) };
  } else {
    const openRaw  = rawHand.open   as Record<string, unknown>;
    const closedRaw = (rawHand.closed as Record<string, unknown> | undefined) ?? {};
    hand = {
      open: {
        ...defaults.hand.open,
        ...(openRaw as Partial<HandPose>),
        // Migrate flattenY → flattenZ
        flattenZ: (openRaw.flattenZ as number | undefined) ?? (openRaw.flattenY as number | undefined) ?? defaults.hand.open.flattenZ,
      },
      closed: {
        ...defaults.hand.closed,
        ...(closedRaw as Partial<HandPose>),
        flattenZ: (closedRaw.flattenZ as number | undefined) ?? (closedRaw.flattenY as number | undefined) ?? defaults.hand.closed.flattenZ,
      },
    };
    // Ensure rotation array exists in both poses
    if (!hand.open.rotation)   hand.open.rotation   = [0, 0, 0];
    if (!hand.closed.rotation) hand.closed.rotation = [0, 0, 0];
    // Migrate handForearmGap from old layout location if missing from poses
    const rawLayout = r.layout as Record<string, unknown> | undefined;
    const legacyGap = rawLayout?.handForearmGap as number | undefined;
    if (hand.open.handForearmGap   == null) hand.open.handForearmGap   = legacyGap ?? defaults.hand.open.handForearmGap;
    if (hand.closed.handForearmGap == null) hand.closed.handForearmGap = legacyGap ?? defaults.hand.closed.handForearmGap;
  }

  // Migrate elbowYFromBodyCenter → upperArmSpacing
  const rawLayout = r.layout as Record<string, unknown> | undefined;
  const mergedLayout = { ...defaults.layout, ...(rawLayout as Partial<BodyLayout> ?? {}) };
  if (mergedLayout.upperArmSpacing == null && rawLayout?.elbowYFromBodyCenter != null) {
    // Can't recover exact bodyTop without body params here, so use default
    mergedLayout.upperArmSpacing = defaults.layout.upperArmSpacing;
  }

  // Body color: saved value → NPC config color → default
  // "#5a5a6e" is the old generic NPC_DEFAULTS.bodyColor that got written for all NPCs
  // before per-NPC config colors were respected — treat it as "not set" so we upgrade.
  const OLD_GENERIC_NPC_COLOR = "#5a5a6e";
  const savedColor = typeof r.bodyColor === "string" ? r.bodyColor : null;
  const npcConfigColor = getNpcById(id)?.appearance.bodyColor;
  const bodyColor = (savedColor && savedColor !== OLD_GENERIC_NPC_COLOR)
    ? savedColor
    : (npcConfigColor ?? defaults.bodyColor);

  // Default iris: player = black, ryan = blue, others = RGB complement of body color
  const isPlayer = id === "player";
  const defaultIrisColor = isPlayer
    ? "#000000"
    : id === "ryan"
      ? "#4a90d9"
      : complementaryColor(bodyColor);

  const rawHead = r.head as Partial<HeadShape> | undefined;
  const rawBody = r.body as Partial<BodyShape> | undefined;

  return {
    head: {
      ...defaults.head,
      ...rawHead,
      offsetX: rawHead?.offsetX ?? 0,
      offsetY: rawHead?.offsetY ?? 0,
      offsetZ: rawHead?.offsetZ ?? 0,
    },
    body: {
      ...defaults.body,
      ...rawBody,
      leanX: rawBody?.leanX ?? 0,
      leanZ: rawBody?.leanZ ?? 0,
    },
    forearm: { ...defaults.forearm, ...(r.forearm as Partial<ForearmShape> ?? {}) },
    hand,
    layout:  mergedLayout,
    eyes: migrateEyes(r.eyes, isPlayer, defaultIrisColor),
    bodyColor,
  };
}

export function getBodyShape(id: string): CharacterBodyShape {
  const all = load();
  return migrate(all[id], id);
}

export function setBodyShape(id: string, shape: CharacterBodyShape): void {
  const all = load() as Record<string, CharacterBodyShape>;
  all[id] = shape;
  save(all);
}

export function resetBodyShape(id: string): CharacterBodyShape {
  const fresh: CharacterBodyShape = JSON.parse(JSON.stringify(defaultsForId(id)));
  const all = load() as Record<string, CharacterBodyShape>;
  all[id] = fresh;
  save(all);
  return fresh;
}
