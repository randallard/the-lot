import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type BotAnim =
  | "idle"
  | "sniffing"
  | "pointing"
  | "scurrying"
  | "dancing"
  | "dead"
  | "celebrating"
  | "looking-around"
  | "nose-touch";

interface PlayerBotProps {
  position: [number, number, number];
  animation: BotAnim;
  visible?: boolean;
}

const BLUE = "#4a90e2";
const BODY_HEIGHT = 0.18;
const BODY_RADIUS = 0.08;

export function PlayerBot({ position, animation, visible = true }: PlayerBotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const animPhase = useRef(0);
  // For scurrying lerp
  const scurryBob = useRef(0);
  // For looking-around rotation
  const lookDir = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;
    timeRef.current += delta;
    const t = timeRef.current;

    switch (animation) {
      case "idle": {
        // Gentle bob
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.01;
        groupRef.current.rotation.y = 0;
        break;
      }
      case "sniffing": {
        // Quick nod forward/back
        groupRef.current.rotation.x = Math.sin(t * 6) * 0.15;
        groupRef.current.position.y = position[1];
        break;
      }
      case "pointing": {
        // Lean forward, hold still
        groupRef.current.rotation.x = -0.3;
        groupRef.current.position.y = position[1];
        break;
      }
      case "scurrying": {
        // Fast bob side-to-side
        scurryBob.current += delta * 16;
        groupRef.current.rotation.z = Math.sin(scurryBob.current) * 0.2;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(scurryBob.current * 0.5)) * 0.02;
        break;
      }
      case "dancing": {
        // Spin + bounce
        groupRef.current.rotation.y += delta * 6;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 8)) * 0.04;
        break;
      }
      case "dead": {
        // Tip over on side
        groupRef.current.rotation.z = Math.PI / 2;
        groupRef.current.position.y = position[1];
        break;
      }
      case "celebrating": {
        // Jump + spin
        groupRef.current.rotation.y += delta * 8;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 6)) * 0.06;
        break;
      }
      case "looking-around": {
        // Rotate back and forth slowly
        animPhase.current += delta;
        lookDir.current = Math.sin(animPhase.current * 1.5) * 1.2;
        groupRef.current.rotation.y = lookDir.current;
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.005;
        break;
      }
      case "nose-touch": {
        // Lean forward
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
      {/* Body — teardrop: cone + half sphere on top */}
      <mesh position={[0, BODY_HEIGHT / 2, 0]} castShadow>
        <coneGeometry args={[BODY_RADIUS, BODY_HEIGHT, 12]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>
      {/* Rounded top (nose area) */}
      <mesh position={[0, BODY_HEIGHT, 0]} castShadow>
        <sphereGeometry args={[BODY_RADIUS, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={BLUE} />
      </mesh>

      {/* Eyes */}
      {!showXEyes ? (
        <>
          {/* Left eye white */}
          <mesh position={[-0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS + 0.01]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Left pupil */}
          <mesh position={[-0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS - 0.005]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          {/* Right eye white */}
          <mesh position={[0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS + 0.01]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Right pupil */}
          <mesh position={[0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS - 0.005]}>
            <sphereGeometry args={[0.01, 6, 6]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </>
      ) : (
        <>
          {/* X eyes — two crossed thin boxes per eye */}
          <XEye position={[-0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS - 0.005]} />
          <XEye position={[0.03, BODY_HEIGHT * 0.75, -BODY_RADIUS - 0.005]} />
          {/* Tongue */}
          <mesh position={[0, BODY_HEIGHT * 0.45, -BODY_RADIUS - 0.01]} rotation={[0.3, 0, 0]}>
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
