import { useEffect, useRef, useState } from "react";
import type { ScreenPos } from "../world/useScreenPosition";

interface ThoughtBubbleProps {
  choices: { label: string; action: () => void }[];
  playerScreenPos?: React.RefObject<ScreenPos>;
}

export function ThoughtBubble({ choices, playerScreenPos }: ThoughtBubbleProps) {
  const [pos, setPos] = useState({ left: "50%", top: "40%" });
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Track player position
  useEffect(() => {
    if (!playerScreenPos) return;
    let raf: number;
    const update = () => {
      const sp = playerScreenPos.current;
      if (!sp || !sp.visible) {
        raf = requestAnimationFrame(update);
        return;
      }
      const px = sp.x * window.innerWidth;
      const py = sp.y * window.innerHeight;
      const bx = Math.max(24, Math.min(window.innerWidth - 280, px - 120));
      const by = Math.max(20, py - 140);
      setPos({ left: `${bx}px`, top: `${by}px` });
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [playerScreenPos]);

  return (
    <div
      ref={bubbleRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        padding: "16px 20px",
        background: "#fff",
        border: "3px solid #aaa",
        borderRadius: 24,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Thought bubble dots */}
      <div style={{
        position: "absolute", bottom: -12, right: 30,
        width: 10, height: 10, borderRadius: "50%",
        background: "#fff", border: "2px solid #aaa",
      }} />
      <div style={{
        position: "absolute", bottom: -22, right: 22,
        width: 7, height: 7, borderRadius: "50%",
        background: "#fff", border: "2px solid #aaa",
      }} />

      {choices.map((c, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); c.action(); }}
          style={{
            padding: "8px 20px",
            background: "#f8f8f8",
            border: "2px solid #ddd",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 14,
            color: "#333",
            textAlign: "left",
          }}
          onPointerEnter={(e) => {
            (e.target as HTMLElement).style.background = "#eee";
            (e.target as HTMLElement).style.borderColor = "#6a4c93";
          }}
          onPointerLeave={(e) => {
            (e.target as HTMLElement).style.background = "#f8f8f8";
            (e.target as HTMLElement).style.borderColor = "#ddd";
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
