import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NpcProps {
  position: [number, number, number];
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onClick?: () => void;
}

export function Npc({ position, playerPosition, onClick }: NpcProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Face the player
  useFrame(() => {
    if (!groupRef.current || !playerPosition.current) return;
    const target = new THREE.Vector3(
      playerPosition.current.x,
      groupRef.current.position.y,
      playerPosition.current.z
    );
    groupRef.current.lookAt(target);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body — shorter capsule */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.3, 8, 16]} />
        <meshStandardMaterial color="#5a5a6e" />
      </mesh>

      {/* Head — same radius as body */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#5a5a6e" />
      </mesh>

      {/* Arm holding phone out toward player */}
      <group position={[-0.37, 0.7, 0.17]}>
        {/* Phone */}
        <mesh rotation={[-0.3, 0.4, 0]}>
          <boxGeometry args={[0.15, 0.25, 0.02]} />
          <meshStandardMaterial color="#c75b12" />
        </mesh>
        {/* Phone clickable hitbox — just barely bigger than the phone */}
        <mesh
          rotation={[-0.3, 0.4, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = "default"; }}
        >
          <boxGeometry args={[0.17, 0.27, 0.04]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  );
}
