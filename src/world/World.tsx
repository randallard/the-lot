import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Ground } from "./Ground";
import { Player } from "./Player";
import { CameraRig } from "./CameraRig";
import { BotParts } from "./BotParts";
import { Npc } from "./Npc";
import { useTrinketTracker, type TrinketTrackerState } from "./useTrinketTracker";
import type { RushMode } from "./Player";
import type { ScreenPos } from "./useScreenPosition";

const SPAWN_DELAY = 6000;
const PART1_POS = new THREE.Vector3(3, 0.08, -7);
const PART2_POS = new THREE.Vector3(-40, 0.08, -5);
const NPC_OFFSET = new THREE.Vector3(-0.7, 0, -0.3); // uncomfortably close, just to the left

const PART2_DELAY = 2000;
const NPC_WALK_AWAY_DIST = 6; // how far player must walk before NPC gives up
const NPC_APPROACH_DIST = 4; // how close player must be to trigger welcome back
const NPC_IDLE_TIME = 2; // seconds player must stand still near NPC

interface WorldProps {
  onPart1Pickup?: () => void;
  onPart2Pickup?: () => void;
  part1CutsceneDone: boolean;
  inputDir: React.RefObject<{ x: number; z: number }>;
  rushMode: React.RefObject<RushMode>;
  rushTarget: React.RefObject<THREE.Vector3 | null>;
  trinketTracker: React.RefObject<TrinketTrackerState>;
  showNpc: boolean;
  npcRelaxing: boolean;
  onNpcClick?: () => void;
  onNpcWalkAway?: () => void;
  onNpcApproach?: () => void;
  cameraOffset?: React.RefObject<THREE.Vector3 | null>;
  cameraLookAtOffset?: React.RefObject<THREE.Vector3 | null>;
  hidePlayer?: boolean;
  npcScreenPos: React.RefObject<ScreenPos>;
  playerScreenPos: React.RefObject<ScreenPos>;
}

export function World({ onPart1Pickup, onPart2Pickup, part1CutsceneDone, inputDir, rushMode, rushTarget, trinketTracker, showNpc, npcRelaxing, onNpcClick, onNpcWalkAway, onNpcApproach, cameraOffset, cameraLookAtOffset, hidePlayer, npcScreenPos, playerScreenPos }: WorldProps) {
  const playerPos = useRef(new THREE.Vector3(0, 0.75, 0));
  const [part1Spawned, setPart1Spawned] = useState(false);
  const [part1Collected, setPart1Collected] = useState(false);
  const [part2Spawned, setPart2Spawned] = useState(false);
  const [part2Collected, setPart2Collected] = useState(false);
  const npcPos = useRef<[number, number, number] | null>(null);
  const npcWorldPos = useRef<THREE.Vector3 | null>(null);
  const { camera } = useThree();

  // Capture NPC position when it first appears (relative to player)
  if (showNpc && !npcPos.current && playerPos.current) {
    npcPos.current = [
      playerPos.current.x + NPC_OFFSET.x,
      0,
      playerPos.current.z + NPC_OFFSET.z,
    ];
  }

  // Track player screen position
  useFrame(() => {
    if (!playerPos.current) return;
    const headPos = playerPos.current.clone();
    headPos.y += 0.8;
    const projected = headPos.project(camera);
    playerScreenPos.current!.x = (projected.x + 1) / 2;
    playerScreenPos.current!.y = (-projected.y + 1) / 2;
    playerScreenPos.current!.visible = projected.z < 1;
  });

  // Detect player walking away from NPC while phone is out
  const walkedAwayFired = useRef(false);
  useFrame(() => {
    if (!showNpc || npcRelaxing || !npcPos.current || walkedAwayFired.current) return;
    const dx = playerPos.current.x - npcPos.current[0];
    const dz = playerPos.current.z - npcPos.current[2];
    if (Math.sqrt(dx * dx + dz * dz) > NPC_WALK_AWAY_DIST) {
      walkedAwayFired.current = true;
      onNpcWalkAway?.();
    }
  });

  // Detect player approaching relaxing NPC and standing still
  const idleTimer = useRef(0);
  const lastPlayerPos = useRef(new THREE.Vector3());
  const approachFired = useRef(false);
  useFrame((_, delta) => {
    if (!showNpc || !npcRelaxing || !npcWorldPos.current || approachFired.current) return;
    const dx = playerPos.current.x - npcWorldPos.current.x;
    const dz = playerPos.current.z - npcWorldPos.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > NPC_APPROACH_DIST) {
      idleTimer.current = 0;
      return;
    }
    // Check if player is standing still
    const moved = lastPlayerPos.current.distanceTo(playerPos.current);
    lastPlayerPos.current.copy(playerPos.current);
    if (moved > 0.02) {
      idleTimer.current = 0;
      return;
    }
    idleTimer.current += delta;
    if (idleTimer.current >= NPC_IDLE_TIME) {
      approachFired.current = true;
      onNpcApproach?.();
    }
  });

  // Current tracking target
  const currentTarget = useRef<THREE.Vector3 | null>(null);

  // Spawn part 2 a couple seconds after the part 1 cutscene is dismissed
  useEffect(() => {
    if (part1CutsceneDone && !part2Spawned) {
      const timer = setTimeout(() => setPart2Spawned(true), PART2_DELAY);
      return () => clearTimeout(timer);
    }
  }, [part1CutsceneDone, part2Spawned]);

  // Update tracking target based on state (parts are static, so render-time is fine)
  if (!part1Collected && part1Spawned) {
    currentTarget.current = PART1_POS;
  } else if (part2Spawned && !part2Collected) {
    currentTarget.current = PART2_POS;
  } else if (!npcRelaxing) {
    currentTarget.current = null;
  }

  // NPC position updates every frame via ref — keep tracker synced
  useFrame(() => {
    if (npcRelaxing && npcWorldPos.current) {
      currentTarget.current = npcWorldPos.current;
    }
    rushTarget.current = currentTarget.current;
  });

  const trackerActive = (part1Spawned && !part1Collected) || (part2Spawned && !part2Collected) || npcRelaxing;
  useTrinketTracker(playerPos, currentTarget, trackerActive, trinketTracker);

  useEffect(() => {
    const timer = setTimeout(() => setPart1Spawned(true), SPAWN_DELAY);

    const handleInteract = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.code !== "Enter") return;
      setPart1Spawned(true);
    };

    window.addEventListener("keydown", handleInteract);
    window.addEventListener("click", handleInteract);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleInteract);
      window.removeEventListener("click", handleInteract);
    };
  }, []);

  const handlePart1Pickup = () => {
    setPart1Collected(true);
    onPart1Pickup?.();
  };

  const handlePart2Pickup = () => {
    setPart2Collected(true);
    onPart2Pickup?.();
  };

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <fog attach="fog" args={["#ffffff", 20, 60]} />

      <CameraRig target={playerPos} offset={cameraOffset} lookAtOffset={cameraLookAtOffset} />
      <Ground />
      <Player positionRef={playerPos} inputDir={inputDir} rushMode={rushMode} rushTarget={rushTarget} hidden={hidePlayer} />
      {part1Spawned && !part1Collected && (
        <BotParts
          position={[PART1_POS.x, PART1_POS.y, PART1_POS.z]}
          playerPosition={playerPos}
          onPickup={handlePart1Pickup}
          rushMode={rushMode}
        />
      )}
      {part2Spawned && !part2Collected && (
        <BotParts
          position={[PART2_POS.x, PART2_POS.y, PART2_POS.z]}
          rotation={[-0.1, 0.8, -0.2]}
          playerPosition={playerPos}
          onPickup={handlePart2Pickup}
          rushMode={rushMode}
        />
      )}
      {showNpc && npcPos.current && (
        <Npc
          position={npcPos.current}
          playerPosition={playerPos}
          onClick={onNpcClick}
          relaxing={npcRelaxing}
          screenPos={npcScreenPos}
          worldPosRef={npcWorldPos}
        />
      )}
    </>
  );
}
