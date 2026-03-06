import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Ground } from "./Ground";
import { Player } from "./Player";
import { CameraRig } from "./CameraRig";
import { BotParts } from "./BotParts";
import { useTrinketTracker, type TrinketTrackerState } from "./useTrinketTracker";
import type { RushMode } from "./Player";

const SPAWN_DELAY = 6000;
const PART1_POS = new THREE.Vector3(3, 0.08, -7);
const PART2_POS = new THREE.Vector3(-40, 0.08, -5);

const PART2_DELAY = 2000;

interface WorldProps {
  onPart1Pickup?: () => void;
  onPart2Pickup?: () => void;
  part1CutsceneDone: boolean;
  inputDir: React.RefObject<{ x: number; z: number }>;
  rushMode: React.RefObject<RushMode>;
  rushTarget: React.RefObject<THREE.Vector3 | null>;
  trinketTracker: React.RefObject<TrinketTrackerState>;
}

export function World({ onPart1Pickup, onPart2Pickup, part1CutsceneDone, inputDir, rushMode, rushTarget, trinketTracker }: WorldProps) {
  const playerPos = useRef(new THREE.Vector3(0, 0.75, 0));
  const [part1Spawned, setPart1Spawned] = useState(false);
  const [part1Collected, setPart1Collected] = useState(false);
  const [part2Spawned, setPart2Spawned] = useState(false);
  const [part2Collected, setPart2Collected] = useState(false);

  // Current tracking target
  const currentTarget = useRef<THREE.Vector3 | null>(null);

  // Spawn part 2 a couple seconds after the part 1 cutscene is dismissed
  useEffect(() => {
    if (part1CutsceneDone && !part2Spawned) {
      const timer = setTimeout(() => setPart2Spawned(true), PART2_DELAY);
      return () => clearTimeout(timer);
    }
  }, [part1CutsceneDone, part2Spawned]);

  // Update tracking target based on state
  if (!part1Collected && part1Spawned) {
    currentTarget.current = PART1_POS;
  } else if (part2Spawned && !part2Collected) {
    currentTarget.current = PART2_POS;
  } else {
    currentTarget.current = null;
  }

  // Also set as rush target
  rushTarget.current = currentTarget.current;

  const trackerActive = (part1Spawned && !part1Collected) || (part2Spawned && !part2Collected);
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

      <CameraRig target={playerPos} />
      <Ground />
      <Player positionRef={playerPos} inputDir={inputDir} rushMode={rushMode} rushTarget={rushTarget} />
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
    </>
  );
}
