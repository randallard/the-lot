import { useState, useEffect } from "react";

interface PocketButtonProps {
  onClick: () => void;
}

export function PocketButton({ onClick }: PocketButtonProps) {
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
        background: "rgba(255, 255, 255, 0.15)",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 22,
        cursor: "pointer",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
      }}
    >
      E
    </button>
  );
}
