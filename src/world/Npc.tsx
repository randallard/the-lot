import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ScreenPos } from "./useScreenPosition";
import {
  type CharacterBodyShape,
  NPC_DEFAULTS,
  NPC_BODY_CENTER_Y,
  computePositions,
  handRotations,
  deg2rad,
} from "../services/body-shapes";
import { Eyes } from "./Eyes";
import type { WheelPointerEvent } from "../overlay/useWheelGesture";

// NPC behavior: idle → walking-to-camp → sitting → sipping → getting-uke → playing-uke
export type NpcBehavior =
  | "idle"
  | "walking-to-camp"
  | "sitting"
  | "sipping"
  | "getting-uke"
  | "playing-uke";

interface NpcProps {
  position: [number, number, number];
  /**
   * Which authored hand shape to draw — see `Player`'s note. A fist bump is solved on the
   * closed hand's radius, so it has to be drawn on it too.
   */
  handPose?: "open" | "closed";
  playerPosition: React.RefObject<THREE.Vector3 | null>;
  onClick?: () => void;
  relaxing: boolean;
  talking: boolean;
  screenPos: React.RefObject<ScreenPos>;
  worldPosRef?: React.RefObject<THREE.Vector3 | null>;
  bodyShape?: CharacterBodyShape;
  /**
   * **Forearm** groups, for a driver that needs to pose this NPC's arms — the fist
   * bump. Same shape `Dancer` takes, and unset for every NPC nobody is posing.
   *
   * Named for what they are, per ADR-0017: the shoulder above each one is pinned and
   * has no ref, so this is a handle on the elbow and everything below it. It was called
   * `arms` when it *was* the shoulder, and a driver moving it is what put a forearm's
   * near end inside a torso.
   */
  forearms?: { left: React.RefObject<THREE.Group | null>; right: React.RefObject<THREE.Group | null> };
  /**
   * Set while a driver owns this NPC's **placement** — an authored move stepping them
   * into position (ADR-0018).
   *
   * The whole behaviour loop stands down while it is set. This component writes position
   * for its walk targets *and* rotation for its look-at, and both are transforms the
   * driver is writing from its own frame loop — the same owned-channel contract the arms
   * already use, one level up.
   */
  drivenBody?: React.RefObject<boolean>;
  /** The whole character group, for a driver that needs this NPC's yaw as well as position. */
  rigRef?: React.RefObject<THREE.Group | null>;
  /**
   * `useWheelGesture`'s handlers, spread onto the hitbox so a **hold** opens the
   * interaction wheel (ADR-0015) while a **tap** still falls through to `onClick`.
   * The two coexist by construction: the gesture only claims the pointer once its
   * hold elapses.
   */
  wheelHandlers?: {
    onPointerDown: (e: WheelPointerEvent) => void;
    onPointerMove: (e: WheelPointerEvent) => void;
    onPointerUp: (e: WheelPointerEvent) => void;
    onPointerCancel: (e: WheelPointerEvent) => void;
  };
}

const WALK_SPEED = 1.5;
const SIP_INTERVAL = 4000;
const UKE_DELAY = 12000;

export function Npc({ position, playerPosition, onClick, relaxing, talking, screenPos, worldPosRef, bodyShape, forearms, drivenBody, rigRef, wheelHandlers, handPose = "open" }: NpcProps) {
  const shape = bodyShape ?? NPC_DEFAULTS;
  const ownGroup = useRef<THREE.Group>(null);
  const groupRef = rigRef ?? ownGroup;
  const hovered = useRef(false);
  const [behavior, setBehavior] = useState<NpcBehavior>("idle");
  const [campPos, setCampPos] = useState<THREE.Vector3 | null>(null);
  const walkTarget = useRef<THREE.Vector3 | null>(null);

  const [sipping, setSipping] = useState(false);
  const initialRelaxing = useRef(relaxing);
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
    // Screen height: project head top and feet
    const headTop = new THREE.Vector3(0, 1.35, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    const feet = new THREE.Vector3(0, 0, 0).applyMatrix4(groupRef.current.matrixWorld).project(camera);
    screenPos.current!.screenHeight = Math.abs((-headTop.y + 1) / 2 - (-feet.y + 1) / 2) * window.innerHeight;
  });

  // When relaxing starts, compute camp position based on player direction
  useEffect(() => {
    console.log("[npc] relaxing effect:", relaxing, "campPos:", !!campPos);
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

    if (initialRelaxing.current) {
      // Was relaxing from mount (e.g. page reload) — teleport to camp
      groupRef.current.position.set(camp.x, 0, camp.z);
      setBehavior("sitting");
    } else {
      // Just started relaxing — walk to camp
      walkTarget.current = camp;
      setBehavior("walking-to-camp");
    }
  }, [relaxing, campPos, playerPosition, groupRef]);

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

    // A driver owns this NPC's placement — position *and* heading. Stand down completely
    // rather than skipping the walk alone: the look-at below writes rotation, which is
    // exactly what an approach's turn is writing.
    if (drivenBody?.current === true) return;

    // When talking or hovered, just face the player and freeze all other movement
    if (talking || hovered.current) {
      if (playerPosition.current) {
        const target = new THREE.Vector3(
          playerPosition.current.x,
          groupRef.current.position.y,
          playerPosition.current.z
        );
        groupRef.current.lookAt(target);
      }
      return;
    }

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
    } else if (behavior === "idle" || behavior === "sitting") {
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

  const showCoffee = behavior === "sitting" || behavior === "sipping";
  const showUke = behavior === "playing-uke" && !walkTarget.current;

  const npcColor = shape.bodyColor;
  const { head, body, forearm, hand } = shape;
  const pos = computePositions(shape, NPC_BODY_CENTER_Y, handPose);
  const activeHand = hand[handPose];
  const rot = handRotations(activeHand);
  // Mesh heights relative to the **elbow** the forearm group sits on, which in turn
  // hangs at `elbowY − shoulderY` inside the pinned shoulder group. The two offsets
  // compose back to the rest heights the meshes always had (ADR-0017).
  const elbowLocalY = pos.elbowY - pos.shoulderY;
  const forearmLocalY = pos.forearmCenterY - pos.elbowY;
  const handLocalY = pos.handCenterY - pos.elbowY;

  return (
    <>
      <group ref={groupRef} position={position}>
        {/* Body */}
        <mesh position={[0, NPC_BODY_CENTER_Y, 0]} rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]} castShadow>
          <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
          <meshStandardMaterial color={npcColor} />
        </mesh>

        {/* Head */}
        <mesh position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]} rotation={[deg2rad(head.rotation[0]), deg2rad(head.rotation[1]), deg2rad(head.rotation[2])]} castShadow>
          <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
          <meshStandardMaterial color={npcColor} />
        </mesh>
        <Eyes eyes={shape.eyes} headY={pos.headY + head.offsetY} headRadius={head.radius} headOffsetX={head.offsetX} headOffsetZ={head.offsetZ} />

        {/* Arms, each a **pinned shoulder** with a forearm hanging inside it.

            Reparented from four loose meshes 2026-07-29, split into two groups
            2026-08-15 (ADR-0017), and **the rest pose is unchanged by construction**
            both times: the shoulder group sits at the shoulder, the forearm group at
            the elbow, and the meshes keep their old world heights as offsets that
            compose. Nothing moves until something poses the inner group.

            The outer group carries no ref on purpose. `forearms` is the only handle a
            driver gets, so a pose can bend the elbow and cannot move the shoulder — the
            defect that put the forearm's near end inside the torso at bump range was a
            driver writing the shoulder's own position. Rest hangs down local −y, which
            is the frame `arm-pose` and `fist-bump` assume. */}
        <group position={[-pos.forearmX, pos.shoulderY, 0]}>
          <group ref={forearms?.left} position={[0, elbowLocalY, 0]}>
            <mesh position={[0, forearmLocalY, 0]} castShadow>
              <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
              <meshStandardMaterial color={npcColor} />
            </mesh>
            <mesh position={[0, handLocalY, 0]} scale={[1, 1, activeHand.flattenZ]} rotation={rot.left} castShadow>
              <sphereGeometry args={[activeHand.radius, activeHand.widthSegments, activeHand.heightSegments]} />
              <meshStandardMaterial color={npcColor} />
            </mesh>
          </group>
        </group>

        <group position={[pos.forearmX, pos.shoulderY, 0]}>
          <group ref={forearms?.right} position={[0, elbowLocalY, 0]}>
            <mesh position={[0, forearmLocalY, 0]} castShadow>
              <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
              <meshStandardMaterial color={npcColor} />
            </mesh>
            <mesh position={[0, handLocalY, 0]} scale={[1, 1, activeHand.flattenZ]} rotation={rot.right} castShadow>
              <sphereGeometry args={[activeHand.radius, activeHand.widthSegments, activeHand.heightSegments]} />
              <meshStandardMaterial color={npcColor} />
            </mesh>
          </group>
        </group>

        {/* Clickable hitbox */}
        <mesh
          position={[0, 0.6, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          {...wheelHandlers}
          onPointerOver={() => { document.body.style.cursor = "pointer"; hovered.current = true; }}
          onPointerOut={() => { document.body.style.cursor = "default"; hovered.current = false; }}
        >
          <cylinderGeometry args={[0.8, 0.8, 2, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>

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
