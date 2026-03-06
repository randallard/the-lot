import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ScreenPos } from "./useScreenPosition";

// NPC behavior: phone-out → walking-to-camp → sitting → sipping → getting-uke → playing-uke
export type NpcBehavior =
  | "phone-out"
  | "walking-to-camp"
  | "sitting"
  | "sipping"
  | "getting-uke"
  | "playing-uke";

interface NpcProps {
  position: [number, number, number];
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onClick?: () => void;
  relaxing: boolean;
  screenPos: React.RefObject<ScreenPos>;
  worldPosRef?: React.RefObject<THREE.Vector3 | null>;
}

const WALK_SPEED = 1.5;
const SIP_INTERVAL = 4000;
const UKE_DELAY = 12000;

export function Npc({ position, playerPosition, onClick, relaxing, screenPos, worldPosRef }: NpcProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [behavior, setBehavior] = useState<NpcBehavior>("phone-out");
  const [campPos, setCampPos] = useState<THREE.Vector3 | null>(null);
  const walkTarget = useRef<THREE.Vector3 | null>(null);
  const sipTimer = useRef(0);
  const [sipping, setSipping] = useState(false);
  const { camera } = useThree();

  // Track screen position for speech bubble pointing (mouth area)
  useFrame(() => {
    if (!groupRef.current) return;
    // Expose world position for tracker arrow
    if (worldPosRef) {
      (worldPosRef as React.MutableRefObject<THREE.Vector3 | null>).current = groupRef.current.position.clone();
    }
    // Mouth position: head center (y=1.05) minus a bit, offset forward toward player
    const mouthLocal = new THREE.Vector3(0, 0.9, -0.3);
    const mouthWorld = mouthLocal.applyMatrix4(groupRef.current.matrixWorld);
    const projected = mouthWorld.project(camera);
    screenPos.current!.x = (projected.x + 1) / 2;
    screenPos.current!.y = (-projected.y + 1) / 2;
    screenPos.current!.visible = projected.z < 1;
  });

  // When relaxing starts, compute camp position based on player direction
  useEffect(() => {
    if (!relaxing || campPos) return;
    if (!playerPosition.current || !groupRef.current) return;

    const npcWorldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(npcWorldPos);
    const playerPos = playerPosition.current;

    // Direction player is facing (away from NPC)
    const dir = new THREE.Vector3()
      .subVectors(playerPos, npcWorldPos)
      .normalize();

    // Camp goes perpendicular-ish to the right of the NPC, 20 units away
    const perpDir = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const camp = npcWorldPos.clone().addScaledVector(perpDir, 20);
    setCampPos(camp);
    walkTarget.current = camp;
    setBehavior("walking-to-camp");
  }, [relaxing, campPos, playerPosition]);

  // Sipping timer
  useEffect(() => {
    if (behavior !== "sitting") return;
    const interval = setInterval(() => {
      setSipping(true);
      setTimeout(() => setSipping(false), 1500);
    }, SIP_INTERVAL);
    return () => clearInterval(interval);
  }, [behavior]);

  // Get ukulele after sitting for a while
  useEffect(() => {
    if (behavior !== "sitting") return;
    const t = setTimeout(() => setBehavior("getting-uke"), UKE_DELAY);
    return () => clearTimeout(t);
  }, [behavior]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (behavior === "walking-to-camp" && walkTarget.current) {
      const pos = groupRef.current.position;
      const toTarget = new THREE.Vector3(
        walkTarget.current.x - pos.x,
        0,
        walkTarget.current.z - pos.z
      );
      const dist = toTarget.length();

      if (dist < 0.3) {
        // Arrived at camp
        if (behavior === "walking-to-camp") {
          setBehavior("sitting");
        }
      } else {
        const dir = toTarget.normalize();
        pos.addScaledVector(dir, WALK_SPEED * delta);
        groupRef.current.lookAt(
          pos.x + dir.x, pos.y, pos.z + dir.z
        );
      }
    } else if (behavior === "getting-uke" && campPos) {
      // Walk to tent (tent is 3 units behind camp chair)
      const tentPos = campPos.clone().add(new THREE.Vector3(3, 0, 2));
      const pos = groupRef.current.position;
      const toTent = new THREE.Vector3(tentPos.x - pos.x, 0, tentPos.z - pos.z);
      const dist = toTent.length();

      if (dist < 0.3) {
        // Got the uke, walk back
        setBehavior("playing-uke");
        walkTarget.current = campPos;
      } else {
        const dir = toTent.normalize();
        pos.addScaledVector(dir, WALK_SPEED * delta);
        groupRef.current.lookAt(pos.x + dir.x, pos.y, pos.z + dir.z);
      }
    } else if (behavior === "playing-uke" && walkTarget.current) {
      const pos = groupRef.current.position;
      const toTarget = new THREE.Vector3(
        walkTarget.current.x - pos.x, 0, walkTarget.current.z - pos.z
      );
      if (toTarget.length() > 0.3) {
        const dir = toTarget.normalize();
        pos.addScaledVector(dir, WALK_SPEED * delta);
        groupRef.current.lookAt(pos.x + dir.x, pos.y, pos.z + dir.z);
      } else {
        walkTarget.current = null;
        // Gentle sway while playing
        groupRef.current.rotation.y += Math.sin(Date.now() * 0.002) * 0.003;
      }
    } else if (behavior === "phone-out" || behavior === "sitting") {
      // Face the player
      if (playerPosition.current) {
        const target = new THREE.Vector3(
          playerPosition.current.x,
          groupRef.current.position.y,
          playerPosition.current.z
        );
        groupRef.current.lookAt(target);
      }
    }
  });

  const showPhone = behavior === "phone-out";
  const showCoffee = behavior === "sitting" || behavior === "sipping";
  const showUke = behavior === "playing-uke" && !walkTarget.current;

  return (
    <>
      <group ref={groupRef} position={position}>
        {/* Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.3, 8, 16]} />
          <meshStandardMaterial color="#5a5a6e" />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color="#5a5a6e" />
        </mesh>

        {/* Phone (only when offering) */}
        {showPhone && (
          <>
            <group position={[-0.37, 0.7, 0.17]}>
              <mesh rotation={[-0.3, 0.4, 0]}>
                <boxGeometry args={[0.15, 0.25, 0.02]} />
                <meshStandardMaterial color="#c75b12" />
              </mesh>
            </group>
            {/* Generous hitbox covering NPC + phone */}
            <mesh
              position={[0, 0.6, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              onPointerOver={() => { document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = "default"; }}
            >
              <cylinderGeometry args={[0.8, 0.8, 2, 12]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          </>
        )}

        {/* Coffee cup (when sitting) */}
        {showCoffee && (
          <group position={[-0.35, sipping ? 0.85 : 0.5, -0.2]}>
            <mesh>
              <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
              <meshStandardMaterial color="#f5f0e8" />
            </mesh>
            {/* Smiley face */}
            <mesh position={[0, 0, 0.061]} rotation={[0, 0, 0]}>
              <planeGeometry args={[0.08, 0.08]} />
              <meshStandardMaterial color="#e8b800" />
            </mesh>
          </group>
        )}

        {/* Ukulele (when playing) */}
        {showUke && (
          <group position={[0, 0.55, -0.25]} rotation={[0.4, 0.3, 0.6]}>
            {/* Body */}
            <mesh>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial color="#c4883c" />
            </mesh>
            {/* Neck */}
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.03, 0.25, 0.02]} />
              <meshStandardMaterial color="#8b6914" />
            </mesh>
          </group>
        )}

        {/* Clickable hitbox (when not holding phone — click body to talk) */}
        {!showPhone && (
          <mesh
            position={[0, 0.6, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            onPointerOver={() => { document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = "default"; }}
          >
            <cylinderGeometry args={[0.8, 0.8, 2, 12]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        )}
      </group>

      {/* Camp scene */}
      {campPos && <Camp position={campPos} />}
    </>
  );
}

function Camp({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Camp chair — low, angled back */}
      <group position={[0, 0, 0]}>
        {/* Seat */}
        <mesh position={[0, 0.3, 0]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.4]} />
          <meshStandardMaterial color="#3a6b4a" />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.55, 0.18]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.5, 0.45, 0.03]} />
          <meshStandardMaterial color="#3a6b4a" />
        </mesh>
        {/* Legs */}
        {[[-0.2, 0, -0.15], [0.2, 0, -0.15], [-0.2, 0, 0.15], [0.2, 0, 0.15]].map((p, i) => (
          <mesh key={i} position={[p[0], 0.15, p[2]]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
            <meshStandardMaterial color="#666" />
          </mesh>
        ))}
      </group>

      {/* Stump — off to the side */}
      <group position={[0.8, 0, 0.2]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.36, 12]} />
          <meshStandardMaterial color="#6b4c2a" roughness={0.9} />
        </mesh>
        {/* Tree rings on top */}
        <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 12]} />
          <meshStandardMaterial color="#8b6b3a" />
        </mesh>

        {/* Coffee cup on stump (initial position — NPC picks it up) */}
      </group>

      {/* Campfire — between chair and stump */}
      <Campfire position={[0.4, 0, -0.4]} />

      {/* Tent — behind the chair */}
      <group position={[3, 0, 2]}>
        {/* A-frame tent shape */}
        <mesh position={[0, 0.5, 0]} rotation={[0, 0.3, 0]}>
          <coneGeometry args={[0.8, 1, 4]} />
          <meshStandardMaterial color="#7a6b5a" roughness={0.8} />
        </mesh>
        {/* Door flap (darker) */}
        <mesh position={[-0.3, 0.25, -0.45]} rotation={[0.1, 0.3, 0]}>
          <planeGeometry args={[0.4, 0.5]} />
          <meshStandardMaterial color="#5a4b3a" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

const SMOKE_COUNT = 6;

function Campfire({ position }: { position: [number, number, number] }) {
  const smokeRefs = useRef<THREE.Mesh[]>([]);
  const smokeData = useRef(
    Array.from({ length: SMOKE_COUNT }, (_, i) => ({
      offset: (i / SMOKE_COUNT) * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  useFrame((_, delta) => {
    smokeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = smokeData.current[i];
      // Rise and reset
      mesh.position.y += d.speed * delta;
      if (mesh.position.y > 1.2) mesh.position.y = 0.25;
      // Drift sideways
      mesh.position.x = Math.sin(Date.now() * 0.001 + d.offset) * 0.08;
      // Fade as it rises
      const t = (mesh.position.y - 0.25) / 0.95;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.35 * (1 - t);
      // Grow as it rises
      const s = 0.04 + t * 0.08;
      mesh.scale.set(s / 0.06, s / 0.06, s / 0.06);
    });
  });

  return (
    <group position={position}>
      {/* Fire ring — stones */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.18, 0.04, Math.sin(a) * 0.18]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color="#888" roughness={1} />
          </mesh>
        );
      })}
      {/* Logs */}
      <mesh position={[0, 0.06, 0]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#4a3520" />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[0, -0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#4a3520" />
      </mesh>
      {/* Flames */}
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshStandardMaterial color="#e85d04" emissive="#e85d04" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.03, 0.12, 0.02]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial color="#faa307" emissive="#faa307" emissiveIntensity={0.6} />
      </mesh>
      {/* Warm glow */}
      <pointLight position={[0, 0.2, 0]} color="#ff8c42" intensity={0.6} distance={3} />
      {/* Smoke puffs */}
      {Array.from({ length: SMOKE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) smokeRefs.current[i] = el; }}
          position={[0, 0.25 + (i / SMOKE_COUNT) * 0.95, 0]}
        >
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#aaa" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}
