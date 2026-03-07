import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BotAnim } from "./PlayerBot";

interface NpcBotProps {
  position: [number, number, number];
  animation: BotAnim;
  visible?: boolean;
}

const PURPLE = "#9b59b6";
const BODY_SIZE = 0.14;

export function NpcBot({ position, animation, visible = true }: NpcBotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const animPhase = useRef(0);
  const scurryBob = useRef(0);
  const lookDir = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;
    timeRef.current += delta;
    const t = timeRef.current;

    switch (animation) {
      case "idle": {
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.01;
        groupRef.current.rotation.y = 0;
        break;
      }
      case "sniffing": {
        groupRef.current.rotation.x = Math.sin(t * 6) * 0.15;
        groupRef.current.position.y = position[1];
        break;
      }
      case "pointing": {
        groupRef.current.rotation.x = -0.3;
        groupRef.current.position.y = position[1];
        break;
      }
      case "scurrying": {
        scurryBob.current += delta * 16;
        groupRef.current.rotation.z = Math.sin(scurryBob.current) * 0.2;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(scurryBob.current * 0.5)) * 0.02;
        break;
      }
      case "dancing": {
        groupRef.current.rotation.y += delta * 6;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 8)) * 0.04;
        break;
      }
      case "dead": {
        groupRef.current.rotation.z = Math.PI / 2;
        groupRef.current.position.y = position[1];
        break;
      }
      case "celebrating": {
        groupRef.current.rotation.y += delta * 8;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 6)) * 0.06;
        break;
      }
      case "looking-around": {
        animPhase.current += delta;
        lookDir.current = Math.sin(animPhase.current * 1.5) * 1.2;
        groupRef.current.rotation.y = lookDir.current;
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.005;
        break;
      }
      case "nose-touch": {
        groupRef.current.rotation.x = -0.2;
        groupRef.current.position.y = position[1];
        break;
      }
    }
  });

  if (!visible) return null;

  const showXEyes = animation === "dead";

  return (
    <group ref={groupRef} position={position}>
      {/* Body — box */}
      <mesh position={[0, BODY_SIZE / 2, 0]} castShadow>
        <boxGeometry args={[BODY_SIZE, BODY_SIZE, BODY_SIZE]} />
        <meshStandardMaterial color={PURPLE} />
      </mesh>
      {/* Nose — cone pointing forward */}
      <mesh
        position={[0, BODY_SIZE / 2, -BODY_SIZE / 2 - 0.03]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <coneGeometry args={[0.03, 0.06, 8]} />
        <meshStandardMaterial color={PURPLE} />
      </mesh>

      {/* Eyes */}
      {!showXEyes ? (
        <>
          {/* Left eye white */}
          <mesh position={[-0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 + 0.01]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Left pupil */}
          <mesh position={[-0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 - 0.005]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          {/* Right eye white */}
          <mesh position={[0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 + 0.01]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Right pupil */}
          <mesh position={[0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 - 0.005]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </>
      ) : (
        <>
          {/* X eyes */}
          <XEye position={[-0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 - 0.005]} />
          <XEye position={[0.03, BODY_SIZE * 0.7, -BODY_SIZE / 2 - 0.005]} />
          {/* Tongue */}
          <mesh position={[0, BODY_SIZE * 0.3, -BODY_SIZE / 2 - 0.01]} rotation={[0.3, 0, 0]}>
            <planeGeometry args={[0.02, 0.03]} />
            <meshStandardMaterial color="#e74c3c" side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

function XEye({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.025, 0.004, 0.004]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.025, 0.004, 0.004]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}
