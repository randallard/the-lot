import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { World } from "./world/World";
import { PickupCutscene } from "./overlay/PickupCutscene";
import { AssemblyCutscene } from "./overlay/AssemblyCutscene";
import { VirtualJoystick } from "./overlay/VirtualJoystick";
import { PocketView } from "./overlay/PocketView";
import { PocketButton } from "./overlay/PocketButton";
import { TrinketArrow } from "./overlay/TrinketArrow";
import { SpeechBubble } from "./overlay/SpeechBubble";
import { PhoneOverlay } from "./overlay/PhoneOverlay";
import { ThoughtBubble } from "./overlay/ThoughtBubble";
import { useInputDirection } from "./world/useInputDirection";
import { useGameState } from "./state/useGameState";
import type { TrinketTrackerState } from "./world/useTrinketTracker";
import type { RushMode } from "./world/Player";
import type { ScreenPos } from "./world/useScreenPosition";

export default function App() {
  const game = useGameState();
  const { phase, inventory } = game;

  const [pocketOpen, setPocketOpen] = useState(false);
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
  const cameraOffset = useRef<THREE.Vector3 | null>(null);
  const cameraLookAtOffset = useRef<THREE.Vector3 | null>(null);
  const npcScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false });
  const playerScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false });

  // Zoom camera through player to in front, looking back at their hands
  const zoomIn = phase.type === "part1-cutscene" || phase.type === "assembly-cutscene" || phase.type === "assembly-reveal";
  if (zoomIn) {
    cameraOffset.current = new THREE.Vector3(0, 1.5, -0.3);
    cameraLookAtOffset.current = new THREE.Vector3(0, -0.5, -1.5);
  } else {
    cameraOffset.current = null;
    cameraLookAtOffset.current = null;
  }

  const handlePart1Pickup = useCallback(() => {
    rushMode.current = 0;
    game.collectPart();
  }, [game.collectPart]);

  const handlePart2Pickup = useCallback(() => {
    rushMode.current = 0;
    game.collectPart();
  }, [game.collectPart]);

  const handleAssemblyComplete = useCallback(() => {
    game.completeAssembly();
  }, [game.completeAssembly]);

  const handleAssemblyRevealDone = useCallback(() => {
    // Speech bubble dismissed → clear overlay, NPC appears in world
    game.clearOverride();
  }, [game.clearOverride]);

  const handleNpcClick = useCallback(() => {
    if (game.state.npcRelaxing && !game.state.tutorialComplete) {
      // Player clicked relaxing NPC → "hows it going?" then resume
      game.setPhaseOverride({ type: "npc-welcome-back" });
    } else if (!game.state.appInstalled) {
      // Player clicked NPC in world → "uh... you'll need your phone"
      game.setPhaseOverride({ type: "need-phone" });
    } else if (!game.state.tutorialComplete) {
      game.setPhaseOverride({ type: "waiting-app-click" });
    }
  }, [game.setPhaseOverride, game.state.appInstalled, game.state.npcRelaxing, game.state.tutorialComplete]);

  const handleNpcApproach = useCallback(() => {
    // Player stood near relaxing NPC for 2 seconds → "hows it going?" then resume
    if (game.state.npcRelaxing && !game.state.tutorialComplete) {
      game.setPhaseOverride({ type: "npc-welcome-back" });
    }
  }, [game.setPhaseOverride, game.state.npcRelaxing, game.state.tutorialComplete]);

  const handleNeedPhoneDismiss = useCallback(() => {
    // After "you'll need your phone" → mark spoken, clear, let player check pocket
    game.markNpcSpoken();
  }, [game.markNpcSpoken]);

  const handlePhoneClick = useCallback(() => {
    // Player clicked phone in pocket → install app
    setPocketOpen(false);
    game.installApp();
  }, [game.installApp]);

  const handleInstallComplete = useCallback(() => {
    // Install animation done → show phone with speech bubble overlaid
    game.setPhaseOverride({ type: "waiting-app-click" });
  }, [game.setPhaseOverride]);

  const handleAppClick = useCallback(() => {
    // Player clicked the app → start tutorial
    game.setPhaseOverride({ type: "tutorial-chat", step: 0 });
  }, [game.setPhaseOverride]);

  const handleAppClose = useCallback(() => {
    // Player closed the phone without clicking app → save progress, NPC bye
    game.npcWalkAway(true);
  }, [game.npcWalkAway]);

  const handleNpcWalkAway = useCallback(() => {
    // Player walked away from NPC at any point → save progress, bye, go to camp
    if (!game.state.npcRelaxing) {
      setPocketOpen(false);
      game.npcWalkAway(true);
    }
  }, [game.npcWalkAway, game.state.npcRelaxing]);

  const handleNpcByeDismiss = useCallback(() => {
    // Bye dismissed → clear, NPC wanders to camp
    game.clearOverride();
  }, [game.clearOverride]);

  const handleNpcQuestionChoice = useCallback((choice: "ready" | "who") => {
    if (choice === "ready") {
      game.setPhaseOverride({ type: "waiting-app-click" });
    } else {
      // TODO: "who are you?" dialog tree
      game.clearOverride();
    }
  }, [game.setPhaseOverride, game.clearOverride]);

  const togglePocket = useCallback(() => {
    const blocked =
      phase.type === "part1-cutscene" ||
      phase.type === "assembly-cutscene" ||
      phase.type === "assembly-reveal" ||
      phase.type === "installing" ||
      phase.type === "waiting-app-click" ||
      phase.type === "tutorial-chat";
    if (!blocked) setPocketOpen((prev) => !prev);
  }, [phase.type]);

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

  // Derive flags for World component
  const part1CutsceneDone = game.state.partsCollected >= 1 && phase.type !== "part1-cutscene";
  const showArrow =
    phase.type === "exploring" ||
    phase.type === "between-parts" ||
    (game.state.npcRelaxing && !game.state.phaseOverride);
  const needsPocketHint = game.state.npcSpoken && !game.state.appInstalled && !game.state.phaseOverride;

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
          showNpc={game.state.assembled && phase.type !== "assembly-cutscene" && phase.type !== "assembly-reveal" && phase.type !== "installing"}
          npcRelaxing={game.state.npcRelaxing}
          onNpcClick={handleNpcClick}
          onNpcWalkAway={handleNpcWalkAway}
          onNpcApproach={handleNpcApproach}
          cameraOffset={cameraOffset}
          cameraLookAtOffset={cameraLookAtOffset}
          hidePlayer={zoomIn}
          npcScreenPos={npcScreenPos}
          playerScreenPos={playerScreenPos}
        />
      </Canvas>

      <VirtualJoystick inputDir={inputDir} />
      <PocketButton onClick={togglePocket} pulse={needsPocketHint} />
      <PocketHint show={needsPocketHint} />
      {showArrow && (
        <TrinketArrow tracker={trinketTracker} onRush={handleRush} />
      )}

      {/* Part 1 pickup cutscene */}
      {phase.type === "part1-cutscene" && (
        <PickupCutscene onDismiss={() => game.clearOverride()} />
      )}

      {/* Assembly drag-to-fit cutscene */}
      {phase.type === "assembly-cutscene" && (
        <AssemblyCutscene onComplete={handleAssemblyComplete} />
      )}

      {/* Assembly reveal: "they fit!" → "it's a ..." */}
      {phase.type === "assembly-reveal" && (
        <AssemblyReveal
          step={phase.step}
          onStepChange={(step) =>
            game.setPhaseOverride({ type: "assembly-reveal", step })
          }
          onDone={handleAssemblyRevealDone}
        />
      )}

      {/* NPC speech bubbles — point at NPC */}
      {phase.type === "need-phone" && (
        <SpeechBubble
          text="uh... you'll need your phone"
          onDismiss={handleNeedPhoneDismiss}
          speakerScreenPos={npcScreenPos}
        />
      )}

      {phase.type === "npc-bye" && (
        <SpeechBubble
          text="alrighty, maybe later :)"
          onDismiss={handleNpcByeDismiss}
          speakerScreenPos={npcScreenPos}
          autoClose={3500}
        />
      )}

      {phase.type === "npc-welcome-back" && (
        <SpeechBubble
          text="hows it going?"
          onDismiss={() => game.resumeFromNpc()}
          speakerScreenPos={npcScreenPos}
        />
      )}

      {phase.type === "npc-question" && (
        <>
          <SpeechBubble
            text="what do you think?"
            onDismiss={() => {}}
            speakerScreenPos={npcScreenPos}
          />
          <ThoughtBubble
            playerScreenPos={playerScreenPos}
            choices={[
              { label: "ready to play!", action: () => handleNpcQuestionChoice("ready") },
              { label: "who are you?", action: () => handleNpcQuestionChoice("who") },
            ]}
          />
        </>
      )}

      {/* Installing animation */}
      {phase.type === "installing" && (
        <InstallAnimation onComplete={handleInstallComplete} />
      )}

      {/* Phone with app, waiting for click — speech bubble from left (in modal) */}
      {phase.type === "waiting-app-click" && (
        <>
          <PhoneOverlay
            onAppClick={handleAppClick}
            onClose={handleAppClose}
          />
          <SpeechBubble
            text="those little bots love a little cheese and this is how you help them get some"
            onDismiss={() => {}}
            inModal
            delay={500}
          />
        </>
      )}

      {/* Pocket view */}
      {pocketOpen && (
        <PocketView
          onClose={() => setPocketOpen(false)}
          inventory={inventory}
          onPhoneClick={
            game.state.assembled && !game.state.appInstalled
              ? handlePhoneClick
              : undefined
          }
        />
      )}
    </div>
  );
}

// ---- Inline components for now, will extract if they grow ----

function AssemblyReveal({
  step,
  onStepChange,
  onDone,
}: {
  step: "they-fit" | "its-a-bot" | "npc-speech";
  onStepChange: (step: "they-fit" | "its-a-bot" | "npc-speech") => void;
  onDone: () => void;
}) {
  const [visible, setVisible] = React.useState(false);
  const [clickable, setClickable] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // "they-fit": wait for click (enable clicks after brief settle)
  // "its-a-bot": ignore clicks, auto-advance after 2s
  // "npc-speech": ignore clicks for 1s, then clickable
  React.useEffect(() => {
    setClickable(false);
    let t: ReturnType<typeof setTimeout>;
    if (step === "they-fit") {
      t = setTimeout(() => setClickable(true), 400);
    } else if (step === "its-a-bot") {
      t = setTimeout(() => onStepChange("npc-speech"), 2000);
    } else if (step === "npc-speech") {
      t = setTimeout(() => setClickable(true), 1000);
    }
    return () => clearTimeout(t!);
  }, [step, onStepChange]);

  const advance = React.useCallback(() => {
    if (!clickable) return;
    if (step === "they-fit") {
      onStepChange("its-a-bot");
    } else if (step === "npc-speech") {
      onDone();
    }
  }, [clickable, step, onStepChange, onDone]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const handleClick = () => advance();

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        cursor: clickable ? "pointer" : "default",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.1s linear",
        zIndex: 10,
      }}
    >
      {/* Assembled bot parts with glow */}
      <div style={{ display: "flex", gap: 2, marginBottom: 32 }}>
        <div
          style={{
            width: 36,
            height: 28,
            background: "#889099",
            borderRadius: 3,
            transform: "rotate(6deg)",
          }}
        />
        <div
          style={{
            width: 36,
            height: 28,
            background: "#889099",
            borderRadius: 3,
            transform: "rotate(-4deg)",
            boxShadow: "0 0 30px rgba(140, 80, 200, 0.6)",
          }}
        />
      </div>

      <p
        style={{
          color: "#d0d0d0",
          fontSize: 24,
          letterSpacing: 1.5,
          textAlign: "center",
          padding: "0 20px",
          transition: "opacity 0.4s",
        }}
      >
        {step === "they-fit" ? "they fit!" : "it's a ..."}
      </p>

      {/* NPC speech bubble overlaid on top — offset left, tail points left */}
      {step === "npc-speech" && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: 24,
            maxWidth: 320,
            padding: "18px 28px",
            background: "#fff",
            border: "3px solid #222",
            borderRadius: 20,
            zIndex: 20,
          }}
        >
          {/* Tail pointing left */}
          <div
            style={{
              position: "absolute",
              left: -18,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              borderRight: "18px solid #222",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -13,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: "15px solid #fff",
            }}
          />
          <p style={{ color: "#222", fontSize: 16, lineHeight: 1.5 }}>
            that's a nice little bot you've got there — here's the app for it
          </p>
        </div>
      )}
    </div>
  );
}

function InstallAnimation({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const duration = 2000;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(onComplete, 400);
    };
    requestAnimationFrame(tick);
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        zIndex: 10,
      }}
    >
      {/* Phone outline */}
      <div
        style={{
          width: 120,
          height: 200,
          background: "#222",
          borderRadius: 16,
          border: "3px solid #444",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 20,
        }}
      >
        {/* App icon */}
        <div
          style={{
            width: 48,
            height: 48,
            background: "#6a4c93",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: progress > 0.8 ? 1 : 0.3,
            transition: "opacity 0.3s",
          }}
        >
          <div
            style={{
              width: 20,
              height: 16,
              background: "#889099",
              borderRadius: 3,
            }}
          />
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 4,
            background: "#333",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "#6a4c93",
              borderRadius: 2,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        <p style={{ color: "#666", fontSize: 10 }}>
          {progress < 1 ? "installing..." : "installed!"}
        </p>
      </div>
    </div>
  );
}

function PocketHint({ show }: { show: boolean }) {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!show || isTouch) return null;

  return (
    <p
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#6a4c93",
        fontSize: 14,
        letterSpacing: 0.5,
        zIndex: 5,
        opacity: 0.8,
        animation: "pocket-pulse 1s ease-in-out infinite",
      }}
    >
      press E to check your pockets
    </p>
  );
}
