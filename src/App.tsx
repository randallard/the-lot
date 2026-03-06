import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { World } from "./world/World";
import { PickupCutscene } from "./overlay/PickupCutscene";
import { AssemblyCutscene } from "./overlay/AssemblyCutscene";
import { VirtualJoystick } from "./overlay/VirtualJoystick";
import { PocketView } from "./overlay/PocketView";
import { PocketButton } from "./overlay/PocketButton";
import { TrinketArrow } from "./overlay/TrinketArrow";
import { useInputDirection } from "./world/useInputDirection";
import type { TrinketTrackerState } from "./world/useTrinketTracker";
import type { RushMode } from "./world/Player";

export default function App() {
  const [cutscene, setCutscene] = useState<string | null>(null);
  const [part1CutsceneDone, setPart1CutsceneDone] = useState(false);
  const [pocketOpen, setPocketOpen] = useState(false);
  const [inventory, setInventory] = useState<string[]>(["phone"]);
  const inputDir = useInputDirection();
  const rushMode = useRef<RushMode>(0);
  const rushTarget = useRef<THREE.Vector3 | null>(null);
  const trinketTracker = useRef<TrinketTrackerState>({
    angle: 0,
    distance: 0,
    showArrow: false,
    screenX: 0.5,
    screenY: 0.5,
  });

  const handlePart1Pickup = useCallback(() => {
    rushMode.current = 0;
    setInventory((prev) => [...prev, "trinket"]);
    setCutscene("part1");
  }, []);

  const handlePart2Pickup = useCallback(() => {
    rushMode.current = 0;
    setCutscene("assembly");
  }, []);

  const handleAssemblyComplete = useCallback(() => {
    setInventory((prev) => {
      const next = prev.filter((i) => i !== "trinket");
      return [...next, "bot-parts"];
    });
    setCutscene(null);
  }, []);

  const togglePocket = useCallback(() => {
    if (!cutscene) setPocketOpen((prev) => !prev);
  }, [cutscene]);

  const handleRush = useCallback(() => {
    rushMode.current = 1;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") togglePocket();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePocket]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        <World
          onPart1Pickup={handlePart1Pickup}
          onPart2Pickup={handlePart2Pickup}
          part1CutsceneDone={part1CutsceneDone}
          inputDir={inputDir}
          rushMode={rushMode}
          rushTarget={rushTarget}
          trinketTracker={trinketTracker}
        />
      </Canvas>

      <VirtualJoystick inputDir={inputDir} />
      <PocketButton onClick={togglePocket} />
      <TrinketArrow tracker={trinketTracker} onRush={handleRush} />

      {cutscene === "part1" && (
        <PickupCutscene onDismiss={() => { setCutscene(null); setPart1CutsceneDone(true); }} />
      )}

      {cutscene === "assembly" && (
        <AssemblyCutscene onComplete={handleAssemblyComplete} />
      )}

      {pocketOpen && (
        <PocketView onClose={() => setPocketOpen(false)} inventory={inventory} />
      )}
    </div>
  );
}
