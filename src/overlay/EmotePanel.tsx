import type { Emote } from "../services/emotes";

interface EmotePanelProps {
  emotes: Emote[];
  onPlay: (emote: Emote) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function EmotePanel({ emotes, onPlay, open, onToggle, onClose }: EmotePanelProps) {
  return (
    <>
      {/* Backdrop — closes panel when tapping outside */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 39,
          }}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 16,
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
            emotes.map(emote => (
              <button
                key={emote.id}
                onClick={() => onPlay(emote)}
                style={{
                  display: "block",
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
                {emote.name || "untitled"}
              </button>
            ))
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          position: "fixed",
          bottom: 44,
          right: 16,
          zIndex: 41,
          background: open ? "rgba(106, 76, 147, 0.9)" : "rgba(20, 16, 36, 0.85)",
          border: "1px solid rgba(106, 76, 147, 0.5)",
          borderRadius: 20,
          padding: "6px 14px",
          color: open ? "#fff" : "#aaa",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        emote
      </button>
    </>
  );
}
