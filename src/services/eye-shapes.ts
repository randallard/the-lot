import * as THREE from "three";

// ---------------------------------------------------------------------------
// Types

export interface EyeShape {
  width: number;
  height: number;
  // Per-corner roundness: 0 = sharp, 1 = fully round
  cornerTL: number;
  cornerTR: number;
  cornerBL: number;
  cornerBR: number;
  // Per-edge arc: 0 = flat, + = convex outward, - = concave inward
  arcTop: number;
  arcBottom: number;
  arcLeft: number;
  arcRight: number;
  // Iris
  irisColor: string;
  irisSize: number; // fraction of eye height (0–1)
  irisOffsetY: number; // world-unit vertical offset of iris within the eye (+ = up)
  /** Show the white sclera shape behind the iris */
  showWhite: boolean;
  /** Rotation of the entire eye shape in degrees (+ = clockwise) */
  rotation: number;
}

export interface EyePositioning {
  fromTopOfHead: number; // 0 = very top of head, 1 = bottom
  separation: number;    // world-unit distance between eye centers
}

export interface CharacterEyes {
  positioning: EyePositioning;
  asymmetric: boolean;
  right: EyeShape; // used for both eyes when !asymmetric
  left: EyeShape;  // only active when asymmetric
  expressions: Record<string, Partial<EyeShape>>; // open-ended; keys are any string
  /** Clip each eye's white at the midpoint between the eyes so inner corners don't overlap */
  clipOverlap: boolean;
  /** Apply rotation in opposite directions: left eye gets -rotation of right eye */
  rotationMirrored: boolean;
}

// ---------------------------------------------------------------------------
// Suggested expression names (not enforced — just UI hints)

export const SUGGESTED_EXPRESSIONS = [
  "happy", "sad", "excited", "frustrated", "mad", "surprised", "sleepy",
] as const;

// ---------------------------------------------------------------------------
// Defaults

const BASE_EYE: EyeShape = {
  width: 0.13,
  height: 0.08,
  cornerTL: 0.5,
  cornerTR: 0.5,
  cornerBL: 0.5,
  cornerBR: 0.5,
  arcTop: 0,
  arcBottom: 0,
  arcLeft: 0,
  arcRight: 0,
  irisColor: "#3a6ea8",
  irisSize: 0.75,
  irisOffsetY: 0,
  showWhite: false,
  rotation: 0,
};

export const PLAYER_EYE_DEFAULTS: CharacterEyes = {
  positioning: { fromTopOfHead: 0.36, separation: 0.22 },
  asymmetric: false,
  right: { ...BASE_EYE },
  left: { ...BASE_EYE },
  expressions: {},
  clipOverlap: false,
  rotationMirrored: true,
};

export const NPC_EYE_DEFAULTS: CharacterEyes = {
  positioning: { fromTopOfHead: 0.36, separation: 0.20 },
  asymmetric: false,
  right: { ...BASE_EYE },
  left: { ...BASE_EYE },
  expressions: {},
  clipOverlap: false,
  rotationMirrored: true,
};

// ---------------------------------------------------------------------------
// Bounds for sliders

export const EYE_BOUNDS = {
  width:         { min: 0.03, max: 0.28, step: 0.005 },
  height:        { min: 0.02, max: 0.18, step: 0.005 },
  corner:        { min: 0,    max: 1,    step: 0.05  },
  arc:           { min: -0.06, max: 0.06, step: 0.002 },
  irisSize:      { min: 0.2,   max: 1.0,  step: 0.05  },
  irisOffsetY:   { min: -0.06, max: 0.06, step: 0.002 },
  rotation:      { min: -45,   max: 45,   step: 1     },
  fromTopOfHead: { min: 0.10,  max: 0.80, step: 0.01  },
  separation:    { min: 0.05,  max: 0.60, step: 0.01  },
} as const;

// ---------------------------------------------------------------------------
// Utilities

/** Apply expression overrides on top of base shape */
export function resolveEye(base: EyeShape, expression?: Partial<EyeShape>): EyeShape {
  if (!expression) return base;
  return { ...base, ...expression };
}

/** Z position for an eye sitting on the surface of a head sphere */
export function eyeZOnSphere(headRadius: number, eyeX: number, eyeLocalY: number): number {
  const r2 = headRadius * headRadius - eyeX * eyeX - eyeLocalY * eyeLocalY;
  return Math.sqrt(Math.max(0, r2)) + 0.002;
}

/** RGB inversion — exact complement of a hex color */
export function complementaryColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const ch = (n: number) => (255 - n).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/**
 * Migrate a raw stored value to a valid CharacterEyes.
 * @param defaultIrisColor — used as the iris default when no saved iris exists.
 *   Applied before saved overrides so user-saved iris always wins.
 */
export function migrateEyes(raw: unknown, isPlayer: boolean, defaultIrisColor?: string): CharacterEyes {
  const defaults = isPlayer ? PLAYER_EYE_DEFAULTS : NPC_EYE_DEFAULTS;
  const irisDefault = defaultIrisColor
    ? { irisColor: defaultIrisColor }
    : {};

  if (!raw || typeof raw !== "object") {
    const fresh = structuredClone(defaults);
    if (defaultIrisColor) {
      fresh.right.irisColor = defaultIrisColor;
      fresh.left.irisColor = defaultIrisColor;
    }
    return fresh;
  }

  const r = raw as Record<string, unknown>;
  return {
    positioning: { ...defaults.positioning, ...(r.positioning as Partial<EyePositioning> ?? {}) },
    asymmetric:   typeof r.asymmetric   === "boolean" ? r.asymmetric   : false,
    clipOverlap:      typeof r.clipOverlap      === "boolean" ? r.clipOverlap      : false,
    rotationMirrored: typeof r.rotationMirrored === "boolean" ? r.rotationMirrored : true,
    // irisDefault goes between defaults and saved data: saved data always wins
    right: { ...defaults.right, ...irisDefault, ...(r.right as Partial<EyeShape> ?? {}) },
    left:  { ...defaults.left,  ...irisDefault, ...(r.left  as Partial<EyeShape> ?? {}) },
    expressions: (r.expressions as Record<string, Partial<EyeShape>> | undefined) ?? {},
  };
}

// ---------------------------------------------------------------------------
// THREE.Shape factory

export function buildEyeShape(eye: EyeShape): THREE.Shape {
  const hw = eye.width / 2;
  const hh = eye.height / 2;

  // Scale corner radii: 0–1 mapped to 0–maxR
  const maxR = Math.min(hw, hh) * 0.48;
  const tl = eye.cornerTL * maxR;
  const tr = eye.cornerTR * maxR;
  const bl = eye.cornerBL * maxR;
  const br = eye.cornerBR * maxR;

  const s = new THREE.Shape();

  // Start after top-left corner, going clockwise
  s.moveTo(-hw + tl, hh);

  // Top edge
  if (Math.abs(eye.arcTop) > 0.0001) {
    s.quadraticCurveTo(0, hh + eye.arcTop, hw - tr, hh);
  } else {
    s.lineTo(hw - tr, hh);
  }
  // TR corner
  s.quadraticCurveTo(hw, hh, hw, hh - tr);

  // Right edge
  if (Math.abs(eye.arcRight) > 0.0001) {
    s.quadraticCurveTo(hw + eye.arcRight, 0, hw, -hh + br);
  } else {
    s.lineTo(hw, -hh + br);
  }
  // BR corner
  s.quadraticCurveTo(hw, -hh, hw - br, -hh);

  // Bottom edge
  if (Math.abs(eye.arcBottom) > 0.0001) {
    s.quadraticCurveTo(0, -hh - eye.arcBottom, -hw + bl, -hh);
  } else {
    s.lineTo(-hw + bl, -hh);
  }
  // BL corner
  s.quadraticCurveTo(-hw, -hh, -hw, -hh + bl);

  // Left edge
  if (Math.abs(eye.arcLeft) > 0.0001) {
    s.quadraticCurveTo(-hw - eye.arcLeft, 0, -hw, hh - tl);
  } else {
    s.lineTo(-hw, hh - tl);
  }
  // TL corner (close)
  s.quadraticCurveTo(-hw, hh, -hw + tl, hh);

  return s;
}
