import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface BotPartsProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onPickup?: () => void;
  rushMode: React.RefObject<number>;
}

const PICKUP_DISTANCE = 1.5;
const MIN_HIT_RADIUS = 0.16;
const MAX_HIT_RADIUS = 3;
const SCALE_START_DIST = 5;
const SCALE_END_DIST = 40;

export function BotParts({ position, rotation = [0.15, 0.4, 0.1], playerPosition, onPickup, rushMode }: BotPartsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const collected = useRef(false);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current || collected.current) return;

    if (playerPosition.current) {
      const dist = playerPosition.current.distanceTo(
        new THREE.Vector3(position[0], playerPosition.current.y, position[2])
      );

      if (dist < PICKUP_DISTANCE) {
        collected.current = true;
        meshRef.current.visible = false;
        if (hitRef.current) hitRef.current.visible = false;
        onPickup?.();
      }

      if (hitRef.current) {
        const camDist = camera.position.distanceTo(
          new THREE.Vector3(position[0], position[1], position[2])
        );
        const t = Math.min(1, Math.max(0, (camDist - SCALE_START_DIST) / (SCALE_END_DIST - SCALE_START_DIST)));
        const radius = MIN_HIT_RADIUS + t * (MAX_HIT_RADIUS - MIN_HIT_RADIUS);
        hitRef.current.scale.setScalar(radius);
      }
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={rotation} castShadow>
        <boxGeometry args={[0.2, 0.15, 0.2]} />
        <meshStandardMaterial color="#889099" roughness={0.8} metalness={0.3} />
      </mesh>

      <mesh
        ref={hitRef}
        onClick={() => { rushMode.current = 2; }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
