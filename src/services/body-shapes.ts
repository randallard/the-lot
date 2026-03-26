/**
 * Body shape configuration for player and NPCs.
 * Stores per-part geometry args and positional layout params.
 */

const STORAGE_KEY = "townage-body-shapes";

export interface HeadShape {
  radius: number;
  widthSegments: number;
  heightSegments: number;
}

export interface BodyShape {
  radius: number;
  height: number;
  capSegments: number;
  radialSegments: number;
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
  /** Y scale — 1.0 = sphere, 0.1 = very flat disc */
  flattenY: number;
  widthSegments: number;
  heightSegments: number;
  /** Euler rotation in degrees [x, y, z].
   *  Right hand uses these directly.
   *  Left hand mirrors: [x, -y, -z] for natural symmetry. */
  rotation: [number, number, number];
  /** Gap between wrist (forearm bottom) and hand top surface. Negative = overlap */
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
}

/** Y of body capsule center within character group (local space) */
export const PLAYER_BODY_CENTER_Y = 0;
export const NPC_BODY_CENTER_Y = 0.5;

const PLAYER_HAND_OPEN: HandPose = {
  radius: 0.12, flattenY: 0.15, widthSegments: 10, heightSegments: 8,
  rotation: [0, 0, 0], handForearmGap: 0.04,
};
const PLAYER_HAND_CLOSED: HandPose = {
  radius: 0.10, flattenY: 0.28, widthSegments: 8, heightSegments: 6,
  rotation: [0, 0, 35], handForearmGap: 0.04,
};
const NPC_HAND_OPEN: HandPose = {
  radius: 0.11, flattenY: 0.15, widthSegments: 10, heightSegments: 8,
  rotation: [0, 0, 0], handForearmGap: 0.01,
};
const NPC_HAND_CLOSED: HandPose = {
  radius: 0.09, flattenY: 0.28, widthSegments: 8, heightSegments: 6,
  rotation: [0, 0, 35], handForearmGap: 0.01,
};

export const PLAYER_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.3, widthSegments: 12, heightSegments: 12 },
  body: { radius: 0.3, height: 0.8, capSegments: 8, radialSegments: 16 },
  forearm: { topRadius: 0.065, bottomRadius: 0.05, height: 0.28, radialSegments: 10 },
  hand: { open: PLAYER_HAND_OPEN, closed: PLAYER_HAND_CLOSED },
  layout: {
    forearmXOffset: 0.46,
    upperArmSpacing: 0.47,
    headBodyGap: -0.20,
  },
};

export const NPC_DEFAULTS: CharacterBodyShape = {
  head: { radius: 0.3, widthSegments: 12, heightSegments: 12 },
  body: { radius: 0.3, height: 0.3, capSegments: 8, radialSegments: 16 },
  forearm: { topRadius: 0.058, bottomRadius: 0.045, height: 0.24, radialSegments: 10 },
  hand: { open: NPC_HAND_OPEN, closed: NPC_HAND_CLOSED },
  layout: {
    forearmXOffset: 0.46,
    upperArmSpacing: 0.33,
    headBodyGap: -0.20,
  },
};

export const SHAPE_BOUNDS = {
  head: {
    radius:         { min: 0.10, max: 0.60, step: 0.01 },
    widthSegments:  { min: 3,    max: 32,   step: 1 },
    heightSegments: { min: 3,    max: 24,   step: 1 },
  },
  body: {
    radius:         { min: 0.10, max: 0.60, step: 0.01 },
    height:         { min: 0.10, max: 2.00, step: 0.01 },
    capSegments:    { min: 2,    max: 16,   step: 1 },
    radialSegments: { min: 4,    max: 32,   step: 1 },
  },
  forearm: {
    topRadius:      { min: 0.02, max: 0.15, step: 0.005 },
    bottomRadius:   { min: 0.01, max: 0.12, step: 0.005 },
    height:         { min: 0.05, max: 0.60, step: 0.01 },
    radialSegments: { min: 3,    max: 24,   step: 1 },
  },
  hand: {
    radius:         { min: 0.04, max: 0.25, step: 0.01 },
    flattenY:       { min: 0.05, max: 1.00, step: 0.01 },
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
  forearmCenterY: number;
  handCenterY: number;
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
  const elbowY = bodyTop - layout.upperArmSpacing;
  const forearmCenterY = elbowY - forearm.height / 2;
  const forearmWristY = forearmCenterY - forearm.height / 2;
  const handHalfHeight = activePose.radius * activePose.flattenY;
  const handCenterY = forearmWristY - activePose.handForearmGap - handHalfHeight;
  const headCenterY = bodyTop + layout.headBodyGap + head.radius;

  return {
    headY: headCenterY,
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

/** Migrate and fill defaults for any missing fields (handles schema evolution). */
function migrate(raw: unknown, id: string): CharacterBodyShape {
  const defaults = id === "player" ? PLAYER_DEFAULTS : NPC_DEFAULTS;
  if (!raw || typeof raw !== "object") return JSON.parse(JSON.stringify(defaults));

  const r = raw as Record<string, unknown>;

  // Migrate old flat HandShape → new { open, closed } format
  const rawHand = r.hand as Record<string, unknown> | undefined;
  let hand: HandShape;
  if (!rawHand || !rawHand.open) {
    // Legacy: migrate flat fields into open pose
    const legacyOpen: HandPose = {
      radius:         (rawHand?.radius as number)         ?? defaults.hand.open.radius,
      flattenY:       (rawHand?.flattenY as number)       ?? defaults.hand.open.flattenY,
      widthSegments:  (rawHand?.widthSegments as number)  ?? defaults.hand.open.widthSegments,
      heightSegments: (rawHand?.heightSegments as number) ?? defaults.hand.open.heightSegments,
      rotation:       [0, 0, 0],
    };
    hand = { open: legacyOpen, closed: JSON.parse(JSON.stringify(defaults.hand.closed)) };
  } else {
    hand = {
      open:   { ...defaults.hand.open,   ...(rawHand.open   as Partial<HandPose>) },
      closed: { ...defaults.hand.closed, ...(rawHand.closed as Partial<HandPose> ?? {}) },
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

  return {
    head:    { ...defaults.head,    ...(r.head    as Partial<HeadShape>    ?? {}) },
    body:    { ...defaults.body,    ...(r.body    as Partial<BodyShape>    ?? {}) },
    forearm: { ...defaults.forearm, ...(r.forearm as Partial<ForearmShape> ?? {}) },
    hand,
    layout:  mergedLayout,
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
  const fresh: CharacterBodyShape = JSON.parse(
    JSON.stringify(id === "player" ? PLAYER_DEFAULTS : NPC_DEFAULTS),
  );
  const all = load() as Record<string, CharacterBodyShape>;
  all[id] = fresh;
  save(all);
  return fresh;
}
