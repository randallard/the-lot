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
  asleep?: boolean;
}

// Z bubble state
interface ZBubble {
  offset: number; // x offset
  phase: number; // animation phase 0-1
  speed: number;
}

const Z_COUNT = 3;

function makeZBubbles(): ZBubble[] {
  return Array.from({ length: Z_COUNT }, (_, i) => ({
    offset: (i - 1) * 0.3,
    phase: i / Z_COUNT,
    speed: 0.15 + i * 0.05,
  }));
}

export function GameNpc({
  position,
  bodyColor,
  playerPosition,
  onClick,
  screenPos,
  worldPosRef,
  asleep,
}: GameNpcProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const { camera } = useThree();
  const zBubbles = useRef<ZBubble[]>(makeZBubbles());
  const zMeshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Expose world position for tracker arrow
    if (worldPosRef) {
      (worldPosRef as React.MutableRefObject<THREE.Vector3 | null>).current =
        groupRef.current.position.clone();
    }

    // Track screen position for UI overlays
    const headY = asleep ? 0.5 : 0.9;
    const headPos = new THREE.Vector3(0, headY, -0.3);
    const worldPos = headPos.applyMatrix4(groupRef.current.matrixWorld);
    const projected = worldPos.project(camera);
    screenPos.current!.x = (projected.x + 1) / 2;
    screenPos.current!.y = (-projected.y + 1) / 2;
    screenPos.current!.visible = projected.z < 1;
    const topY = asleep ? 0.8 : 1.35;
    const headTop = new THREE.Vector3(0, topY, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    const feet = new THREE.Vector3(0, 0, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    screenPos.current!.screenHeight = Math.abs((-headTop.y + 1) / 2 - (-feet.y + 1) / 2) * window.innerHeight;

    // Face the player (freeze on hover, skip when asleep)
    if (!asleep && playerPosition.current && !hovered.current) {
      groupRef.current.lookAt(
        playerPosition.current.x,
        groupRef.current.position.y,
        playerPosition.current.z,
      );
    }

    // Animate Z bubbles
    if (asleep) {
      for (let i = 0; i < Z_COUNT; i++) {
        const z = zBubbles.current[i];
        z.phase = (z.phase + delta * z.speed) % 1;
        const mesh = zMeshes.current[i];
        if (mesh) {
          mesh.position.set(z.offset * 0.5, 0.6 + z.phase * 1.2, 0);
          const scale = 0.06 + z.phase * 0.08;
          mesh.scale.set(scale, scale, scale);
          (mesh.material as THREE.MeshStandardMaterial).opacity = 1 - z.phase;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {asleep ? (
        <>
          {/* Bed frame */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.9, 0.16, 1.4]} />
            <meshStandardMaterial color="#4a3728" />
          </mesh>

          {/* Mattress */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.8, 0.06, 1.2]} />
            <meshStandardMaterial color="#e8dcc8" />
          </mesh>

          {/* Pillow */}
          <mesh position={[0, 0.24, -0.4]} castShadow>
            <boxGeometry args={[0.45, 0.08, 0.25]} />
            <meshStandardMaterial color="#f0ece4" />
          </mesh>

          {/* Blanket (NPC's color) */}
          <mesh position={[0, 0.26, 0.1]} castShadow>
            <boxGeometry args={[0.7, 0.05, 0.8]} />
            <meshStandardMaterial color={bodyColor} />
          </mesh>

          {/* Head peeking out */}
          <mesh position={[0, 0.35, -0.3]} castShadow>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color={bodyColor} />
          </mesh>

          {/* Z bubbles */}
          {Array.from({ length: Z_COUNT }, (_, i) => (
            <mesh
              key={i}
              ref={(el) => { zMeshes.current[i] = el; }}
              position={[0, 0.6, 0]}
            >
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial
                color="#aaccff"
                transparent
                opacity={0.7}
              />
            </mesh>
          ))}
        </>
      ) : (
        <>
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
        </>
      )}

      {/* Clickable hitbox */}
      <mesh
        position={[0, asleep ? 0.3 : 0.6, 0]}
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
        <cylinderGeometry args={[0.8, 0.8, asleep ? 1 : 2, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
