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

const SPEED = 5;
const RUSH_ARRIVE_DISTANCE = 2;
const RUSH_PICKUP_DISTANCE = 0.5;
const RUSH_DECAY = 3;
const RUSH_MIN_SPEED = 8;

// 0 = not rushing, 1 = rush stop short, 2 = rush to pickup
export type RushMode = 0 | 1 | 2;

interface PlayerProps {
  positionRef: React.RefObject<THREE.Vector3 | null>;
  inputDir: React.RefObject<InputDirection>;
  rushMode: React.RefObject<RushMode>;
  rushTarget: React.RefObject<THREE.Vector3 | null>;
  hidden?: boolean;
  bodyShape?: CharacterBodyShape;
}

export function Player({ positionRef, inputDir, rushMode, rushTarget, hidden, bodyShape }: PlayerProps) {
  const shape = bodyShape ?? PLAYER_DEFAULTS;
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const headMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const armMatsRef = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isRushing = rushMode.current !== 0 && rushTarget.current;

    // Fade body, head + arms together while rushing
    if (matRef.current) {
      const targetOpacity = isRushing ? 0.3 : 1;
      for (const mat of [matRef.current, headMatRef.current, ...armMatsRef.current]) {
        if (!mat) continue;
        mat.opacity += (targetOpacity - mat.opacity) * 0.15;
        mat.transparent = mat.opacity < 1;
      }
    }

    if (isRushing) {
      const target = rushTarget.current!;
      const toTarget = new THREE.Vector3(
        target.x - groupRef.current.position.x,
        0,
        target.z - groupRef.current.position.z
      );
      const dist = toTarget.length();
      const stopDist = rushMode.current === 2 ? RUSH_PICKUP_DISTANCE : RUSH_ARRIVE_DISTANCE;

      if (dist < stopDist) {
        rushMode.current = 0;
      } else {
        const dir = toTarget.normalize();
        const speed = Math.max(dist * RUSH_DECAY, RUSH_MIN_SPEED);
        groupRef.current.position.addScaledVector(dir, speed * delta);
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    } else {
      const { x, z } = inputDir.current!;

      if (x !== 0 || z !== 0) {
        const direction = new THREE.Vector3(x, 0, z).normalize();
        groupRef.current.position.addScaledVector(direction, SPEED * delta);
        groupRef.current.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }

    if (positionRef.current) {
      positionRef.current.copy(groupRef.current.position);
    }
  });

  const { head, body, forearm, hand } = shape;
  const pos = computePositions(shape, PLAYER_BODY_CENTER_Y);
  const rot = handRotations(hand.open);
  const COLOR = shape.bodyColor;

  return (
    <group
      ref={groupRef}
      position={[positionRef.current?.x ?? 0, positionRef.current?.y ?? 0.75, positionRef.current?.z ?? 0]}
      visible={!hidden}
    >
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial ref={matRef} color={COLOR} transparent />
      </mesh>

      {/* Head */}
      <mesh position={[0, pos.headY, 0]} rotation={[deg2rad(head.rotation[0]), deg2rad(head.rotation[1]), deg2rad(head.rotation[2])]} castShadow>
        <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
        <meshStandardMaterial ref={headMatRef} color={COLOR} transparent />
      </mesh>
      <Eyes eyes={shape.eyes} headY={pos.headY} headRadius={head.radius} />

      {/* Left forearm */}
      <mesh position={[-pos.forearmX, pos.forearmCenterY, 0]} castShadow>
        <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
        <meshStandardMaterial ref={el => { armMatsRef.current[0] = el; }} color={COLOR} transparent />
      </mesh>

      {/* Left hand — Y and Z mirrored for natural symmetry */}
      <mesh position={[-pos.forearmX, pos.handCenterY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.left} castShadow>
        <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
        <meshStandardMaterial ref={el => { armMatsRef.current[1] = el; }} color={COLOR} transparent />
      </mesh>

      {/* Right forearm */}
      <mesh position={[pos.forearmX, pos.forearmCenterY, 0]} castShadow>
        <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
        <meshStandardMaterial ref={el => { armMatsRef.current[2] = el; }} color={COLOR} transparent />
      </mesh>

      {/* Right hand */}
      <mesh position={[pos.forearmX, pos.handCenterY, 0]} scale={[1, 1, hand.open.flattenZ]} rotation={rot.right} castShadow>
        <sphereGeometry args={[hand.open.radius, hand.open.widthSegments, hand.open.heightSegments]} />
        <meshStandardMaterial ref={el => { armMatsRef.current[3] = el; }} color={COLOR} transparent />
      </mesh>
    </group>
  );
}
