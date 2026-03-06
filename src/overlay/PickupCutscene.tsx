import { useEffect, useState } from "react";

interface PickupCutsceneProps {
  onDismiss: () => void;
}

export function PickupCutscene({ onDismiss }: PickupCutsceneProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.1s linear",
        zIndex: 10,
      }}
    >
      {/* The trinket */}
      <div
        style={{
          width: 80,
          height: 60,
          background: "#889099",
          borderRadius: 4,
          transform: "rotate(6deg)",
          boxShadow: "0 0 40px rgba(136, 144, 153, 0.4)",
          marginBottom: 32,
        }}
      />

      <p
        style={{
          color: "#d0d0d0",
          fontSize: 24,
          letterSpacing: 1.5,
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        It's a cute little trinket.
      </p>

      <p
        style={{
          color: "#666666",
          fontSize: 13,
          marginTop: 40,
        }}
      >
        click to continue
      </p>
    </div>
  );
}
