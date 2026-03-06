import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BotPartsProps {
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onPickup?: () => void;
}

const PICKUP_DISTANCE = 1.5;

export function BotParts({ playerPosition, onPickup }: BotPartsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const collected = useRef(false);

  useFrame(() => {
    if (!meshRef.current || collected.current) return;

    if (playerPosition.current) {
      const dist = playerPosition.current.distanceTo(
        new THREE.Vector3(
          meshRef.current.position.x,
          playerPosition.current.y,
          meshRef.current.position.z
        )
      );
      if (dist < PICKUP_DISTANCE) {
        collected.current = true;
        meshRef.current.visible = false;
        onPickup?.();
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[3, 0.08, -7]}
      rotation={[0.15, 0.4, 0.1]}
      castShadow
    >
      <boxGeometry args={[0.2, 0.15, 0.2]} />
      <meshStandardMaterial color="#889099" roughness={0.8} metalness={0.3} />
    </mesh>
  );
}
