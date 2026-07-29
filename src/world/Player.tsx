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
  positionRef: React.RefObject<THREE.Vector3 | null>;
  inputDir: React.RefObject<InputDirection>;
  rushMode: React.RefObject<RushMode>;
  rushTarget: React.RefObject<THREE.Vector3 | null>;
  hidden?: boolean;
  bodyShape?: CharacterBodyShape;
  animController?: React.RefObject<AnimationController>;
}

export function Player({ positionRef, inputDir, rushMode, rushTarget, hidden, bodyShape, animController }: PlayerProps) {
  const shape = bodyShape ?? PLAYER_DEFAULTS;
  const groupRef       = useRef<THREE.Group>(null);
  const bodyMeshRef    = useRef<THREE.Mesh>(null);
  const headGroupRef   = useRef<THREE.Group>(null);
  const leftArmRef     = useRef<THREE.Group>(null);
  const rightArmRef    = useRef<THREE.Group>(null);
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
    const pos       = computePositions(animShape, PLAYER_BODY_CENTER_Y);

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
      headGroupRef.current.rotation.set(
        deg2rad(animShape.head.rotation[0]),
        deg2rad(animShape.head.rotation[1]),
        deg2rad(animShape.head.rotation[2]),
      );
      headGroupRef.current.scale.setScalar(animShape.head.radius / shape.head.radius);
    }

    // Arm groups: shoulder pivot + upper-arm rotation from emote pose
    if (leftArmRef.current) {
      leftArmRef.current.position.set(-pos.forearmX, pos.shoulderY, 0);
      const la = rp.leftArm;
      leftArmRef.current.rotation.set(
        deg2rad(la.upperArmRotation[0]),
        deg2rad(la.upperArmRotation[1]),
        deg2rad(la.upperArmRotation[2]),
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.position.set(pos.forearmX, pos.shoulderY, 0);
      const ra = rp.rightArm;
      rightArmRef.current.rotation.set(
        deg2rad(ra.upperArmRotation[0]),
        deg2rad(ra.upperArmRotation[1]),
        deg2rad(ra.upperArmRotation[2]),
      );
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
  const pos  = computePositions(shape, PLAYER_BODY_CENTER_Y);
  const rot  = handRotations(hand.open);
  const COLOR = shape.bodyColor;

  // Arm mesh offsets relative to the shoulder group pivot
  const forearmLocalY = pos.forearmCenterY - pos.shoulderY;
  const handLocalY    = pos.handCenterY    - pos.shoulderY;

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
          why `Eyes` gets `headY={0}` — the group supplies the head's height. */}
      <group
        ref={headGroupRef}
        position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]}
        rotation={[deg2rad(head.rotation[0]), deg2rad(head.rotation[1]), deg2rad(head.rotation[2])]}
      >
        <mesh castShadow>
          <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
          <meshStandardMaterial ref={headMatRef} color={COLOR} transparent />
        </mesh>

        <Eyes eyes={shape.eyes} headY={0} headRadius={head.radius} />
      </group>

      {/* Left arm — shoulder pivot group */}
      <group ref={leftArmRef} position={[-pos.forearmX, pos.shoulderY, 0]}>
        <mesh position={[0, forearmLocalY, 0]} castShadow>
          <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
          <meshStandardMaterial ref={el => { armMatsRef.current[0] = el; }} color={COLOR} transparent />
        </mesh>
        <mesh position={[0, handLocalY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.left} castShadow>
          <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
          <meshStandardMaterial ref={el => { armMatsRef.current[1] = el; }} color={COLOR} transparent />
        </mesh>
      </group>

      {/* Right arm — shoulder pivot group */}
      <group ref={rightArmRef} position={[pos.forearmX, pos.shoulderY, 0]}>
        <mesh position={[0, forearmLocalY, 0]} castShadow>
          <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
          <meshStandardMaterial ref={el => { armMatsRef.current[2] = el; }} color={COLOR} transparent />
        </mesh>
        <mesh position={[0, handLocalY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.right} castShadow>
          <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
          <meshStandardMaterial ref={el => { armMatsRef.current[3] = el; }} color={COLOR} transparent />
        </mesh>
      </group>
    </group>
  );
}
