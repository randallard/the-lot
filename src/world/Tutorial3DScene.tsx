import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PlayerBot } from "./PlayerBot";
import { NpcBot } from "./NpcBot";
import { TutorialGrid } from "./TutorialGrid";
import { Cheese3D } from "./Cheese3D";
import { TUTORIAL_3D_STEPS } from "./tutorialSteps";

interface Tutorial3DSceneProps {
  step: number;
  origin: [number, number, number]; // captured player position at mount time
  cameraOffset: React.RefObject<THREE.Vector3 | null>;
  cameraLookAtOffset: React.RefObject<THREE.Vector3 | null>;
}

export function Tutorial3DScene({
  step,
  origin,
  cameraOffset,
  cameraLookAtOffset,
}: Tutorial3DSceneProps) {
  const cfg = TUTORIAL_3D_STEPS[step];
  if (!cfg) return null;

  // Lerp targets for bot positions
  const playerBotPos = useRef(new THREE.Vector3());
  const npcBotPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  // Update camera offset from step config
  useEffect(() => {
    if (!cfg) return;
    cameraOffset.current = new THREE.Vector3(...cfg.camera.offset);
    cameraLookAtOffset.current = new THREE.Vector3(...cfg.camera.lookAt);
  }, [step, cfg, cameraOffset, cameraLookAtOffset]);

  // Set initial positions without lerp, then lerp on subsequent changes
  useEffect(() => {
    if (!initialized.current) {
      if (cfg.playerBot) {
        playerBotPos.current.set(...cfg.playerBot.position);
      }
      if (cfg.npcBot) {
        npcBotPos.current.set(...cfg.npcBot.position);
      }
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lerp bot positions toward step targets
  useFrame((_, delta) => {
    if (!cfg) return;
    const lerpFactor = 1 - Math.exp(-6 * delta);

    if (cfg.playerBot) {
      const target = new THREE.Vector3(...cfg.playerBot.position);
      playerBotPos.current.lerp(target, lerpFactor);
    }
    if (cfg.npcBot) {
      const target = new THREE.Vector3(...cfg.npcBot.position);
      npcBotPos.current.lerp(target, lerpFactor);
    }
  });

  const ox = origin[0];
  const oy = origin[1];
  const oz = origin[2];

  return (
    <group position={[ox, oy, oz]}>
      {/* Player Bot */}
      {cfg.playerBot && (
        <PlayerBot
          position={[
            playerBotPos.current.x,
            playerBotPos.current.y,
            playerBotPos.current.z,
          ]}
          animation={cfg.playerBot.animation}
          visible={cfg.playerBot.visible}
        />
      )}

      {/* NPC Bot */}
      {cfg.npcBot && (
        <NpcBot
          position={[
            npcBotPos.current.x,
            npcBotPos.current.y,
            npcBotPos.current.z,
          ]}
          animation={cfg.npcBot.animation}
          visible={cfg.npcBot.visible}
        />
      )}

      {/* Grid */}
      {cfg.grid && (
        <TutorialGrid
          position={[0.3, 0, 0]}
          visible={cfg.grid.visible}
          discs={cfg.grid.discs}
          traps={cfg.grid.traps}
        />
      )}

      {/* Cheese stacks */}
      {cfg.cheese.map((c, i) => (
        <Cheese3D
          key={i}
          position={c.position}
          visible={c.visible}
        />
      ))}
    </group>
  );
}
