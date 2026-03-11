import { useState } from "react";
import { isBubbleHintDismissed, dismissBubbleHint } from "./bubble-offset";

interface BubbleHintProps {
  show: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function BubbleHint({ show, onExpandedChange }: BubbleHintProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(isBubbleHintDismissed);

  const expand = () => {
    setExpanded(true);
    onExpandedChange?.(true);
  };

  const dismiss = () => {
    setExpanded(false);
    setDismissed(true);
    dismissBubbleHint();
    onExpandedChange?.(false);
  };

  if (!show || dismissed) return null;

  if (expanded) {
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
            Speech Bubbles
          </p>

          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: 0 }}>
            Drag speech bubbles to position them for your screen — your
            preference saves per screen size.
          </p>

          <button
            onClick={dismiss}
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
            got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={expand}
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        border: "2px solid #6a4c93",
        borderRadius: 20,
        padding: "6px 16px",
        zIndex: 30,
        cursor: "pointer",
        color: "#6a4c93",
        fontSize: 13,
        fontWeight: 600,
        opacity: 0.9,
        animation: "pocket-pulse 1s ease-in-out infinite",
      }}
    >
      speech bubbles...
    </button>
  );
}
