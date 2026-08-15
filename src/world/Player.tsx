import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { InputDirection } from "./useInputDirection";
import {
  type CharacterBodyShape,
  PLAYER_DEFAULTS,
  PLAYER_BODY_CENTER_Y,
  computePositions,
  handRotations,
  deg2rad,
} from "../services/body-shapes";
import { Eyes } from "./Eyes";
import { mergeAnimation, NEUTRAL_POSE } from "../services/emotes";
import type { AnimationController } from "../services/animation-controller";

const SPEED = 5;
const RUSH_ARRIVE_DISTANCE = 2;
const RUSH_PICKUP_DISTANCE = 0.5;
const RUSH_DECAY = 3;
const RUSH_MIN_SPEED = 8;
const BASE_Y = 0.75;

// 0 = not rushing, 1 = rush stop short, 2 = rush to pickup
export type RushMode = 0 | 1 | 2;

interface PlayerProps {
  /**
   * Which authored hand shape to draw.
   *
   * The contact maths is measured on this shape (`ArmMetrics.handRadius`), so drawing a
   * different one puts the mesh where the solver did not: a closed-fist bump solved at
   * 0.07 and drawn at 0.09 interpenetrates by the difference. Driven by whatever owns the
   * arm — see `FistBumpDriver` — and `"open"` the rest of the time.
   */
  handPose?: "open" | "closed";
  positionRef: React.RefObject<THREE.Vector3 | null>;
  inputDir: React.RefObject<InputDirection>;
  rushMode: React.RefObject<RushMode>;
  rushTarget: React.RefObject<THREE.Vector3 | null>;
  hidden?: boolean;
  bodyShape?: CharacterBodyShape;
  animController?: React.RefObject<AnimationController>;
  /**
   * **Forearm** groups, exposed so a driver can pose them — the fist bump. Same shape
   * `Dancer` and `Npc` take. When a side is being driven the driver owns it outright for
   * the duration and the emote's `upperArmRotation` is not written, which is ADR-0010's
   * owned-channel rule applied outside a square.
   *
   * The shoulder above each one stays this component's own (ADR-0017), which is why the
   * emote layer is untouched by the split: an emote's `upperArmRotation` is a rotation
   * *about the shoulder*, so it keeps writing the same group it always did and a driven
   * forearm hangs inside it.
   */
  forearms?: { left: React.RefObject<THREE.Group | null>; right: React.RefObject<THREE.Group | null> };
  /** Sides a driver is currently posing. Read per frame; usually empty. */
  drivenArms?: React.RefObject<{ left: boolean; right: boolean }>;
  /** The whole character group, for a driver that needs this player's yaw as well as position. */
  rigRef?: React.RefObject<THREE.Group | null>;
}

export function Player({ positionRef, inputDir, rushMode, rushTarget, hidden, bodyShape, animController, forearms, drivenArms, rigRef, handPose = "open" }: PlayerProps) {
  const shape = bodyShape ?? PLAYER_DEFAULTS;
  const ownGroup       = useRef<THREE.Group>(null);
  const groupRef       = rigRef ?? ownGroup;
  const bodyMeshRef    = useRef<THREE.Mesh>(null);
  const headGroupRef   = useRef<THREE.Group>(null);
  // The shoulders are this component's own and never a driver's: an emote rotates them
  // and nothing else may. The **forearms** are what a driver gets, and its refs, when
  // there is one, *are* the forearm refs — no merging and no callback refs, so each
  // group has exactly one owner either way.
  const leftArmRef     = useRef<THREE.Group>(null);
  const rightArmRef    = useRef<THREE.Group>(null);
  const ownLeftForearm  = useRef<THREE.Group>(null);
  const ownRightForearm = useRef<THREE.Group>(null);
  const leftForearmRef  = forearms?.left ?? ownLeftForearm;
  const rightForearmRef = forearms?.right ?? ownRightForearm;
  const matRef         = useRef<THREE.MeshStandardMaterial>(null);
  const headMatRef     = useRef<THREE.MeshStandardMaterial>(null);
  const armMatsRef     = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);

  // Capture facing direction when emote starts so spin applies on top
  const emoteBaseRotY = useRef(0);
  const wasEmoting    = useRef(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // --- Animation tick ---
    const rp        = animController?.current?.tick(state.clock.elapsedTime) ?? NEUTRAL_POSE;
    const isEmoting = animController?.current?.isPlaying() ?? false;
    const animShape = mergeAnimation(shape, rp);
    const pos       = computePositions(animShape, PLAYER_BODY_CENTER_Y, handPose);

    // Capture base rotation at emote start
    if (!wasEmoting.current && isEmoting) {
      emoteBaseRotY.current = groupRef.current.rotation.y;
    }
    wasEmoting.current = isEmoting;

    // Body mesh: lean + scale for radius/height deltas
    if (bodyMeshRef.current) {
      bodyMeshRef.current.rotation.set(deg2rad(animShape.body.leanX), 0, deg2rad(animShape.body.leanZ));
      const rs = animShape.body.radius / shape.body.radius;
      const hs = animShape.body.height / shape.body.height;
      bodyMeshRef.current.scale.set(rs, hs, rs);
    }

    // Head group — sphere and eyes together. Offsets, rotation and radius scale are
    // written once, to the pivot they share, so the face cannot come adrift from the
    // head it belongs to. `pos.headY` is recomputed from `animShape`, so a body the
    // emote stretched carries the whole head up with it, eyes included.
    if (headGroupRef.current) {
      headGroupRef.current.position.set(
        animShape.head.offsetX,
        pos.headY + animShape.head.offsetY,
        animShape.head.offsetZ,
      );
      // The emote's head turn only — see the group's comment in the JSX below.
      // `animShape.head.rotation` is this summed with `shape.head.rotation`, and that
      // base is decoration for the bare sphere, not a facing.
      headGroupRef.current.rotation.set(
        deg2rad(rp.headDeltaRotation[0]),
        deg2rad(rp.headDeltaRotation[1]),
        deg2rad(rp.headDeltaRotation[2]),
      );
      headGroupRef.current.scale.setScalar(animShape.head.radius / shape.head.radius);
    }

    // Shoulder groups: the emote's upper-arm rotation, about a pivot the JSX pins and
    // nothing writes. A driven side is skipped entirely — including the reset below —
    // because the driver owns the whole arm for the duration (ADR-0010), and because
    // resetting a shoulder under a driven forearm would rotate the forearm's frame out
    // from under a pose that was solved in rig space (ADR-0017).
    const driven = drivenArms?.current;
    // From the *animated* shape, not the authored one: an emote that stretches the body
    // moves the elbow with it, and a rest offset computed off the static shape would
    // leave the forearm behind.
    const restElbowY = pos.elbowY - pos.shoulderY;
    if (leftArmRef.current && !driven?.left) {
      const la = rp.leftArm;
      leftArmRef.current.rotation.set(
        deg2rad(la.upperArmRotation[0]),
        deg2rad(la.upperArmRotation[1]),
        deg2rad(la.upperArmRotation[2]),
      );
      // The forearm hangs at its rest offset whenever the emote layer has the arm; a
      // driver that has just let go must not leave the elbow where it put it.
      leftForearmRef.current?.position.set(0, restElbowY, 0);
      leftForearmRef.current?.rotation.set(0, 0, 0);
    }
    if (rightArmRef.current && !driven?.right) {
      const ra = rp.rightArm;
      rightArmRef.current.rotation.set(
        deg2rad(ra.upperArmRotation[0]),
        deg2rad(ra.upperArmRotation[1]),
        deg2rad(ra.upperArmRotation[2]),
      );
      rightForearmRef.current?.position.set(0, restElbowY, 0);
      rightForearmRef.current?.rotation.set(0, 0, 0);
    }

    // --- Rush fade ---
    const isRushing = rushMode.current !== 0 && rushTarget.current;
    if (matRef.current) {
      const targetOpacity = isRushing ? 0.3 : 1;
      for (const mat of [matRef.current, headMatRef.current, ...armMatsRef.current]) {
        if (!mat) continue;
        mat.opacity += (targetOpacity - mat.opacity) * 0.15;
        mat.transparent = mat.opacity < 1;
      }
    }

    // Jump: visual Y offset, positionRef stays at ground level
    groupRef.current.position.y = BASE_Y + rp.bodyDeltaY;

    // --- Movement ---
    if (isRushing) {
      const target = rushTarget.current!;
      const toTarget = new THREE.Vector3(
        target.x - groupRef.current.position.x,
        0,
        target.z - groupRef.current.position.z,
      );
      const dist    = toTarget.length();
      const stopDist = rushMode.current === 2 ? RUSH_PICKUP_DISTANCE : RUSH_ARRIVE_DISTANCE;
      if (dist < stopDist) {
        rushMode.current = 0;
      } else {
        const dir   = toTarget.normalize();
        const speed = Math.max(dist * RUSH_DECAY, RUSH_MIN_SPEED);
        groupRef.current.position.addScaledVector(dir, speed * delta);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    } else if (!isEmoting) {
      const { x, z } = inputDir.current!;
      if (x !== 0 || z !== 0) {
        const direction = new THREE.Vector3(x, 0, z).normalize();
        groupRef.current.position.addScaledVector(direction, SPEED * delta);
        groupRef.current.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }

    // Spin: emote bodyDeltaRotY applied on top of captured base facing
    if (isEmoting && rp.bodyDeltaRotY !== 0) {
      groupRef.current.rotation.y = emoteBaseRotY.current + deg2rad(rp.bodyDeltaRotY);
    }

    if (positionRef.current) {
      positionRef.current.x = groupRef.current.position.x;
      positionRef.current.z = groupRef.current.position.z;
      positionRef.current.y = BASE_Y;
    }
  });

  const { head, body, forearm, hand } = shape;
  const pos  = computePositions(shape, PLAYER_BODY_CENTER_Y, handPose);
  const activeHand = hand[handPose];
  const rot  = handRotations(activeHand);
  const COLOR = shape.bodyColor;

  // Arm mesh offsets, now relative to the **elbow** group inside the shoulder pivot.
  // The two hops compose back to the same rest heights (ADR-0017).
  const elbowLocalY   = pos.elbowY         - pos.shoulderY;
  const forearmLocalY = pos.forearmCenterY - pos.elbowY;
  const handLocalY    = pos.handCenterY    - pos.elbowY;

  return (
    <group
      ref={groupRef}
      position={[positionRef.current?.x ?? 0, positionRef.current?.y ?? BASE_Y, positionRef.current?.z ?? 0]}
      visible={!hidden}
    >
      {/* Body */}
      <mesh ref={bodyMeshRef} rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]} castShadow>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial ref={matRef} color={COLOR} transparent />
      </mesh>

      {/* Head group — the sphere and the eyes, pivoting on the head center so a head
          turn carries the face with it. A rotated sphere is indistinguishable from an
          unrotated one: the eyes are the only part of a head that shows which way it
          is looking, so they have to be children of the thing that turns rather than
          siblings of it. Everything inside sits at head-local coordinates, which is
          why `Eyes` gets `headY={0}` — the group supplies the head's height.

          **The group carries the emote's head turn only, never `shape.head.rotation`.**
          Those are two different rotations that used to look like one. The shape field
          was only ever applied to a bare sphere, where it is invisible except on a
          low-segment faceted head, so its stored values were tuned as decoration and
          mean nothing about facing — the player's is `[-180, -91, -93]`. Putting the
          eyes inside a group carrying it turned that harmless junk into a face rotated
          91° onto the side of the head. It stays on the mesh it has always been on;
          `Dancer` has the same split, having never applied it to its group at all. */}
      <group
        ref={headGroupRef}
        position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]}
      >
        <mesh
          castShadow
          rotation={[deg2rad(head.rotation[0]), deg2rad(head.rotation[1]), deg2rad(head.rotation[2])]}
        >
          <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
          <meshStandardMaterial ref={headMatRef} color={COLOR} transparent />
        </mesh>

        <Eyes eyes={shape.eyes} headY={0} headRadius={head.radius} />
      </group>

      {/* Left arm — a pinned shoulder pivot the emote layer rotates, with the forearm
          hanging inside it at the elbow. The driver is handed the inner group only, so
          a bump can bend this arm and cannot pull the shoulder off the body
          (ADR-0017). */}
      <group ref={leftArmRef} position={[-pos.forearmX, pos.shoulderY, 0]}>
        <group ref={leftForearmRef} position={[0, elbowLocalY, 0]}>
          <mesh position={[0, forearmLocalY, 0]} castShadow>
            <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
            <meshStandardMaterial ref={el => { armMatsRef.current[0] = el; }} color={COLOR} transparent />
          </mesh>
          <mesh position={[0, handLocalY, 0]} scale={[1, 1, activeHand.flattenZ]} rotation={rot.left} castShadow>
            <sphereGeometry args={[activeHand.radius, activeHand.widthSegments, activeHand.heightSegments]} />
            <meshStandardMaterial ref={el => { armMatsRef.current[1] = el; }} color={COLOR} transparent />
          </mesh>
        </group>
      </group>

      {/* Right arm — same split. */}
      <group ref={rightArmRef} position={[pos.forearmX, pos.shoulderY, 0]}>
        <group ref={rightForearmRef} position={[0, elbowLocalY, 0]}>
          <mesh position={[0, forearmLocalY, 0]} castShadow>
            <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
            <meshStandardMaterial ref={el => { armMatsRef.current[2] = el; }} color={COLOR} transparent />
          </mesh>
          <mesh position={[0, handLocalY, 0]} scale={[1, 1, activeHand.flattenZ]} rotation={rot.right} castShadow>
            <sphereGeometry args={[activeHand.radius, activeHand.widthSegments, activeHand.heightSegments]} />
            <meshStandardMaterial ref={el => { armMatsRef.current[3] = el; }} color={COLOR} transparent />
          </mesh>
        </group>
      </group>
    </group>
  );
}
