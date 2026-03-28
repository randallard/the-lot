const STORAGE_KEY = "townage-arm-actions";

export interface ArmPose {
  /** Upper arm rotation in degrees [x, y, z] — pivots from the shoulder joint */
  upperArmRotation: [number, number, number];
  /** Forearm rotation in degrees [x, y, z] — pivots from the elbow joint */
  forearmRotation: [number, number, number];
  /** Hand/wrist rotation in degrees [x, y, z] — pivots from the wrist joint */
  handRotation: [number, number, number];
}

export interface ActionKeyframe {
  id: string;
  label: string;
  pose: ArmPose;
  /** Seconds to lerp from the previous keyframe (or rest) to this pose */
  transitionDuration: number;
  /** Times to hold at this keyframe before proceeding to the next */
  holdLoops: number;
}

export interface ArmAction {
  id: string;
  name: string;
  keyframes: ActionKeyframe[];
  /** Seconds to lerp back from the final keyframe to rest */
  returnDuration: number;
}

export const ZERO_POSE: ArmPose = {
  upperArmRotation: [0, 0, 0],
  forearmRotation: [0, 0, 0],
  handRotation: [0, 0, 0],
};

function makeKf(label: string, pose: ArmPose, dur: number, hold = 0): ActionKeyframe {
  return { id: crypto.randomUUID(), label, pose, transitionDuration: dur, holdLoops: hold };
}

/** Pre-built parade wave: elbow elbow wrist wrist wrist */
export function makeParadeWaveAction(): ArmAction {
  // Right arm axes (left auto-mirrors Y and Z):
  //   +Z shoulder → swings right arm outward to horizontal
  //   +Z elbow    → bends forearm upward at elbow (in elbow's local frame after shoulder rotation)
  //   +Y hand     → wrist left/right wave (in hand's local frame after chain rotations)
  const raised: ArmPose = { upperArmRotation: [0, 0, 90], forearmRotation: [0, 0, 90], handRotation: [0, 0, 0] };
  const elbowIn: ArmPose = { upperArmRotation: [0, 0, 90], forearmRotation: [0, 0, 80], handRotation: [0, 0, 0] };
  const waveA: ArmPose   = { upperArmRotation: [0, 0, 90], forearmRotation: [0, 0, 90], handRotation: [0, 30, 0] };
  const waveB: ArmPose   = { upperArmRotation: [0, 0, 90], forearmRotation: [0, 0, 90], handRotation: [0, -30, 0] };

  return {
    id: crypto.randomUUID(),
    name: "parade wave",
    keyframes: [
      makeKf("raise",    raised,  0.25),
      makeKf("elbow in", elbowIn, 0.15),
      makeKf("elbow out",raised,  0.15),
      makeKf("wave a",   waveA,   0.12),
      makeKf("wave b",   waveB,   0.12),
      makeKf("wave a",   waveA,   0.12),
    ],
    returnDuration: 0.35,
  };
}

export function makeKeyframe(overrides?: Partial<ActionKeyframe>): ActionKeyframe {
  return {
    id: crypto.randomUUID(),
    label: "",
    pose: { ...ZERO_POSE },
    transitionDuration: 0.3,
    holdLoops: 0,
    ...overrides,
  };
}

export function makeAction(name: string): ArmAction {
  return {
    id: crypto.randomUUID(),
    name,
    keyframes: [makeKeyframe({ label: "raise" })],
    returnDuration: 0.3,
  };
}

// ---------------------------------------------------------------------------
// Storage

function load(): Record<string, ArmAction[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function save(all: Record<string, ArmAction[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function getActions(characterId: string): ArmAction[] {
  return load()[characterId] ?? [];
}

export function saveAction(characterId: string, action: ArmAction): void {
  const all = load();
  const list = all[characterId] ?? [];
  const idx = list.findIndex(a => a.id === action.id);
  if (idx >= 0) list[idx] = action;
  else list.push(action);
  all[characterId] = list;
  save(all);
}

export function deleteAction(characterId: string, actionId: string): void {
  const all = load();
  all[characterId] = (all[characterId] ?? []).filter(a => a.id !== actionId);
  save(all);
}
