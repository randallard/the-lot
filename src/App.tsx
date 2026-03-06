import { useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { World } from "./world/World";
import { PickupCutscene } from "./overlay/PickupCutscene";
import { VirtualJoystick } from "./overlay/VirtualJoystick";
import { PocketView } from "./overlay/PocketView";
import { PocketButton } from "./overlay/PocketButton";
import { useInputDirection } from "./world/useInputDirection";

export default function App() {
  const [cutscene, setCutscene] = useState<string | null>(null);
  const [pocketOpen, setPocketOpen] = useState(false);
  const [inventory, setInventory] = useState<string[]>(["phone"]);
  const inputDir = useInputDirection();

  const handlePickup = useCallback(() => {
    setInventory((prev) => [...prev, "trinket"]);
    setCutscene("part1");
  }, []);

  const togglePocket = useCallback(() => {
    if (!cutscene) setPocketOpen((prev) => !prev);
  }, [cutscene]);

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
        <World onBotPartPickup={handlePickup} inputDir={inputDir} />
      </Canvas>

      <VirtualJoystick inputDir={inputDir} />
      <PocketButton onClick={togglePocket} />

      {cutscene === "part1" && (
        <PickupCutscene onDismiss={() => setCutscene(null)} />
      )}

      {pocketOpen && (
        <PocketView onClose={() => setPocketOpen(false)} inventory={inventory} />
      )}
    </div>
  );
}
