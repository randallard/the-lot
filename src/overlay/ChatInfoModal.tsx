import { useState } from "react";

interface ChatInfoModalProps {
  onClose: () => void;
  mode: "unavailable" | "privacy";
}

export function ChatInfoModal({ onClose, mode }: ChatInfoModalProps) {
  const [showPrivacy, setShowPrivacy] = useState(mode === "privacy");

  return (
    <div
      onClick={onClose}
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
          padding: "24px 20px",
          maxWidth: 340,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {!showPrivacy ? (
          <>
            <p
              style={{
                fontSize: 16,
                color: "#e0e0e0",
                fontWeight: 700,
                margin: 0,
              }}
            >
              NPC Unavailable
            </p>
            <p
              style={{
                fontSize: 14,
                color: "#999",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              This NPC can't generate a response right now. They've seen your
              message and will keep it in mind for later when they can respond.
            </p>
            <button
              onClick={() => setShowPrivacy(true)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "#6a4c93",
                border: "none",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                textDecoration: "underline",
              }}
            >
              Privacy & Chat Info
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 16,
                color: "#e0e0e0",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Privacy & Chat Info
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#999",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <strong style={{ color: "#ccc" }}>Chat history</strong> is stored
              locally in your browser (localStorage). It never leaves your
              device unless AI responses are enabled.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#999",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <strong style={{ color: "#ccc" }}>When AI is enabled</strong>,
              your messages are sent through a secure proxy to Anthropic's API
              (Claude Haiku). Our proxy does not store any messages — it's
              stateless.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#999",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <strong style={{ color: "#ccc" }}>You control your data.</strong>{" "}
              You can disable AI responses or clear all chat history anytime in
              Settings.
            </p>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            padding: "10px 16px",
            background: "transparent",
            color: "#666",
            border: "1px solid #333",
            borderRadius: 10,
            fontSize: 13,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          close
        </button>
      </div>
    </div>
  );
}
