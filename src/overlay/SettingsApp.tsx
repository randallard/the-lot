import { useState, useEffect, useCallback } from "react";
import {
  getPreferences,
  setPreferences,
  clearAllChats,
} from "../services/chat-storage";
import { ChatInfoModal } from "./ChatInfoModal";
import { EnthusiasmSettings } from "./EnthusiasmSettings";
import { MoodResponsesModal } from "./MoodResponsesModal";

interface SettingsAppProps {
  onClose: () => void;
}

const SETTINGS_ITEMS = 5; // AI toggle, NPC Vibes, Check-in, Privacy, Clear

export function SettingsApp({ onClose }: SettingsAppProps) {
  const [prefs, setPrefs] = useState(getPreferences);
  const [showInfo, setShowInfo] = useState(false);
  const [showCleared, setShowCleared] = useState(false);
  const [showEnthusiasm, setShowEnthusiasm] = useState(false);
  const [showMoodResponses, setShowMoodResponses] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const toggleHaiku = () => {
    const next = { ...prefs, useHaiku: !prefs.useHaiku, optInShown: true };
    setPreferences(next);
    setPrefs(next);
  };

  const handleClear = () => {
    clearAllChats();
    setShowCleared(true);
    setTimeout(() => setShowCleared(false), 2000);
  };

  const settingsActions = useCallback(() => [
    toggleHaiku,
    () => setShowEnthusiasm(true),
    () => setShowMoodResponses(true),
    () => setShowInfo(true),
    handleClear,
  ], []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((s) => Math.min(s + 1, SETTINGS_ITEMS - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        settingsActions()[selectedIdx]?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, settingsActions]);

  if (showEnthusiasm) {
    return <EnthusiasmSettings onBack={() => setShowEnthusiasm(false)} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "16px 4px",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            color: "#9b59b6",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          settings
        </p>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          close
        </button>
      </div>

      {/* Chat AI toggle */}
      <div
        style={{
          background: selectedIdx === 0 ? "#2a2a4e" : "#1a1a2e",
          border: selectedIdx === 0 ? "1px solid #6a4c93" : "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                color: "#ccc",
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
              }}
            >
              AI Responses
            </p>
            <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>
              {prefs.useHaiku
                ? "Powered by Claude Haiku"
                : "Using emoji responses"}
            </p>
          </div>
          <button
            onClick={toggleHaiku}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              background: prefs.useHaiku ? "#6a4c93" : "#333",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                background: "#fff",
                position: "absolute",
                top: 3,
                left: prefs.useHaiku ? 25 : 3,
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>

      {/* NPC Enthusiasm */}
      <button
        onClick={() => setShowEnthusiasm(true)}
        style={{
          background: selectedIdx === 1 ? "#2a2a4e" : "#1a1a2e",
          border: selectedIdx === 1 ? "1px solid #6a4c93" : "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              color: "#ccc",
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
            }}
          >
            NPC Vibes
          </p>
          <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>
            your mood + per-NPC energy
          </p>
        </div>
        <span style={{ color: "#666", fontSize: 14 }}>→</span>
      </button>

      {/* Check-in responses */}
      <button
        onClick={() => setShowMoodResponses(true)}
        style={{
          background: selectedIdx === 2 ? "#2a2a4e" : "#1a1a2e",
          border: selectedIdx === 2 ? "1px solid #6a4c93" : "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              color: "#ccc",
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Check-in Responses
          </p>
          <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>
            customize how you tell NPCs how you're doing
          </p>
        </div>
        <span style={{ color: "#666", fontSize: 14 }}>→</span>
      </button>

      {/* Privacy info */}
      <button
        onClick={() => setShowInfo(true)}
        style={{
          background: selectedIdx === 3 ? "#2a2a4e" : "#1a1a2e",
          border: selectedIdx === 3 ? "1px solid #6a4c93" : "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            color: "#ccc",
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Privacy & Chat Info
        </p>
        <span style={{ color: "#666", fontSize: 14 }}>→</span>
      </button>

      {/* Clear history */}
      <button
        onClick={handleClear}
        style={{
          background: selectedIdx === 4 ? "#2a2a4e" : "#1a1a2e",
          border: selectedIdx === 4 ? "1px solid #6a4c93" : "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <p
          style={{
            color: "#c0392b",
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {showCleared ? "Cleared!" : "Clear Chat History"}
        </p>
      </button>

      {showInfo && (
        <ChatInfoModal mode="privacy" onClose={() => setShowInfo(false)} />
      )}

      {showMoodResponses && (
        <MoodResponsesModal onClose={() => setShowMoodResponses(false)} />
      )}
    </div>
  );
}
