import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Ground } from "./Ground";
import { Player } from "./Player";
import { CameraRig } from "./CameraRig";
import { BotParts } from "./BotParts";

const SPAWN_DELAY = 6000;

interface WorldProps {
  onBotPartPickup?: () => void;
  inputDir: React.RefObject<{ x: number; z: number }>;
}

export function World({ onBotPartPickup, inputDir }: WorldProps) {
  const playerPos = useRef(new THREE.Vector3(0, 0.75, 0));
  const [partSpawned, setPartSpawned] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPartSpawned(true), SPAWN_DELAY);

    const handleInteract = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.code !== "Enter") return;
      setPartSpawned(true);
    };

    window.addEventListener("keydown", handleInteract);
    window.addEventListener("click", handleInteract);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleInteract);
      window.removeEventListener("click", handleInteract);
    };
  }, []);

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
      <Player positionRef={playerPos} inputDir={inputDir} />
      {partSpawned && (
        <BotParts playerPosition={playerPos} onPickup={onBotPartPickup} />
      )}
    </>
  );
}
