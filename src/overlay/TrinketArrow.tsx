import { useRef, useState, useEffect } from "react";
import type { TrinketTrackerState } from "../world/useTrinketTracker";

interface TrinketArrowProps {
  tracker: React.RefObject<TrinketTrackerState>;
  onRush: () => void;
}

export function TrinketArrow({ tracker, onRush }: TrinketArrowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf: number;
    const update = () => {
      if (!tracker.current) {
        raf = requestAnimationFrame(update);
        return;
      }

      const { showArrow, screenX, screenY, angle } = tracker.current;

      if (showArrow !== visible) setVisible(showArrow);

      if (showArrow && ref.current) {
        const pad = 60;
        const x = Math.max(pad, Math.min(window.innerWidth - pad, screenX * window.innerWidth));
        const y = Math.max(pad, Math.min(window.innerHeight - pad, screenY * window.innerHeight));

        ref.current.style.left = `${x}px`;
        ref.current.style.top = `${y}px`;
        ref.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [tracker, visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      onClick={onRush}
      style={{
        position: "fixed",
        cursor: "pointer",
        zIndex: 5,
        opacity: 0.6,
        transition: "opacity 0.15s",
      }}
      onPointerEnter={(e) => {
        (e.target as HTMLElement).style.opacity = "1";
      }}
      onPointerLeave={(e) => {
        (e.target as HTMLElement).style.opacity = "0.6";
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderBottom: "28px solid rgba(140, 80, 200, 0.8)",
        }}
      />
      <p
        style={{
          color: "#8c50c8",
          fontSize: 10,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        rush
      </p>
    </div>
  );
}
