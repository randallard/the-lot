import { useState } from "react";
import {
  getPreferences,
  setPreferences,
  clearAllChats,
} from "../services/chat-storage";
import { ChatInfoModal } from "./ChatInfoModal";

interface SettingsAppProps {
  onClose: () => void;
}

export function SettingsApp({ onClose }: SettingsAppProps) {
  const [prefs, setPrefs] = useState(getPreferences);
  const [showInfo, setShowInfo] = useState(false);
  const [showCleared, setShowCleared] = useState(false);

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
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
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

      {/* Privacy info */}
      <button
        onClick={() => setShowInfo(true)}
        style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
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
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
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
    </div>
  );
}
