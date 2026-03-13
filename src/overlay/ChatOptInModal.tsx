import { useState, useEffect, useCallback } from "react";

interface ChatOptInModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ChatOptInModal({ onAccept, onDecline }: ChatOptInModalProps) {
  const [selected, setSelected] = useState(0); // 0 = accept, 1 = decline

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
        e.preventDefault();
        setSelected((s) => (s === 0 ? 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selected === 0) onAccept();
        else onDecline();
      }
    },
    [selected, onAccept, onDecline],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        zIndex: 30,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a2e",
          borderRadius: 20,
          border: "1px solid #2a2a3e",
          padding: "28px 24px",
          maxWidth: 360,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 20,
            color: "#e0e0e0",
            fontWeight: 700,
            margin: 0,
            textAlign: "center",
          }}
        >
          Chat with NPCs
        </p>

        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: 0 }}>
          You can chat with the NPCs in Townage! When enabled, responses are
          powered by Claude Haiku (Anthropic).
        </p>

        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: 0 }}>
          Your messages are sent through a secure proxy — nothing is stored on
          our servers. Chat history lives only in your browser.
        </p>

        <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
          You can change this anytime in Settings.
        </p>

        <button
          onClick={onAccept}
          style={{
            padding: "12px 20px",
            background: selected === 0 ? "#6a4c93" : "#3a3a4e",
            color: "#fff",
            border: selected === 0 ? "2px solid #9b8abf" : "2px solid transparent",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Enable AI Responses
        </button>

        <button
          onClick={onDecline}
          style={{
            padding: "10px 20px",
            background: selected === 1 ? "#2a2a3e" : "transparent",
            color: selected === 1 ? "#ccc" : "#888",
            border: selected === 1 ? "2px solid #9b8abf" : "1px solid #333",
            borderRadius: 12,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          No thanks (use emoji)
        </button>
      </div>
    </div>
  );
}
