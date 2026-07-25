import { useState, useEffect } from "react";
import type { Emote } from "../services/emotes";

interface EmotePanelProps {
  emotes: Emote[];
  onPlay: (emote: Emote) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function EmotePanel({ emotes, onPlay, open, onToggle, onClose }: EmotePanelProps) {
  // Lazy initialiser rather than a mount effect: this is a client-only SPA with
  // no SSR, so `window` is available on first render and there is nothing to
  // hydrate against.
  const [isTouchDevice] = useState(
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
  );

  // Keyboard shortcuts: 1–9 play emotes[0–8], 0 plays emotes[9]
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const match = e.code.match(/^Digit(\d)$/);
      if (!match) return;
      const digit = parseInt(match[1]!);
      const idx = digit === 0 ? 9 : digit - 1;
      const emote = emotes[idx];
      if (emote) onPlay(emote);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [emotes, onPlay]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 39 }}
        />
      )}

      {/* Panel — floats above the emote button */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 104,
            right: 88,
            zIndex: 40,
            background: "rgba(20, 16, 36, 0.96)",
            border: "1px solid rgba(106, 76, 147, 0.4)",
            borderRadius: 14,
            padding: emotes.length === 0 ? "14px 16px" : "8px 0",
            minWidth: 160,
            maxHeight: 280,
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {emotes.length === 0 ? (
            <p style={{ color: "#666", fontSize: 12, margin: 0, textAlign: "center" }}>
              no emotes yet —{"\n"}build one in settings
            </p>
          ) : (
            emotes.map((emote, i) => (
              <button
                key={emote.id}
                onClick={() => onPlay(emote)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "10px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#ddd",
                  fontSize: 14,
                  fontWeight: 500,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(106,76,147,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {/* Key hint — only on non-touch */}
                {!isTouchDevice && i < 10 && (
                  <span style={{
                    fontSize: 11,
                    color: "#555",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontFamily: "monospace",
                    minWidth: 18,
                    textAlign: "center",
                  }}>
                    {i === 9 ? "0" : i + 1}
                  </span>
                )}
                {emote.name || "untitled"}
              </button>
            ))
          )}
        </div>
      )}

      {/* Toggle button — matches PocketButton style, sits left of it */}
      <button
          onClick={onToggle}
          style={{
            position: "fixed",
            bottom: 40,
            right: 104,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: open ? "rgba(106, 76, 147, 0.5)" : "rgba(255, 255, 255, 0.15)",
            border: open ? "2px solid rgba(106, 76, 147, 0.9)" : "2px solid rgba(255, 255, 255, 0.3)",
            color: open ? "rgba(180, 140, 220, 1)" : "rgba(255, 255, 255, 0.5)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            letterSpacing: "0.02em",
          }}
        >
          ✦
        </button>
    </>
  );
}
