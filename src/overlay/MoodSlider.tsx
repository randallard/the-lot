import { useState, useCallback, useRef, useEffect } from "react";
import { DEFAULT_LEVEL, MIN_LEVEL, MAX_LEVEL, setMoodToday } from "../services/enthusiasm";
import { getMoodResponse } from "../services/mood-responses";
import { getPreferences, setPreferences } from "../services/chat-storage";
import { getNpcById } from "../config/npcs";
import { SpeechBubble } from "./SpeechBubble";
import { ChatOptInModal } from "./ChatOptInModal";
import type { ScreenPos } from "../world/useScreenPosition";

interface MoodSliderProps {
  onDone: () => void;
  speakerScreenPos: React.RefObject<ScreenPos>;
  playerScreenPos: React.RefObject<ScreenPos>;
  greeting: string;
  npcId: string;
  /** When true, greeting already contains the question — skip the separate "how you doin?" step. */
  skipAsk?: boolean;
  onShowCustomize?: () => void;
}

type Step = "greeting" | "asking" | "responding" | "npc-reply" | "player-reply" | "npc-followup";
type FocusRow = "slider" | "text" | "buttons";
const FOCUS_ROWS: FocusRow[] = ["slider", "text", "buttons"];

/** One below middle — the "don't answer" default. */
const SKIP_LEVEL = DEFAULT_LEVEL - 1;

export function MoodSlider({
  onDone,
  speakerScreenPos,
  playerScreenPos,
  greeting,
  npcId,
  skipAsk,
  onShowCustomize,
}: MoodSliderProps) {
  const [step, setStep] = useState<Step>("greeting");
  const [value, setValue] = useState(DEFAULT_LEVEL);
  const [freeText, setFreeText] = useState("");
  const [npcReply, setNpcReply] = useState<string | null>(null);
  const [npcContinues, setNpcContinues] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [focusRow, setFocusRow] = useState<FocusRow>("slider");
  const [selectedBtn, setSelectedBtn] = useState(0);
  const sliderRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const btnCount = onShowCustomize ? 3 : 2;
  const [showOptIn, setShowOptIn] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ level: number; answer: string } | null>(null);

  const npcConfig = getNpcById(npcId);
  const systemPrompt = (npcConfig?.personality.systemPrompt ?? "You are a friendly NPC.") + " Keep it very short — a few words, max one sentence.";

  const sendToHaiku = useCallback((msgs: { role: string; content: string }[], onResult: (dialogue: string, continues: boolean) => void) => {
    fetch("/api/npc-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt,
        messages: msgs,
        useTool: true,
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => onResult(data.dialogue, !!data.continues))
      .catch(() => onResult("alright", false));
  }, [systemPrompt]);

  const doSubmitMood = useCallback((level: number, playerAnswer: string, useHaiku: boolean) => {
    setMoodToday(level);

    if (!useHaiku) {
      // Scripted fallback — "alright!" only for high slider AND no free text
      const usedFreeText = playerAnswer !== `Hi, I'm ${getMoodResponse(level)}` && playerAnswer !== "I'd rather not say";
      setNpcReply((!usedFreeText && level >= 4) ? "alright!" : "alright");
      setNpcContinues(false);
      setStep("npc-reply");
      return;
    }

    const msgs = [
      { role: "user", content: `The player answered "${playerAnswer}" to "how are you doing today?" Give a brief, supportive response. You may ask a follow-up or make a friendly offer if it feels natural, or just acknowledge warmly.` },
    ];
    setChatHistory(msgs);

    sendToHaiku(msgs, (dialogue, continues) => {
      setNpcReply(dialogue);
      setNpcContinues(continues);
      setChatHistory((prev) => [...prev, { role: "assistant", content: dialogue }]);
      setStep("npc-reply");
    });
  }, [sendToHaiku]);

  const submitMood = useCallback((level: number, playerAnswer: string) => {
    const prefs = getPreferences();
    if (!prefs.optInShown) {
      // Need to ask about AI first
      setPendingSubmit({ level, answer: playerAnswer });
      setShowOptIn(true);
      return;
    }
    doSubmitMood(level, playerAnswer, prefs.useHaiku);
  }, [doSubmitMood]);

  const handleOptIn = useCallback((useHaiku: boolean) => {
    setPreferences({ useHaiku, optInShown: true });
    setShowOptIn(false);
    if (pendingSubmit) {
      doSubmitMood(pendingSubmit.level, pendingSubmit.answer, useHaiku);
      setPendingSubmit(null);
    }
  }, [pendingSubmit, doSubmitMood]);

  const handleDone = useCallback(() => {
    const answer = freeText.trim() || `Hi, I'm ${getMoodResponse(value)}`;
    submitMood(value, answer);
  }, [value, freeText, submitMood]);

  const handleSkip = useCallback(() => {
    submitMood(SKIP_LEVEL, "I'd rather not say");
  }, [submitMood]);

  const handlePlayerReply = useCallback(() => {
    const text = replyText.trim();
    if (!text) return;
    const newMsgs = [...chatHistory, { role: "user", content: text }];
    setChatHistory(newMsgs);
    setNpcReply(null);
    setStep("npc-followup");

    sendToHaiku(newMsgs, (dialogue, continues) => {
      setNpcReply(dialogue);
      setNpcContinues(continues);
      setChatHistory((prev) => [...prev, { role: "assistant", content: dialogue }]);
    });
  }, [replyText, chatHistory, sendToHaiku]);

  // Focus management for responding step
  useEffect(() => {
    if (step !== "responding" || showOptIn) return;
    if (focusRow === "slider") {
      sliderRef.current?.focus();
    } else if (focusRow === "text") {
      inputRef.current?.focus();
    } else {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [focusRow, step, showOptIn]);

  // Keyboard nav for responding step — capture phase so we intercept before native input handling
  useEffect(() => {
    if (step !== "responding" || showOptIn) return;
    const onKey = (e: KeyboardEvent) => {
      // Skip if typing in an external input (e.g. MoodResponsesModal)
      const target = e.target as HTMLElement;
      const isOurInput = target === sliderRef.current || target === inputRef.current;
      if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && !isOurInput) return;

      // Up/Down/Tab → switch rows
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const idx = FOCUS_ROWS.indexOf(focusRow);
        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          setFocusRow(FOCUS_ROWS[Math.max(0, idx - 1)]);
        } else {
          setFocusRow(FOCUS_ROWS[Math.min(FOCUS_ROWS.length - 1, idx + 1)]);
        }
        return;
      }

      // Button row: left/right switch buttons, Enter activates
      if (focusRow === "buttons") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSelectedBtn((s) => Math.max(0, s - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSelectedBtn((s) => Math.min(s + 1, btnCount - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (selectedBtn === 0) handleDone();
          else if (selectedBtn === 1) handleSkip();
          else if (selectedBtn === 2) onShowCustomize?.();
        }
        return;
      }

      // Slider row: Enter submits
      if (focusRow === "slider" && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleDone();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step, showOptIn, focusRow, selectedBtn, btnCount, handleDone, handleSkip, onShowCustomize]);

  // Step 1: NPC greets
  if (step === "greeting") {
    return (
      <SpeechBubble
        text={greeting}
        onDismiss={() => setStep(skipAsk ? "responding" : "asking")}
        speakerScreenPos={speakerScreenPos}
      />
    );
  }

  // Step 2: NPC asks how you're doing
  if (step === "asking") {
    return (
      <SpeechBubble
        text="how you doin today?"
        onDismiss={() => setStep("responding")}
        speakerScreenPos={speakerScreenPos}
      />
    );
  }

  // Step 4: NPC reply to player's answer
  if (step === "npc-reply") {
    if (!npcReply) {
      return (
        <SpeechBubble
          text="..."
          onDismiss={() => {}}
          speakerScreenPos={speakerScreenPos}
        />
      );
    }
    return (
      <SpeechBubble
        text={npcReply}
        onDismiss={npcContinues ? () => { setReplyText(""); setStep("player-reply"); } : onDone}
        speakerScreenPos={speakerScreenPos}
      />
    );
  }

  // Step 5: Player replies to NPC's follow-up
  if (step === "player-reply") {
    return (
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200 }}>
        {replyText.trim() && (
          <SpeechBubble
            text={replyText}
            onDismiss={() => {}}
            speakerScreenPos={playerScreenPos}
          />
        )}
        <div
          style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            display: "flex", justifyContent: "center",
            paddingBottom: 40, pointerEvents: "none", zIndex: 201,
          }}
        >
          <div
            style={{
              background: "#1a1a2e", border: "1px solid #2a2a3e",
              borderRadius: 16, padding: "14px 20px 16px",
              minWidth: 240, maxWidth: 300,
              display: "flex", gap: 6, pointerEvents: "auto",
            }}
          >
            <input
              ref={replyInputRef}
              type="text"
              placeholder="say something..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && replyText.trim()) {
                  e.stopPropagation();
                  handlePlayerReply();
                }
              }}
              autoFocus
              style={{
                flex: 1, padding: "8px 12px",
                background: "#12121e", border: "1px solid #3a3a4e",
                borderRadius: 8, color: "#ccc", fontSize: 13, outline: "none",
              }}
            />
            <button
              onClick={() => handlePlayerReply()}
              disabled={!replyText.trim()}
              style={{
                padding: "8px 14px",
                background: replyText.trim() ? "#6a4c93" : "#333",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 13, cursor: replyText.trim() ? "pointer" : "default", fontWeight: 600,
              }}
            >
              →
            </button>
            <button
              onClick={onDone}
              style={{
                padding: "8px 12px", background: "transparent",
                border: "1px solid #3a3a4e", borderRadius: 10,
                color: "#aaa", fontSize: 12, cursor: "pointer",
              }}
            >
              bye
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 6: NPC follow-up reply
  if (step === "npc-followup") {
    if (!npcReply) {
      return (
        <SpeechBubble
          text="..."
          onDismiss={() => {}}
          speakerScreenPos={speakerScreenPos}
        />
      );
    }
    return (
      <SpeechBubble
        text={npcReply}
        onDismiss={npcContinues ? () => { setReplyText(""); setStep("player-reply"); } : onDone}
        speakerScreenPos={speakerScreenPos}
      />
    );
  }

  // Step 3: Player responds with slider — bubble points at player
  const responseText = freeText.trim() || `Hi, I'm ${getMoodResponse(value)}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 200,
      }}
    >
      {/* Player speech bubble — shows their current response */}
      <SpeechBubble
        text={responseText}
        onDismiss={() => {}}
        speakerScreenPos={playerScreenPos}
      />

      {/* Slider card — bottom center (hidden when opt-in modal is showing) */}
      {!showOptIn && <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          paddingBottom: 40,
          pointerEvents: "none",
          zIndex: 201,
        }}
      >
        <div
          style={{
            background: "#1a1a2e",
            border: "1px solid #2a2a3e",
            borderRadius: 16,
            padding: "14px 20px 16px",
            minWidth: 240,
            maxWidth: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              padding: "4px 8px",
              borderRadius: 8,
              border: focusRow === "slider" ? "1px solid #6a4c93" : "1px solid transparent",
            }}
          >
            <input
              ref={sliderRef}
              type="range"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              value={value}
              onChange={(e) => { setValue(Number(e.target.value)); setFreeText(""); }}
              style={{ width: "100%", accentColor: "#6a4c93" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                fontSize: 10,
                color: "#888",
              }}
            >
              <span>chill</span>
              <span>pumped</span>
            </div>
          </div>

          {/* Free text — say something else */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="or say something else..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleDone();
                }
              }}
              style={{
                flex: 1,
                padding: "6px 10px",
                background: "#12121e",
                border: focusRow === "text" ? "1px solid #6a4c93" : "1px solid #3a3a4e",
                borderRadius: 8,
                color: "#ccc",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
            <button
              onClick={handleDone}
              style={{
                flex: 1,
                padding: "8px 0",
                background: focusRow === "buttons" && selectedBtn === 0 ? "#7d5ba6" : "#6a4c93",
                color: "#fff",
                border: focusRow === "buttons" && selectedBtn === 0 ? "2px solid #9b8abf" : "2px solid transparent",
                borderRadius: 10,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {freeText.trim() ? "send" : value <= 2 ? "yeah" : value >= 4 ? "let's go" : "cool"}
            </button>
            <button
              onClick={handleSkip}
              style={{
                padding: "8px 12px",
                background: focusRow === "buttons" && selectedBtn === 1 ? "#2a2a3e" : "transparent",
                border: focusRow === "buttons" && selectedBtn === 1 ? "2px solid #9b8abf" : "1px solid #3a3a4e",
                borderRadius: 10,
                color: focusRow === "buttons" && selectedBtn === 1 ? "#ccc" : "#aaa",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              don't answer
            </button>
            {onShowCustomize && (
              <button
                onClick={onShowCustomize}
                style={{
                  background: "transparent",
                  border: focusRow === "buttons" && selectedBtn === 2 ? "1px solid #9b8abf" : "none",
                  color: focusRow === "buttons" && selectedBtn === 2 ? "#c0a8e0" : "#9b8abf",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "4px 2px",
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                (?)
              </button>
            )}
          </div>
        </div>
      </div>}

      {showOptIn && (
        <ChatOptInModal
          onAccept={() => handleOptIn(true)}
          onDecline={() => handleOptIn(false)}
        />
      )}
    </div>
  );
}
