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
import { ChoiceBubble } from "./overlay/ChoiceBubble";
import { BoardCreator } from "./overlay/BoardCreator";
import { OpponentsList } from "./overlay/OpponentsList";
import { GameSelect } from "./overlay/GameSelect";
import { FindApp } from "./overlay/FindApp";
import { RankDetail } from "./overlay/RankDetail";
import { NpcChatBubble } from "./overlay/NpcChatBubble";
import { ChatApp } from "./overlay/ChatApp";
import { SettingsApp } from "./overlay/SettingsApp";
import { TownReport } from "./overlay/TownReport";
import { ChatOptInModal } from "./overlay/ChatOptInModal";
import { ChatInfoModal } from "./overlay/ChatInfoModal";
import { MoodSlider } from "./overlay/MoodSlider";
import { MoodResponsesModal } from "./overlay/MoodResponsesModal";
import { useInputDirection } from "./world/useInputDirection";
import { useGameState } from "./state/useGameState";
import { getNpcById } from "./config/npcs";
import { launchGame } from "./services/launch-game";
import { parseResultsFromHash } from "./services/parse-results";
import { clearActiveSession } from "./services/active-sessions";
import { getNpcCommentary, chatWithNpc, getGameAcceptText } from "./services/haiku-npc";
import { hasSeenIntro, markIntroSeen } from "./services/npc-intro-seen";
import { nudgeFriendliness, NUDGE_GAME_PLAYED, NUDGE_CHAT } from "./services/npc-friendliness";
import { needsMoodCheck } from "./services/enthusiasm";
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
import { recordBoardResult } from "./services/npc-board-records";
import { isAsleep, recordMessage, getTimeUntilWake } from "./services/npc-sleep";
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
  const [showChatInfo, _setShowChatInfo] = useState<"unavailable" | "privacy" | "sleeping" | null>(null);
  const setShowChatInfo = useCallback((v: "unavailable" | "privacy" | "sleeping" | null) => {
    console.log("[showChatInfo]", v, new Error().stack?.split("\n")[2]?.trim());
    _setShowChatInfo(v);
  }, []);
  const [showNpcIntro, setShowNpcIntro] = useState(false);
  const [showPhoneHint, setShowPhoneHint] = useState(false);
  const [moodCheckNpcId, setMoodCheckNpcId] = useState<string | null>(null);
  const [showCustomizeMood, setShowCustomizeMood] = useState(false);
  const [chatContinue, setChatContinue] = useState(false);
  const [_playingGameNpcId, setPlayingGameNpcId] = useState<string | null>(null);
  const [gameAcceptText, setGameAcceptText] = useState<string | null>(null);
  const postGameChat = useRef(false);
  const [unreadCount, setUnreadCount] = useState(() => getTotalUnreadCount());
  // NPC sleep state — re-checked after each chat send
  const [sleepVersion, setSleepVersion] = useState(0);
  const mycoAsleep = isAsleep("myco");
  const emberAsleep = isAsleep("ember");
  const sproutAsleep = isAsleep("sprout");
  // Force re-evaluation when sleepVersion changes (used after recordMessage)
  void sleepVersion;

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
  const sproutScreenPos = useRef<ScreenPos>({ x: 0.5, y: 0.5, visible: false, screenHeight: 0 });
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
        recordResult(results.npcId, results.winner);
        if (results.boardSize) {
          recordBoardResult(results.npcId, results.boardSize, results.winner);
        }
        nudgeFriendliness(results.npcId, NUDGE_GAME_PLAYED);
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
            ? "no worries, we'll pick up where we left off later"
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

  // Generate game-accept text: first time use static intro, then Haiku
  const gameAcceptNpcId = phase.type === "game-accept" ? phase.npcId : null;
  const gameAcceptPlayerChose = phase.type === "game-accept" ? phase.playerChose : null;
  useEffect(() => {
    if (!gameAcceptNpcId) return;
    const npc = getNpcById(gameAcceptNpcId);
    if (!npc) return;

    if (!hasSeenIntro(gameAcceptNpcId)) {
      // First time — show the long intro text
      markIntroSeen(gameAcceptNpcId);
      setGameAcceptText(npc.personality.gameAcceptText ?? "let's do this!");
      return;
    }

    // Subsequent — ask Haiku for a short response
    let cancelled = false;
    const prefs = getPreferences();
    if (prefs.useHaiku) {
      getGameAcceptText(npc, gameAcceptPlayerChose ?? "spaces-game")
        .then((result) => { if (!cancelled) setGameAcceptText(result.dialogue); })
        .catch(() => { if (!cancelled) setGameAcceptText("alright, let's go!"); });
    } else {
      setGameAcceptText("alright, let's go!");
    }
    return () => { cancelled = true; };
  }, [gameAcceptNpcId, gameAcceptPlayerChose]);

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
    console.log("[npcClick]", npcId, "override:", game.state.phaseOverride, "tutorial:", game.state.tutorialComplete, "chatNpcId:", chatNpcId, "responding:", chatRespondingNpcId, "mood:", moodCheckNpcId);
    // Only allow chat in free-play (tutorial complete, no overlays)
    if (game.state.phaseOverride || !game.state.tutorialComplete) return;
    if (chatNpcId || chatRespondingNpcId || moodCheckNpcId) return;
    setFindTargetNpcId(null);

    // NPC is asleep — show sleep info
    if (npcId !== "ryan" && isAsleep(npcId)) {
      console.log("[sleep] setting showChatInfo to sleeping for", npcId);
      setShowChatInfo("sleeping");
      return;
    }

    // Daily mood check — NPC asks before player gets to talk
    if (needsMoodCheck()) {
      setMoodCheckNpcId(npcId);
      return;
    }

    const prefs = getPreferences();
    if (!prefs.optInShown) {
      setPendingChatNpcId(npcId);
      setShowOptIn(true);
    } else {
      setChatNpcId(npcId);
    }
  }, [game.state.phaseOverride, game.state.tutorialComplete, chatNpcId, chatRespondingNpcId, moodCheckNpcId]);

  const handleNpcClick = useCallback(() => {
    handleGameNpcClick("ryan");
  }, [handleGameNpcClick]);

  const handleNpcApproach = useCallback(() => {
    // No-op — NPC approach no longer triggers automatic dialogue
  }, []);


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

    // Block if NPC fell asleep (e.g. hit limit mid-conversation)
    if (chatNpcId !== "ryan" && isAsleep(chatNpcId)) {
      setChatNpcId(null);
      setChatContinue(false);
      setSleepVersion((v) => v + 1);
      setShowChatInfo("sleeping");
      return;
    }

    const respondingNpcId = chatNpcId;
    setChatNpcId(null);
    setChatContinue(false);
    setChatResponse(null);
    setChatRespondingNpcId(respondingNpcId);
    setChatLoading(true);

    // Record for rate limiting
    recordMessage(respondingNpcId);
    setSleepVersion((v) => v + 1);

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
      nudgeFriendliness(respondingNpcId, NUDGE_CHAT);
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
    // First time pressing E during or after NPC intro — skip tutorial, go straight to phone
    if ((game.state.npcSpoken || showNpcIntro || showPhoneHint) && !game.state.tutorialComplete) {
      setShowNpcIntro(false);
      setShowPhoneHint(false);
      game.completeIntro();
      game.setPhaseOverride({ type: "phone-home" });
      return;
    }

    // Post-tutorial: pocket button opens/closes phone homescreen
    if (game.state.tutorialComplete) {
      if (phase.type === "phone-home" || phase.type === "find-app" || phase.type === "chat-app" || phase.type === "settings-app" || phase.type === "rank-detail" || phase.type === "town-report") {
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
      phase.type === "board-creation" ||
      phase.type === "opponents-list" ||
      phase.type === "game-select" ||
      phase.type === "launching-game" ||
      phase.type === "npc-commentary";
    if (!blocked) setPocketOpen((prev) => !prev);
  }, [phase.type, game.state.npcSpoken, game.state.tutorialComplete, game.state.phaseOverride, game.clearOverride, game.setPhaseOverride, game.completeIntro, showNpcIntro, showPhoneHint]);

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

  // Enter key / tap on empty space → rush toward arrow target or chat with closest NPC
  const showArrowRef = useRef(false);
  const hasModalRef = useRef(false);
  const tutorialCompleteRef = useRef(false);
  tutorialCompleteRef.current = game.state.tutorialComplete;

  const needsPocketHintRef = useRef(false);
  needsPocketHintRef.current = game.state.npcSpoken && !game.state.tutorialComplete && !game.state.phaseOverride;

  const trinketArrowRef = useRef(false);
  trinketArrowRef.current = phase.type === "exploring" || phase.type === "between-parts";

  const chatWithClosestNpc = useCallback((): boolean => {
    // Don't fire if pocket hint is showing (player should open phone first)
    if (needsPocketHintRef.current) return false;
    const player = playerScreenPos.current;
    if (!player.visible) return false;
    const npcs: { id: string; pos: ScreenPos }[] = [
      { id: "ryan", pos: npcScreenPos.current },
      { id: "myco", pos: mycoScreenPos.current },
      { id: "ember", pos: emberScreenPos.current },
      { id: "sprout", pos: sproutScreenPos.current },
    ];
    let closest: string | null = null;
    let minDist = Infinity;
    // Any visible NPC on screen is a valid target
    for (const { id, pos } of npcs) {
      if (!pos.visible) continue;
      const dx = pos.x - player.x;
      const dy = pos.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = id;
      }
    }
    if (closest) {
      console.log("[enter] chatWithClosestNpc →", closest, "dist:", minDist.toFixed(3));
      handleGameNpcClick(closest);
      return true;
    }
    console.log("[enter] no visible NPC found");
    return false;
  }, [handleGameNpcClick]);

  // Enter key — priority-based interaction with the latest interactive element on screen
  // 1. Modals (speech bubbles, cutscenes) handle their own Enter
  // 2. Trinket nearby (within pickup range) → collect
  // 3. Arrow showing → rush toward target
  // 4. Visible NPC nearby → chat
  // 5. Nothing on screen → open phone
  const ENTER_PICKUP_DIST = 5; // world units — generous so Enter works after rush stops at ~2u
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code !== "Enter") return;
      console.log("[enter] hasModal:", hasModalRef.current, "trinketPhase:", trinketArrowRef.current, "tutorialComplete:", tutorialCompleteRef.current);
      if (hasModalRef.current) return; // modals handle their own Enter

      const dist = trinketTracker.current.distance;

      // Trinket phase: pick up if close, rush if far, skip delay if not spawned
      if (trinketArrowRef.current) {
        console.log("[enter] trinket phase, dist:", dist);
        if (dist > 0 && dist < ENTER_PICKUP_DIST) {
          console.log("[enter] picking up trinket");
          rushMode.current = 0;
          game.collectPart();
        } else if (dist > 0) {
          console.log("[enter] rushing toward trinket");
          handleRush();
        } else {
          console.log("[enter] trinket not spawned yet, waiting");
        }
        // dist === 0: World's listener handles spawning the trinket
        return;
      }

      // Find-NPC arrow → rush if arrow is visible, chat if close enough
      if (showArrowRef.current) {
        if (trinketTracker.current.showArrow) {
          handleRush();
          return;
        }
        // Arrow hidden = close to target NPC, fall through to chat
      }

      // Chat with closest visible NPC, or open phone as fallback
      if (tutorialCompleteRef.current) {
        if (!chatWithClosestNpc()) {
          togglePocket();
        }
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
  }, [handleRush, game.collectPart, togglePocket, chatWithClosestNpc]);

  // Derive flags for World component
  const part1CutsceneDone = game.state.partsCollected >= 1 && phase.type !== "part1-cutscene";
  const showArrow =
    phase.type === "exploring" ||
    phase.type === "between-parts" ||
    (findTargetNpcId !== null && phase.type === "free-play");
  const needsPocketHint = game.state.npcSpoken && !game.state.tutorialComplete && !game.state.phaseOverride;

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
    showPhoneHint ||
    !!moodCheckNpcId ||
    zoomIn;
  inputDisabled.current = hasModal;
  showArrowRef.current = showArrow;
  hasModalRef.current = hasModal;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
      <Canvas
        shadows={{ type: THREE.BasicShadowMap }}
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
          showNpc={game.state.assembled && phase.type !== "assembly-cutscene" && phase.type !== "assembly-reveal"}
          npcRelaxing={game.state.npcRelaxing}
          onNpcClick={handleNpcClick}
          onNpcWalkAway={handleNpcWalkAway}
          onNpcApproach={handleNpcApproach}
          cameraOffset={cameraOffset}
          cameraLookAtOffset={cameraLookAtOffset}
          hidePlayer={zoomIn}
          npcScreenPos={npcScreenPos}
          playerScreenPos={playerScreenPos}
          showGameNpcs={game.state.tutorialComplete}
          onMycoClick={() => handleGameNpcClick("myco")}
          onEmberClick={() => handleGameNpcClick("ember")}
          onSproutClick={() => handleGameNpcClick("sprout")}
          mycoScreenPos={mycoScreenPos}
          emberScreenPos={emberScreenPos}
          sproutScreenPos={sproutScreenPos}
          mycoAsleep={mycoAsleep}
          emberAsleep={emberAsleep}
          sproutAsleep={sproutAsleep}
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

      {showArrow && (
        <TrinketArrow tracker={trinketTracker} onRush={handleRush} />
      )}

      {/* Part 1 pickup cutscene */}
      {phase.type === "part1-cutscene" && (
        <PickupCutscene onDismiss={() => { console.log("[app] part1 cutscene dismissed"); game.clearOverride(); }} />
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

      {/* NPC intro after assembly — mood check then phone hint */}
      {showNpcIntro && !showPhoneHint && (
        <MoodSlider
          speakerScreenPos={npcScreenPos}
          playerScreenPos={playerScreenPos}
          greeting="I'm NPC Ryan - how are you today?"
          npcId="ryan"
          skipAsk
          isIntro
          onShowCustomize={() => setShowCustomizeMood(true)}
          onDone={() => {
            const prefs = getPreferences();
            if (prefs.useHaiku) {
              setShowNpcIntro(false);
              game.markNpcSpoken();
              setTimeout(() => game.npcWalkAway(false), 1000);
            } else {
              setShowPhoneHint(true);
            }
          }}
          onPlayGame={() => {
            setShowNpcIntro(false);
            game.completeIntro();
            setSelectedNpcId("ryan");
            game.setPhaseOverride({ type: "game-invite", npcId: "ryan" });
          }}
        />
      )}
      {showPhoneHint && (
        <SpeechBubble
          text="well hey - I'm in your phone if you ever want to chat or play a game"
          onDismiss={() => {
            setShowPhoneHint(false);
            setShowNpcIntro(false);
            game.markNpcSpoken();
            setTimeout(() => game.npcWalkAway(false), 1000);
          }}
          speakerScreenPos={npcScreenPos}
        />
      )}

      {/* Daily mood check — any NPC asks before chat starts */}
      {moodCheckNpcId && (
        <MoodSlider
          speakerScreenPos={
            moodCheckNpcId === "myco" ? mycoScreenPos :
            moodCheckNpcId === "ember" ? emberScreenPos :
            moodCheckNpcId === "sprout" ? sproutScreenPos :
            npcScreenPos
          }
          playerScreenPos={playerScreenPos}
          greeting={getNpcById(moodCheckNpcId)?.personality.greeting ?? "hey"}
          npcId={moodCheckNpcId}
          onShowCustomize={() => setShowCustomizeMood(true)}
          onDone={() => {
            const npcId = moodCheckNpcId;
            setMoodCheckNpcId(null);
            // Now proceed to normal chat flow
            const prefs = getPreferences();
            if (!prefs.optInShown) {
              setPendingChatNpcId(npcId);
              setShowOptIn(true);
            } else {
              setChatNpcId(npcId);
            }
          }}
          onPlayGame={() => {
            const npcId = moodCheckNpcId!;
            setMoodCheckNpcId(null);
            setSelectedNpcId(npcId);
            game.setPhaseOverride({ type: "game-invite", npcId });
          }}
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
      {/* NPC responds to "let's play a game" — speech bubble + player choices */}
      {phase.type === "game-invite" && (() => {
        const inviteNpc = getNpcById(phase.npcId);
        const npcPos = phase.npcId === "myco" ? mycoScreenPos :
          phase.npcId === "ember" ? emberScreenPos :
          phase.npcId === "sprout" ? sproutScreenPos : npcScreenPos;
        return (
          <>
            <SpeechBubble
              text={inviteNpc?.personality.gameInviteResponse ?? "which game?"}
              onDismiss={() => {}}
              speakerScreenPos={npcPos}
            />
            <ChoiceBubble
              speakerScreenPos={playerScreenPos}
              defaultIndex={1}
              choices={[
                {
                  label: "Spaces Game",
                  action: () => game.setPhaseOverride({ type: "game-accept", npcId: phase.npcId, playerChose: "spaces-game" }),
                },
                {
                  label: `You choose, ${inviteNpc?.displayName ?? "friend"}`,
                  action: () => game.setPhaseOverride({ type: "game-accept", npcId: phase.npcId, playerChose: "npc-choice" }),
                },
              ]}
            />
          </>
        );
      })()}

      {/* NPC pre-game text — dismiss launches the game directly */}
      {phase.type === "game-accept" && (() => {
        const acceptNpc = getNpcById(phase.npcId);
        const npcPos = phase.npcId === "myco" ? mycoScreenPos :
          phase.npcId === "ember" ? emberScreenPos :
          phase.npcId === "sprout" ? sproutScreenPos : npcScreenPos;
        return gameAcceptText ? (
          <SpeechBubble
            text={gameAcceptText}
            onDismiss={() => {
              const npc = getNpcById(phase.npcId);
              if (!npc) return;
              setSelectedNpcId(phase.npcId);
              setPlayingGameNpcId(phase.npcId);
              setGameAcceptText(null);
              try {
                localStorage.setItem("townage-playing-npc", phase.npcId);
                if (playerWorldPos.current) {
                  localStorage.setItem("townage-player-pos", JSON.stringify(playerWorldPos.current));
                }
              } catch {}
              launchGame(npc);
              game.launchGame();
            }}
            speakerScreenPos={npcPos}
          />
        ) : (
          <SpeechBubble
            text={`${acceptNpc?.emoji ?? ""} ...`}
            onDismiss={() => {}}
            speakerScreenPos={npcPos}
          />
        );
      })()}

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
          onTownReportClick={() => {
            game.setPhaseOverride({ type: "town-report" });
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
            onShowRank={(npcId) => game.setPhaseOverride({ type: "rank-detail", npcId })}
          />
        </PhoneOverlay>
      )}

      {/* Rank detail */}
      {phase.type === "rank-detail" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <RankDetail
            npcId={phase.npcId}
            onBack={() => game.setPhaseOverride({ type: "find-app" })}
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

      {/* Town report */}
      {phase.type === "town-report" && (
        <PhoneOverlay mode="app" onClose={() => game.clearOverride()}>
          <TownReport onBack={() => game.setPhaseOverride({ type: "phone-home" })} />
        </PhoneOverlay>
      )}

      {/* NPC chat bubble — player choosing what to say */}
      {chatNpcId && (
        <NpcChatBubble
          playerScreenPos={playerScreenPos}
          onSend={handleChatSend}
          onClose={chatContinue ? handleChatClose : () => { setChatNpcId(null); setChatRespondingNpcId(null); setChatResponse(null); }}
          onPlayGame={() => {
            const npcId = chatNpcId!;
            setChatNpcId(null);
            setChatResponse(null);
            setChatRespondingNpcId(null);
            setChatContinue(false);
            setSelectedNpcId(npcId);
            game.setPhaseOverride({ type: "game-invite", npcId });
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
            chatRespondingNpcId === "sprout" ? sproutScreenPos :
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
              chatRespondingNpcId === "sprout" ? sproutScreenPos :
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

      {/* Mood response customization modal */}
      {showCustomizeMood && (
        <MoodResponsesModal onClose={() => setShowCustomizeMood(false)} />
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
          onPhoneClick={undefined}
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
      t = setTimeout(() => onStepChange("npc-speech"), 1200);
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
            hey - that's a nice find! those little bots have a pretty cool game they can play... someday we'll get it built in here...
          </p>
        </div>
      )}
    </div>
  );
}

function PocketHint({ show }: { show: boolean }) {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!show) return null;

  return (
    <p
      style={{
        position: "fixed",
        bottom: isTouch ? 104 : 24,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#6a4c93",
        fontSize: 14,
        letterSpacing: 0.5,
        zIndex: 5,
        opacity: 0.8,
        animation: "pocket-pulse 1s ease-in-out infinite",
        whiteSpace: "nowrap",
      }}
    >
      {isTouch ? "tap the E button to open your phone" : "press E to check your pockets"}
    </p>
  );
}
