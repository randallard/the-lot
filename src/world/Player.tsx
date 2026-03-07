import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { InputDirection } from "./useInputDirection";

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
}

export function Player({ positionRef, inputDir, rushMode, rushTarget, hidden }: PlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Don't process movement when hidden (e.g. during tutorial-3d)
    if (hidden) {
      if (positionRef.current) positionRef.current.copy(meshRef.current.position);
      return;
    }

    const isRushing = rushMode.current !== 0 && rushTarget.current;

    // Incorporeal while rushing
    if (matRef.current) {
      const targetOpacity = isRushing ? 0.3 : 1;
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.15;
      matRef.current.transparent = matRef.current.opacity < 1;
    }

    if (isRushing) {
      const target = rushTarget.current!;
      const toTarget = new THREE.Vector3(
        target.x - meshRef.current.position.x,
        0,
        target.z - meshRef.current.position.z
      );
      const dist = toTarget.length();
      const stopDist = rushMode.current === 2 ? RUSH_PICKUP_DISTANCE : RUSH_ARRIVE_DISTANCE;

      if (dist < stopDist) {
        rushMode.current = 0;
      } else {
        const dir = toTarget.normalize();
        const speed = Math.max(dist * RUSH_DECAY, RUSH_MIN_SPEED);
        meshRef.current.position.addScaledVector(dir, speed * delta);
        meshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    } else {
      const { x, z } = inputDir.current!;

      if (x !== 0 || z !== 0) {
        const direction = new THREE.Vector3(x, 0, z).normalize();
        meshRef.current.position.addScaledVector(direction, SPEED * delta);
        meshRef.current.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }

    if (positionRef.current) {
      positionRef.current.copy(meshRef.current.position);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.75, 0]} castShadow visible={!hidden}>
      <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
      <meshStandardMaterial ref={matRef} color="#444444" transparent />
    </mesh>
  );
}
