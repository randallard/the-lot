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
import { BoardCreator } from "./overlay/BoardCreator";
import { OpponentsList } from "./overlay/OpponentsList";
import { GameSelect } from "./overlay/GameSelect";
import { FindApp } from "./overlay/FindApp";
import { NpcChatBubble } from "./overlay/NpcChatBubble";
import { ChatApp } from "./overlay/ChatApp";
import { SettingsApp } from "./overlay/SettingsApp";
import { ChatOptInModal } from "./overlay/ChatOptInModal";
import { ChatInfoModal } from "./overlay/ChatInfoModal";
import { BubbleHint } from "./overlay/BubbleHint";
import { hasOffsetForCurrentSize, isBubbleHintDismissed } from "./overlay/bubble-offset";
import { useInputDirection } from "./world/useInputDirection";
import { useGameState } from "./state/useGameState";
import { getNpcById } from "./config/npcs";
import { launchGame } from "./services/launch-game";
import { parseResultsFromHash } from "./services/parse-results";
import { clearActiveSession } from "./services/active-sessions";
import { getNpcCommentary, chatWithNpc } from "./services/haiku-npc";
import {
  getChats,
  addMessage,
  genMessageId,
  getPreferences,
  setPreferences,
  getRandomEmoji,
  getTotalUnreadCount,
} from "./services/chat-storage";
import { recordResult } from "./services/npc-records";
import { fetchPendingResults } from "./services/fetch-pending-results";
import { processAsyncResults } from "./services/async-npc-messages";
import type { TrinketTrackerState } from "./world/useTrinketTracker";
import type { RushMode } from "./world/Player";
import type { ScreenPos } from "./world/useScreenPosition";

export default function App() {
  const game = useGameState();
  const { phase, inventory } = game;

  const [pocketOpen, setPocketOpen] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState("myco");
  const [npcDialogue, setNpcDialogue] = useState<string | null>(null);
  const [findTargetNpcId, setFindTargetNpcId] = useState<string | null>(null);

  // Chat interaction state
  const [chatNpcId, setChatNpcId] = useState<string | null>(null);
  const [chatRespondingNpcId, setChatRespondingNpcId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<{ text: string; isSeen: boolean } | null>(null);
  const [showOptIn, setShowOptIn] = useState(false);
  const [pendingChatNpcId, setPendingChatNpcId] = useState<string | null>(null);
  const [showChatInfo, setShowChatInfo] = useState<"unavailable" | "privacy" | null>(null);
  const [showNpcIntro, setShowNpcIntro] = useState(false);
  const [chatContinue, setChatContinue] = useState(false);
  const [_playingGameNpcId, setPlayingGameNpcId] = useState<string | null>(null);
  const postGameChat = useRef(false);
  const [needsBubbleHint, setNeedsBubbleHint] = useState(false);
  const [bubbleHintExpanded, setBubbleHintExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getTotalUnreadCount());

  // Show bubble hint when no saved offset exists for current screen size
  useEffect(() => {
    const check = () => {
      setNeedsBubbleHint(
        !isBubbleHintDismissed() &&
        (!hasOffsetForCurrentSize("pc") || !hasOffsetForCurrentSize("npc"))
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { dir: inputDir, disabled: inputDisabled } = useInputDirection();
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
  const npcScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false, screenHeight: 0 });
  const playerScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false, screenHeight: 0 });
  const mycoScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false, screenHeight: 0 });
  const emberScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false, screenHeight: 0 });
  // Restore player position only when returning from spaces-game (not on plain refresh)
  const [savedPlayerPos] = useState<{ x: number; z: number } | null>(() => {
    try {
      const npc = localStorage.getItem("townage-playing-npc");
      const pos = localStorage.getItem("townage-player-pos");
      if (npc && pos) {
        const parsed = JSON.parse(pos);
        console.log("[restore] npc:", npc, "pos:", parsed);
        return parsed;
      }
      console.log("[restore] no saved position, npc:", npc, "pos:", pos);
    } catch {}
    return null;
  });
  const playerWorldPos = useRef<{ x: number; z: number } | null>(savedPlayerPos);

  // Zoom camera through player to in front, looking back at their hands
  const zoomIn = phase.type === "part1-cutscene" || phase.type === "assembly-cutscene" || phase.type === "assembly-reveal";
  if (zoomIn) {
    cameraOffset.current = new THREE.Vector3(0, 1.5, -0.3);
    cameraLookAtOffset.current = new THREE.Vector3(0, -0.5, -1.5);
  } else {
    cameraOffset.current = null;
    cameraLookAtOffset.current = null;
  }

  // Check for game results in URL hash on mount, or restore playing-game context
  useEffect(() => {
    const results = parseResultsFromHash();
    const savedPlayingNpc = localStorage.getItem("townage-playing-npc");
    // Clean up saved position (already read during init)
    localStorage.removeItem("townage-player-pos");

    if (results) {
      // Clear saved context — we're back with results
      localStorage.removeItem("townage-playing-npc");

      // Clear active session if the game is finished (not incomplete)
      if (results.winner !== "incomplete") {
        clearActiveSession(results.npcId);
        // Record win/loss
        recordResult(results.npcId, results.winner);
      }

      // Process any bundled pending results from other completed games
      if (results.pendingResults && results.pendingResults.length > 0) {
        const asyncResults = results.pendingResults
          .filter((r) => r.winner !== "incomplete")
          .map((r) => ({
            ...r,
            winner: r.winner as "player" | "opponent" | "tie",
            completedAt: Date.now(),
          }));
        processAsyncResults(asyncResults).then((count) => {
          if (count > 0) setUnreadCount(getTotalUnreadCount());
        });
      }

      setSelectedNpcId(results.npcId);
      setPlayingGameNpcId(results.npcId);
      postGameChat.current = true;
      // Bring Ryan back to stand near the player (position already restored)
      if (results.npcId === "ryan") {
        game.bringNpcBack();
      }

      const npc = getNpcById(results.npcId);
      if (!npc) return;

      // Show NPC response as chat bubble
      setChatRespondingNpcId(results.npcId);
      setChatLoading(true);

      const prefs = getPreferences();
      if (prefs.useHaiku) {
        getNpcCommentary(npc, results).then((text) => {
          setChatLoading(false);
          setChatResponse({ text, isSeen: false });
          setPlayingGameNpcId(null);
        }).catch(() => {
          setChatLoading(false);
          const fallback = results.winner === "incomplete"
            ? "leaving already? we can finish later"
            : results.winner === "player"
              ? npc.personality.loseReaction
              : results.winner === "opponent"
                ? npc.personality.winReaction
                : npc.personality.greeting;
          setChatResponse({ text: fallback, isSeen: false });
          setPlayingGameNpcId(null);
        });
      } else {
        // Emoji fallback
        setTimeout(() => {
          const emoji = results.winner === "incomplete" ? "🤷" :
            results.winner === "player" ? "😤" :
            results.winner === "opponent" ? "😎" : "🤝";
          setChatLoading(false);
          setChatResponse({ text: emoji, isSeen: false });
          setPlayingGameNpcId(null);
        }, 800);
      }
    } else if (savedPlayingNpc) {
      // Returned without results (e.g. browser back) — NPC should still be nearby
      setSelectedNpcId(savedPlayingNpc);
      setPlayingGameNpcId(savedPlayingNpc);
      localStorage.removeItem("townage-playing-npc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch pending results from Vercel KV for games completed without returning
  useEffect(() => {
    fetchPendingResults().then(async (results) => {
      if (results.length === 0) return;
      console.log("[App] Found", results.length, "pending async results");
      const count = await processAsyncResults(results);
      if (count > 0) {
        setUnreadCount(getTotalUnreadCount());
      }
    });
  }, []);

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
    game.clearOverride();
    setShowNpcIntro(true);
  }, [game.clearOverride]);

  const handleGameNpcClick = useCallback((npcId: string) => {
    // Only allow chat in free-play (tutorial complete, no overlays)
    if (game.state.phaseOverride || !game.state.tutorialComplete) return;
    if (chatNpcId || chatRespondingNpcId) return;
    setFindTargetNpcId(null);

    const prefs = getPreferences();
    if (!prefs.optInShown) {
      setPendingChatNpcId(npcId);
      setShowOptIn(true);
    } else {
      setChatNpcId(npcId);
    }
  }, [game.state.phaseOverride, game.state.tutorialComplete, chatNpcId, chatRespondingNpcId]);

  const handleNpcClick = useCallback(() => {
    if (game.state.tutorialComplete) {
      // Post-tutorial — chat with NPC Ryan
      handleGameNpcClick("ryan");
    } else if (game.state.npcRelaxing) {
      game.setPhaseOverride({ type: "npc-welcome-back" });
    } else if (!game.state.appInstalled) {
      game.setPhaseOverride({ type: "need-phone" });
    } else {
      game.setPhaseOverride({ type: "waiting-app-click" });
    }
  }, [game.setPhaseOverride, game.state.appInstalled, game.state.npcRelaxing, game.state.tutorialComplete, handleGameNpcClick]);

  const handleNpcApproach = useCallback(() => {
    if (game.state.npcRelaxing && !game.state.tutorialComplete) {
      game.setPhaseOverride({ type: "npc-welcome-back" });
    }
  }, [game.setPhaseOverride, game.state.npcRelaxing, game.state.tutorialComplete]);

  const handleNeedPhoneDismiss = useCallback(() => {
    game.markNpcSpoken();
  }, [game.markNpcSpoken]);

  const handlePhoneClick = useCallback(() => {
    setPocketOpen(false);
    game.installApp();
  }, [game.installApp]);

  const handleInstallComplete = useCallback(() => {
    game.setPhaseOverride({ type: "waiting-app-click" });
  }, [game.setPhaseOverride]);

  const handleAppClick = useCallback(() => {
    // Skip tutorial — go to opponents list
    game.completeTutorial();
    game.setPhaseOverride({ type: "opponents-list" });
  }, [game.setPhaseOverride, game.completeTutorial]);

  const handleAppClose = useCallback(() => {
    game.npcWalkAway(true);
  }, [game.npcWalkAway]);

  const handlePlayOpponent = useCallback((npcId: string) => {
    setSelectedNpcId(npcId);
    game.setPhaseOverride({ type: "game-select" });
  }, [game.setPhaseOverride]);

  const handleGameSelect = useCallback((_game: string) => {
    const npc = getNpcById(selectedNpcId);
    if (!npc) return;
    // Save which NPC we're playing and player position so we can restore on return
    try {
      localStorage.setItem("townage-playing-npc", selectedNpcId);
      if (playerWorldPos.current) {
        localStorage.setItem("townage-player-pos", JSON.stringify(playerWorldPos.current));
      }
      console.log("[launch] saved npc:", selectedNpcId, "pos:", playerWorldPos.current);
    } catch {}
    // Navigate first, then update state (state update is for the spinner if navigation is slow)
    launchGame(npc);
    game.launchGame();
  }, [game.launchGame, selectedNpcId]);

  const handleGameSelectBack = useCallback(() => {
    game.setPhaseOverride({ type: "opponents-list" });
  }, [game.setPhaseOverride]);

  const handleNpcWalkAway = useCallback(() => {
    if (game.state.tutorialComplete) return; // No walk-away after tutorial
    if (!game.state.npcRelaxing) {
      setPocketOpen(false);
      game.npcWalkAway(true);
    }
  }, [game.npcWalkAway, game.state.npcRelaxing, game.state.tutorialComplete]);

  const handleNpcByeDismiss = useCallback(() => {
    game.clearOverride();
  }, [game.clearOverride]);

  const handleNpcQuestionChoice = useCallback((choice: "ready" | "who") => {
    if (choice === "ready") {
      game.setPhaseOverride({ type: "waiting-app-click" });
    } else {
      game.clearOverride();
    }
  }, [game.setPhaseOverride, game.clearOverride]);

  const handleCommentaryDismiss = useCallback(() => {
    setNpcDialogue(null);
    game.clearResults();
    setTimeout(() => game.npcWalkAway(false), 1000);
  }, [game.clearResults, game.npcWalkAway]);

  const handleOptInAccept = useCallback(() => {
    setPreferences({ useHaiku: true, optInShown: true });
    setShowOptIn(false);
    if (pendingChatNpcId) {
      setChatNpcId(pendingChatNpcId);
      setPendingChatNpcId(null);
    }
  }, [pendingChatNpcId]);

  const handleOptInDecline = useCallback(() => {
    setPreferences({ useHaiku: false, optInShown: true });
    setShowOptIn(false);
    if (pendingChatNpcId) {
      setChatNpcId(pendingChatNpcId);
      setPendingChatNpcId(null);
    }
  }, [pendingChatNpcId]);

  const handleChatSend = useCallback(async (message: string) => {
    if (!chatNpcId) return;
    const npc = getNpcById(chatNpcId);
    if (!npc) return;

    const respondingNpcId = chatNpcId;
    setChatNpcId(null);
    setChatContinue(false);
    setChatResponse(null);
    setChatRespondingNpcId(respondingNpcId);
    setChatLoading(true);

    // Save player message
    addMessage(respondingNpcId, {
      id: genMessageId(),
      sender: "player",
      text: message,
      timestamp: Date.now(),
    });

    const prefs = getPreferences();
    if (!prefs.useHaiku) {
      await new Promise((r) => setTimeout(r, 800));
      const emoji = getRandomEmoji();
      addMessage(respondingNpcId, {
        id: genMessageId(),
        sender: "npc",
        text: emoji,
        timestamp: Date.now(),
      });
      setChatLoading(false);
      setChatResponse({ text: emoji, isSeen: false });
      setChatNpcId(respondingNpcId);
      setChatContinue(true);
      return;
    }

    try {
      const history = getChats(respondingNpcId);
      const response = await chatWithNpc(npc, history);
      addMessage(respondingNpcId, {
        id: genMessageId(),
        sender: "npc",
        text: response,
        timestamp: Date.now(),
      });
      setChatLoading(false);
      setChatResponse({ text: response, isSeen: false });
      setChatNpcId(respondingNpcId);
      setChatContinue(true);
    } catch {
      // Haiku unavailable — keep loading briefly, then show "seen"
      setTimeout(() => {
        addMessage(respondingNpcId, {
          id: genMessageId(),
          sender: "npc",
          text: "\u{1F440}",
          timestamp: Date.now(),
          isSeen: true,
        });
        setChatLoading(false);
        setChatResponse({ text: "\u{1F440}", isSeen: true });
        setChatNpcId(respondingNpcId);
        setChatContinue(true);
      }, 1500);
    }
  }, [chatNpcId]);

  const dismissChatResponse = useCallback(() => {
    const wasPostGame = postGameChat.current;
    setChatResponse(null);
    setChatRespondingNpcId(null);
    setChatContinue(false);
    if (wasPostGame) {
      postGameChat.current = false;
      setTimeout(() => game.npcWalkAway(false), 1000);
    }
  }, [game.npcWalkAway]);

  const handleChatClose = useCallback(() => {
    const wasPostGame = postGameChat.current;
    setChatNpcId(null);
    setChatResponse(null);
    setChatRespondingNpcId(null);
    setChatContinue(false);
    if (wasPostGame) {
      postGameChat.current = false;
      setTimeout(() => game.npcWalkAway(false), 1000);
    }
  }, [game.npcWalkAway]);

  const handleFind = useCallback((npcId: string) => {
    setFindTargetNpcId(npcId);
    game.clearOverride(); // close phone
  }, [game.clearOverride]);

  const togglePocket = useCallback(() => {
    // Post-tutorial: pocket button opens/closes phone homescreen
    if (game.state.tutorialComplete && game.state.appInstalled) {
      if (phase.type === "phone-home" || phase.type === "find-app" || phase.type === "chat-app" || phase.type === "settings-app") {
        game.clearOverride();
      } else if (!game.state.phaseOverride) {
        game.setPhaseOverride({ type: "phone-home" });
      }
      return;
    }

    const blocked =
      phase.type === "part1-cutscene" ||
      phase.type === "assembly-cutscene" ||
      phase.type === "assembly-reveal" ||
      phase.type === "installing" ||
      phase.type === "waiting-app-click" ||
      phase.type === "board-creation" ||
      phase.type === "opponents-list" ||
      phase.type === "game-select" ||
      phase.type === "launching-game" ||
      phase.type === "npc-commentary";
    if (!blocked) setPocketOpen((prev) => !prev);
  }, [phase.type, game.state.tutorialComplete, game.state.appInstalled, game.state.phaseOverride, game.clearOverride, game.setPhaseOverride]);

  const handleRush = useCallback(() => {
    rushMode.current = 1;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyE") togglePocket();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePocket]);

  // Phone home hotkeys: f=find, m=messages, s=settings
  useEffect(() => {
    if (phase.type !== "phone-home") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f") { e.preventDefault(); game.setPhaseOverride({ type: "find-app" }); }
      else if (e.key === "m") { e.preventDefault(); game.setPhaseOverride({ type: "chat-app" }); }
      else if (e.key === "s") { e.preventDefault(); game.setPhaseOverride({ type: "settings-app" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase.type, game.setPhaseOverride]);

  // Enter key / tap on empty space → rush toward arrow target
  const showArrowRef = useRef(false);
  const hasModalRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Enter" && showArrowRef.current && !hasModalRef.current) {
        handleRush();
      }
    };
    const onClick = (e: MouseEvent) => {
      // Only trigger on clicks that hit the canvas (empty space), not UI elements
      // Skip if rushMode already set by a 3D object click (e.g. bot parts)
      const target = e.target as HTMLElement;
      if (target.tagName === "CANVAS" && showArrowRef.current && !hasModalRef.current && rushMode.current === 0) {
        handleRush();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [handleRush]);

  // Derive flags for World component
  const part1CutsceneDone = game.state.partsCollected >= 1 && phase.type !== "part1-cutscene";
  const showArrow =
    phase.type === "exploring" ||
    phase.type === "between-parts" ||
    (findTargetNpcId !== null && phase.type === "free-play");
  const needsPocketHint = game.state.npcSpoken && !game.state.appInstalled && !game.state.phaseOverride;

  // Disable WASD movement while any modal/overlay is open
  const hasModal =
    !!game.state.phaseOverride ||
    pocketOpen ||
    !!chatNpcId ||
    !!chatResponse ||
    chatLoading ||
    showOptIn ||
    !!showChatInfo ||
    showNpcIntro ||
    bubbleHintExpanded ||
    zoomIn;
  inputDisabled.current = hasModal;
  showArrowRef.current = showArrow;
  hasModalRef.current = hasModal;

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
          onMycoClick={() => handleGameNpcClick("myco")}
          onEmberClick={() => handleGameNpcClick("ember")}
          mycoScreenPos={mycoScreenPos}
          emberScreenPos={emberScreenPos}
          findTargetNpcId={findTargetNpcId}
          npcTalking={hasModal}
          partsCollected={game.state.partsCollected}
          initialPlayerPos={savedPlayerPos}
          playerWorldPos={playerWorldPos}
        />
      </Canvas>

      <VirtualJoystick inputDir={inputDir} />
      <PocketButton onClick={togglePocket} pulse={needsPocketHint} />
      <PocketHint show={needsPocketHint} />
      <BubbleHint show={game.state.tutorialComplete && needsBubbleHint} onExpandedChange={setBubbleHintExpanded} />
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

      {/* NPC intro after assembly — "hit me up if you want to chat" */}
      {showNpcIntro && (
        <SpeechBubble
          text="I'm NPC Ryan, hit me up if you want to chat"
          onDismiss={() => {
            setShowNpcIntro(false);
            game.completeIntro();
            setTimeout(() => game.npcWalkAway(false), 1000);
          }}
          speakerScreenPos={npcScreenPos}
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

      {/* Board creation — inside phone (kept for potential future use) */}
      {phase.type === "board-creation" && (
        <>
          <PhoneOverlay mode="app" onClose={() => {
            game.state.tutorialComplete ? game.clearOverride() : game.npcWalkAway(true);
          }}>
            <BoardCreator
              boardSize={2}
              onBoardSaved={(board) => {
                game.saveBoard(board);
                game.setPhaseOverride({ type: "opponents-list" });
              }}
              onCancel={() => game.npcWalkAway(true)}
            />
          </PhoneOverlay>
          <SpeechBubble
            text="make a path for your bot — set some traps too!"
            onDismiss={() => {}}
            inModal
          />
        </>
      )}

      {/* Opponents list */}
      {phase.type === "opponents-list" && (
        <PhoneOverlay mode="app" onClose={() => {
          game.state.tutorialComplete ? game.clearOverride() : game.npcWalkAway(true);
        }}>
          <OpponentsList onPlay={handlePlayOpponent} />
        </PhoneOverlay>
      )}

      {/* Game selection */}
      {phase.type === "game-select" && (
        <PhoneOverlay mode="app" onClose={() => {
          game.state.tutorialComplete ? game.clearOverride() : game.npcWalkAway(true);
        }}>
          <GameSelect
            npcName={getNpcById(selectedNpcId)?.displayName ?? selectedNpcId}
            onSelect={handleGameSelect}
            onBack={handleGameSelectBack}
          />
        </PhoneOverlay>
      )}

      {/* Phone homescreen in free-play */}
      {phase.type === "phone-home" && (
        <PhoneOverlay
          onFindClick={() => {
            game.setPhaseOverride({ type: "find-app" });
          }}
          onChatClick={() => {
            game.setPhaseOverride({ type: "chat-app" });
          }}
          onSettingsClick={() => {
            game.setPhaseOverride({ type: "settings-app" });
          }}
          onClose={() => game.clearOverride()}
          chatUnreadCount={unreadCount}
        />
      )}

      {/* Find app */}
      {phase.type === "find-app" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <FindApp
            onFind={handleFind}
            onClose={() => game.clearOverride()}
          />
        </PhoneOverlay>
      )}

      {/* Chat app */}
      {phase.type === "chat-app" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <ChatApp
            onClose={() => game.clearOverride()}
            onUnreadChange={() => setUnreadCount(getTotalUnreadCount())}
          />
        </PhoneOverlay>
      )}

      {/* Settings app */}
      {phase.type === "settings-app" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <SettingsApp onClose={() => game.clearOverride()} />
        </PhoneOverlay>
      )}

      {/* NPC chat bubble — player choosing what to say */}
      {chatNpcId && (
        <NpcChatBubble
          playerScreenPos={playerScreenPos}
          onSend={handleChatSend}
          onClose={chatContinue ? handleChatClose : () => setChatNpcId(null)}
          onPlayGame={() => {
            const npcId = chatNpcId!;
            setChatNpcId(null);
            setChatResponse(null);
            setChatRespondingNpcId(null);
            setChatContinue(false);
            setPlayingGameNpcId(npcId);
            setSelectedNpcId(npcId);
            game.setPhaseOverride({ type: "game-select" });
          }}
          continueMode={chatContinue}
        />
      )}

      {/* NPC typing indicator */}
      {chatLoading && chatRespondingNpcId && (
        <SpeechBubble
          text="..."
          onDismiss={() => {}}
          speakerScreenPos={
            chatRespondingNpcId === "myco" ? mycoScreenPos :
            chatRespondingNpcId === "ember" ? emberScreenPos :
            npcScreenPos
          }
        />
      )}

      {/* NPC chat response */}
      {chatResponse && chatRespondingNpcId && !chatLoading && (
        <>
          <SpeechBubble
            text={chatResponse.text}
            onDismiss={chatContinue ? handleChatClose : dismissChatResponse}
            speakerScreenPos={
              chatRespondingNpcId === "myco" ? mycoScreenPos :
              chatRespondingNpcId === "ember" ? emberScreenPos :
              npcScreenPos
            }
          />
          {chatResponse.isSeen && (
            <button
              onClick={() => setShowChatInfo("unavailable")}
              style={{
                position: "fixed",
                bottom: 80,
                right: 24,
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: 20,
                padding: "8px 16px",
                color: "#6a4c93",
                fontSize: 13,
                cursor: "pointer",
                zIndex: 25,
              }}
            >
              (?) what happened
            </button>
          )}
        </>
      )}

      {/* Chat opt-in modal */}
      {showOptIn && (
        <ChatOptInModal
          onAccept={handleOptInAccept}
          onDecline={handleOptInDecline}
        />
      )}

      {/* Chat info modal */}
      {showChatInfo && (
        <ChatInfoModal
          mode={showChatInfo}
          onClose={() => setShowChatInfo(null)}
        />
      )}

      {/* Launching game — navigating to spaces-game */}
      {phase.type === "launching-game" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100%",
              gap: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid #6a4c93",
                borderTop: "3px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "#9b59b6", fontSize: 14, fontWeight: 600 }}>
              loading game...
            </p>
          </div>
        </PhoneOverlay>
      )}

      {/* NPC commentary on game results */}
      {phase.type === "npc-commentary" && (
        <SpeechBubble
          text={npcDialogue ?? getNpcById(selectedNpcId)?.personality.greeting ?? "good game!"}
          onDismiss={handleCommentaryDismiss}
          speakerScreenPos={npcScreenPos}
        />
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
            that's a great find! there's a game they used to be able to play... maybe someday...
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
