/**
 * Read a dancer **off the scene graph** as the solids `pose-rules.ts` checks.
 *
 * 🔑 **Read back, not re-derived.** Every number here comes from a mesh's own world matrix and
 * its own geometry — the forearm cone's two ends, the hand as scaled and turned, the torso as
 * stretched. Nothing is computed from the pose that was *intended*. `DanceFloor`'s arm report
 * gives the reason: reading the rigs back is "how the easing bug was caught", and the rules
 * exist to be the one thing in this subsystem that cannot disagree with the picture.
 *
 * Separate from `pose-rules.ts` because that module is plain numbers and is tested without a
 * renderer; this one is the only part that knows three.js is there.
 */

import * as THREE from "three";
import type { DancerArmRigs, DancerExpressionRigs } from "./Dancer";
import type { ArmSolid, DancerSolids, Hull, Side } from "./pose-rules";

const _w = new THREE.Vector3();

function point(v: THREE.Vector3): { x: number; y: number; z: number } {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * A mesh's own vertices, in world space.
 *
 * 🔑 **The corners, not the shape they stand for.** Ember's forearm is a cylinder with three
 * sides and her hand a sphere with four; a checker that took "cylinder" and "sphere" at their
 * word measured solids a good deal fatter than the ones on screen (`pose-rules.ts`, *Why every
 * solid is its own drawn corners*). The matrix carries every scale and turn the frame applied —
 * a stretched torso, a flattened and rolled hand — so none of that is re-derived here either.
 */
function hullOf(mesh: THREE.Mesh): Hull {
  const at = mesh.geometry.getAttribute("position");
  const e = mesh.matrixWorld.elements;
  const points = new Float64Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    points[i * 3] = (e[0] ?? 0) * x + (e[4] ?? 0) * y + (e[8] ?? 0) * z + (e[12] ?? 0);
    points[i * 3 + 1] = (e[1] ?? 0) * x + (e[5] ?? 0) * y + (e[9] ?? 0) * z + (e[13] ?? 0);
    points[i * 3 + 2] = (e[2] ?? 0) * x + (e[6] ?? 0) * y + (e[10] ?? 0) * z + (e[14] ?? 0);
  }
  return { points };
}

function readArm(
  arm: THREE.Group,
  hand: THREE.Mesh,
  shoulder: THREE.Object3D | null | undefined,
  upperArm: number,
): ArmSolid | null {
  // The forearm is the arm group's one cylinder. Found by geometry rather than by index, so a
  // marker added to the group later cannot be mistaken for it.
  const fore = arm.children.find(
    (c): c is THREE.Mesh => (c as THREE.Mesh).geometry instanceof THREE.CylinderGeometry,
  );
  if (fore === undefined) return null;
  // The arm group's origin *is* the elbow (ADR-0017).
  const elbow = point(arm.getWorldPosition(_w));
  return {
    // No shoulder rig means nothing can have moved it off the elbow's own group; the length
    // rule then reads zero stretch, which is the truth about an arm with no upper half.
    shoulder: shoulder ? point(shoulder.getWorldPosition(_w)) : elbow,
    elbow,
    upperArm,
    forearm: hullOf(fore),
    hand: hullOf(hand),
  };
}

/**
 * One dancer as drawn. `null` when a rig has not mounted yet.
 *
 * Call after the frame's rigs are written; this updates the rig's world matrices itself, since
 * a `useFrame` runs before the renderer would.
 *
 * @param upperArm each arm's natural upper-arm length, from the worn `ArmMetrics.elbowReach`.
 */
export function readSolids(
  rig: THREE.Group,
  arms: DancerArmRigs,
  parts: DancerExpressionRigs,
  upperArm: { readonly left: number; readonly right: number },
): DancerSolids | null {
  const body = parts.body.current;
  const headGroup = parts.head.current;
  if (!body || !headGroup) return null;
  rig.updateWorldMatrix(true, true);

  // The head group holds the head and its facing marker; the head is the first sphere in it.
  const head = headGroup.children.find(
    (c): c is THREE.Mesh => (c as THREE.Mesh).geometry instanceof THREE.SphereGeometry,
  );
  if (head === undefined) return null;

  const read = (side: Side): ArmSolid | null => {
    const arm = arms[side].current;
    const hand = arms.hands[side].current;
    if (!arm || !hand) return null;
    return readArm(arm, hand, parts.shoulders[side].current, upperArm[side]);
  };
  const left = read("left");
  const right = read("right");
  if (left === null || right === null) return null;

  rig.getWorldPosition(_w);
  return {
    x: _w.x,
    z: _w.z,
    yaw: rig.rotation.y,
    body: hullOf(body),
    head: hullOf(head),
    left,
    right,
  };
}
