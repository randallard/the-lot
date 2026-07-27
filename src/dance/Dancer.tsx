/**
 * One dancer on the floor.
 *
 * Position and facing are written straight onto the group ref from the frame loop —
 * the ADR-0002 shared-ref pattern, for the same reason every other mover uses it:
 * a `setState` per frame per dancer is not affordable.
 *
 * Body geometry comes from `services/body-shapes`, so dancers look like the rest of
 * the cast and inherit the editors rather than reimplementing a character.
 */

import type * as THREE from "three";
import {
  type CharacterBodyShape,
  NPC_BODY_CENTER_Y,
  computePositions,
  deg2rad,
  handRotations,
} from "../services/body-shapes";

/** The rig a driver writes transforms onto. */
export type DancerRig = React.RefObject<THREE.Group | null>;

/**
 * The two arm groups, by the dancer's own anatomy. Characters face local `+z`
 * (townage's `atan2(dir.x, dir.z)` heading convention), so the anatomical left
 * arm is the group at `+x` — note this is the group the hand *styling* calls
 * "right", because hand-pose naming is viewer-mirrored (like the eye editor).
 */
export interface DancerArmRigs {
  left: DancerRig;
  right: DancerRig;
}

interface DancerProps {
  shape: CharacterBodyShape;
  rig: DancerRig;
  /** Marker colour override — the debug scene tints dancers so paths are readable. */
  color?: string;
  /** When provided, the driver may pose the arms (grip aiming). */
  arms?: DancerArmRigs;
}

export function Dancer({ shape, rig, color, arms }: DancerProps) {
  const { head, body, forearm, hand } = shape;
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);
  const rot = handRotations(hand.open);
  const COLOR = color ?? shape.bodyColor;

  const forearmLocalY = pos.forearmCenterY - pos.shoulderY;
  const handLocalY = pos.handCenterY - pos.shoulderY;

  return (
    <group ref={rig}>
      <mesh rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]} castShadow>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>

      <mesh position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]} castShadow>
        <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>

      {/* Facing marker on local +z — the axis townage characters face: rotation.y
          is atan2(dir.x, dir.z) everywhere, which points local +z along the
          heading, and the cast's eyes sit at +eyeZOnSphere. Anchored to the head
          center so it stays on caricature heads with offsets. */}
      <mesh position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ + head.radius * 0.95]}>
        <sphereGeometry args={[head.radius * 0.28, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Anatomical RIGHT arm (at −x; facing is +z). Styling uses rot.left — the
          hand-pose names are viewer-mirrored. */}
      <group ref={arms?.right} position={[-pos.forearmX, pos.shoulderY, 0]}>
        <mesh position={[0, forearmLocalY, 0]} castShadow>
          <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
        <mesh position={[0, handLocalY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.left}>
          <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      </group>

      {/* Anatomical LEFT arm (at +x). */}
      <group ref={arms?.left} position={[pos.forearmX, pos.shoulderY, 0]}>
        <mesh position={[0, forearmLocalY, 0]} castShadow>
          <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
        <mesh position={[0, handLocalY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.right}>
          <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>
      </group>
    </group>
  );
}
