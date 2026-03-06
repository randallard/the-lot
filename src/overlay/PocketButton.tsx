import { useState, useEffect } from "react";

interface PocketButtonProps {
  onClick: () => void;
  pulse?: boolean;
}

export function PocketButton({ onClick, pulse }: PocketButtonProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isTouchDevice) return null;

  return (
    <button
      onClick={onClick}
      style={{
        position: "fixed",
        bottom: 40,
        right: 40,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: pulse ? "rgba(106, 76, 147, 0.3)" : "rgba(255, 255, 255, 0.15)",
        border: pulse ? "2px solid rgba(106, 76, 147, 0.7)" : "2px solid rgba(255, 255, 255, 0.3)",
        color: pulse ? "rgba(106, 76, 147, 0.9)" : "rgba(255, 255, 255, 0.5)",
        fontSize: 22,
        cursor: "pointer",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
        animation: pulse ? "pocket-pulse 1s ease-in-out infinite" : "none",
      }}
    >
      E
    </button>
  );
}
