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

/**
 * Floor on the chest facing marker, in world units. A debug annotation has to stay
 * legible on the smallest body the editors allow, so below this it stops shrinking
 * with the torso. For scale: the debug scene's joint markers are 0.035–0.045.
 */
const MIN_FACING_MARKER_RADIUS = 0.07;

/** The rig a driver writes transforms onto. */
export type DancerRig = React.RefObject<THREE.Group | null>;

/**
 * The two **forearm** groups, by the dancer's own anatomy. Characters face local `+z`
 * (townage's `atan2(dir.x, dir.z)` heading convention), so the anatomical left
 * arm is the group at `+x` — note this is the group the hand *styling* calls
 * "right", because hand-pose naming is viewer-mirrored (like the eye editor).
 *
 * **These are the forearms, not the arms, and that is the point** (ADR-0017). Each one
 * hangs inside a shoulder group that is pinned at the body's own shoulder and is not
 * exposed here, so there is no ref a driver could use to move a shoulder. The old
 * single group *was* the shoulder and a driver placed it wherever the pose arithmetic
 * needed — which put it 0.34 behind the body at bump range with nothing on screen to
 * say so. Making the shoulder unreachable is what stops that being expressible.
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
  /**
   * Body and head, for the expression channels an emote owns outright — lean, bob,
   * head turn. The driver writes them; nothing here reads the emote layer directly.
   */
  expression?: DancerExpressionRigs;
}

/**
 * The parts an emote may move without touching the formation.
 *
 * `head` is the whole head *group* — the sphere and the facing marker together —
 * not the sphere alone. A rotated sphere is indistinguishable from an unrotated
 * one, so a head turn is only visible in the marker, and the two have to turn as
 * one thing.
 */
export interface DancerExpressionRigs {
  body: React.RefObject<THREE.Mesh | null>;
  head: React.RefObject<THREE.Group | null>;
}

export function Dancer({ shape, rig, color, arms, expression }: DancerProps) {
  const { head, body, forearm, hand } = shape;
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);
  const rot = handRotations(hand.open);
  const COLOR = color ?? shape.bodyColor;

  // Mesh heights relative to the **elbow**, which is where the forearm group now sits.
  // The shoulder group holds the elbow at `elbowY − shoulderY` and the meshes hang off
  // that, so the two offsets compose back to the same rest heights they always had —
  // the rest pose is unchanged by construction (ADR-0017).
  const elbowLocalY = pos.elbowY - pos.shoulderY;
  const forearmLocalY = pos.forearmCenterY - pos.elbowY;
  const handLocalY = pos.handCenterY - pos.elbowY;
  const facingMarkerRadius = Math.max(body.radius * 0.16, MIN_FACING_MARKER_RADIUS);

  return (
    <group ref={rig}>
      <mesh ref={expression?.body} rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]} castShadow>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial color={COLOR} />
      </mesh>

      {/* Chest facing marker — the *body's* heading, which stopped being the same
          question as the head's the moment heads could turn. An emote may turn a
          dancer's head all the way round; it may never turn their body, and with
          only the head marker there was no way to see the difference. Parented to
          the rig rather than to the body mesh, so it reports yaw alone and an
          emote's lean cannot tilt it into looking like a turn.

          Sized with a floor rather than purely off `body.radius`: that is the one
          dimension the cast varies most (SHAPE_BOUNDS runs 0.1 → 0.6, and the debug
          scene's size casts exercise both ends), so a proportional marker vanished on
          exactly the thin bodies it was needed on. Seated at chest height on the
          cylindrical section, and always left standing proud of the widest point of
          the torso, so no body shape can swallow it. */}
      <mesh position={[0, NPC_BODY_CENTER_Y + body.height * 0.25, body.radius + facingMarkerRadius * 0.35]}>
        <sphereGeometry args={[facingMarkerRadius, 10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Head group, pivoting on the head center so a head turn sweeps the marker
          around the sphere instead of spinning a featureless ball. Anchored here
          rather than on each mesh so it stays right on caricature heads with
          offsets. */}
      <group ref={expression?.head} position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]}>
        <mesh castShadow>
          <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
          <meshStandardMaterial color={COLOR} />
        </mesh>

        {/* Facing marker on local +z — the axis townage characters face: rotation.y
            is atan2(dir.x, dir.z) everywhere, which points local +z along the
            heading, and the cast's eyes sit at +eyeZOnSphere. */}
        <mesh position={[0, 0, head.radius * 0.95]}>
          <sphereGeometry args={[head.radius * 0.28, 8, 8]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Anatomical RIGHT arm (at −x; facing is +z). Styling uses rot.left — the
          hand-pose names are viewer-mirrored.

          Two groups, not one, per ADR-0017: the outer one is the **shoulder** and is
          pinned to the body with no ref on it, so nothing can move it; the inner one is
          the **elbow**, and it is the only thing a driver is handed. The undrawn upper
          arm is the gap between them, and it is now a real, measurable span rather than
          an assumption baked into a single origin. */}
      <group position={[-pos.forearmX, pos.shoulderY, 0]}>
        <group ref={arms?.right} position={[0, elbowLocalY, 0]}>
          <mesh position={[0, forearmLocalY, 0]} castShadow>
            <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
            <meshStandardMaterial color={COLOR} />
          </mesh>
          <mesh position={[0, handLocalY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.left}>
            <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
            <meshStandardMaterial color={COLOR} />
          </mesh>
        </group>
      </group>

      {/* Anatomical LEFT arm (at +x). */}
      <group position={[pos.forearmX, pos.shoulderY, 0]}>
        <group ref={arms?.left} position={[0, elbowLocalY, 0]}>
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
    </group>
  );
}
