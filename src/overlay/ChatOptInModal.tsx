interface ChatOptInModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ChatOptInModal({ onAccept, onDecline }: ChatOptInModalProps) {
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
            background: "#6a4c93",
            color: "#fff",
            border: "none",
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
            background: "transparent",
            color: "#888",
            border: "1px solid #333",
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
