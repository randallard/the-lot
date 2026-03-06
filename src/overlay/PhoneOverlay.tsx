import { useEffect, useState } from "react";

interface PhoneOverlayProps {
  onAppClick: () => void;
  onClose: () => void;
}

export function PhoneOverlay({ onAppClick, onClose }: PhoneOverlayProps) {
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyE") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        zIndex: 10,
      }}
    >
      {/* Phone */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 160,
          height: 280,
          background: "#111",
          borderRadius: 20,
          border: "3px solid #333",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        {/* App icon */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onAppClick();
          }}
          style={{
            width: 56,
            height: 56,
            background: "#6a4c93",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: nudge
              ? "0 0 20px rgba(106, 76, 147, 0.6)"
              : "0 0 10px rgba(106, 76, 147, 0.3)",
            animation: nudge ? "pocket-pulse 1s ease-in-out infinite" : "none",
          }}
        >
          {/* Bot icon */}
          <div
            style={{
              width: 24,
              height: 18,
              background: "#889099",
              borderRadius: 4,
            }}
          />
        </div>
        <p style={{ color: "#888", fontSize: 10 }}>get t' cheese</p>
      </div>

      {/* Nudge text */}
      {nudge && (
        <NudgeBubble />
      )}

      <p
        style={{
          color: "#555",
          fontSize: 12,
          marginTop: 24,
        }}
      >
        click outside to close
      </p>
    </div>
  );
}

function NudgeBubble() {
  return (
    <div
      style={{
        position: "fixed",
        top: "25%",
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
        just click that app you just installed...
      </p>
    </div>
  );
}
