import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { InputDirection } from "./useInputDirection";

const SPEED = 5;

interface PlayerProps {
  positionRef: React.RefObject<THREE.Vector3 | null>;
  inputDir: React.RefObject<InputDirection>;
}

export function Player({ positionRef, inputDir }: PlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const { x, z } = inputDir.current!;

    if (x !== 0 || z !== 0) {
      const direction = new THREE.Vector3(x, 0, z).normalize();
      meshRef.current.position.addScaledVector(direction, SPEED * delta);

      const angle = Math.atan2(direction.x, direction.z);
      meshRef.current.rotation.y = angle;
    }

    if (positionRef.current) {
      positionRef.current.copy(meshRef.current.position);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.75, 0]} castShadow>
      <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
      <meshStandardMaterial color="#444444" />
    </mesh>
  );
}
