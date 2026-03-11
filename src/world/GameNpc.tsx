import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ScreenPos } from "./useScreenPosition";

interface GameNpcProps {
  position: [number, number, number];
  bodyColor: string;
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onClick?: () => void;
  screenPos: React.RefObject<ScreenPos>;
  worldPosRef?: React.RefObject<THREE.Vector3 | null>;
}

export function GameNpc({
  position,
  bodyColor,
  playerPosition,
  onClick,
  screenPos,
  worldPosRef,
}: GameNpcProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;

    // Expose world position for tracker arrow
    if (worldPosRef) {
      (worldPosRef as React.MutableRefObject<THREE.Vector3 | null>).current =
        groupRef.current.position.clone();
    }

    // Track screen position for UI overlays
    const headPos = new THREE.Vector3(0, 0.9, -0.3);
    const worldPos = headPos.applyMatrix4(groupRef.current.matrixWorld);
    const projected = worldPos.project(camera);
    screenPos.current!.x = (projected.x + 1) / 2;
    screenPos.current!.y = (-projected.y + 1) / 2;
    screenPos.current!.visible = projected.z < 1;
    // Screen height: project head top and feet
    const headTop = new THREE.Vector3(0, 1.35, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    const feet = new THREE.Vector3(0, 0, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    screenPos.current!.screenHeight = Math.abs((-headTop.y + 1) / 2 - (-feet.y + 1) / 2) * window.innerHeight;

    // Face the player (freeze on hover)
    if (playerPosition.current && !hovered.current) {
      groupRef.current.lookAt(
        playerPosition.current.x,
        groupRef.current.position.y,
        playerPosition.current.z,
      );
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.3, 8, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Clickable hitbox */}
      <mesh
        position={[0, 0.6, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
          hovered.current = true;
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
          hovered.current = false;
        }}
      >
        <cylinderGeometry args={[0.8, 0.8, 2, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
