import { useEffect, useRef, useState, useCallback } from "react";
import { loadBubbleOffset, saveBubbleOffset } from "./bubble-offset";
import type { ScreenPos } from "../world/useScreenPosition";

interface ChoiceBubbleProps {
  choices: { label: string; action: () => void }[];
  /** Which choice is highlighted initially (default 0). */
  defaultIndex?: number;
  speakerScreenPos?: React.RefObject<ScreenPos>;
}

export function ChoiceBubble({ choices, defaultIndex = 0, speakerScreenPos }: ChoiceBubbleProps) {
  const [selected, setSelected] = useState(defaultIndex);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: "50%", top: "40%" });
  const [tailStyle, setTailStyle] = useState<React.CSSProperties>({});
  const [tailInnerStyle, setTailInnerStyle] = useState<React.CSSProperties>({});

  // Drag state
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
  const lastCalcPos = useRef({ x: 0, y: 0 });
  const lastSpeaker = useRef<{ x: number; y: number; charH: number }>({ x: 0, y: 0, charH: 80 });
  const savedCharHOffset = useRef({ x: 0, y: 0 });
  const justDragged = useRef(false);

  useEffect(() => {
    const saved = loadBubbleOffset("choice");
    if (saved) savedCharHOffset.current = saved;
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragging.current = true;
    dragStart.current = { mx: clientX, my: clientY, bx: rect.left, by: rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, [startDrag]);

  useEffect(() => {
    const moveAt = (clientX: number, clientY: number) => {
      if (!dragging.current) return;
      const dx = clientX - dragStart.current.mx;
      const dy = clientY - dragStart.current.my;
      const newX = dragStart.current.bx + dx;
      const newY = dragStart.current.by + dy;
      dragOffset.current = {
        x: newX - lastCalcPos.current.x,
        y: newY - lastCalcPos.current.y,
      };
      setPos({ left: `${newX}px`, top: `${newY}px` });
    };
    const endDrag = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (dragOffset.current) {
        justDragged.current = true;
        const sp = lastSpeaker.current;
        const off = dragOffset.current;
        const newOffset = {
          x: savedCharHOffset.current.x + off.x / sp.charH,
          y: savedCharHOffset.current.y + off.y / sp.charH,
        };
        savedCharHOffset.current = newOffset;
        dragOffset.current = null;
        saveBubbleOffset("choice", newOffset);
      }
    };
    const onMouseMove = (e: MouseEvent) => moveAt(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      moveAt(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);
    window.addEventListener("touchcancel", endDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", endDrag);
      window.removeEventListener("touchcancel", endDrag);
    };
  }, []);

  // Track speaker position
  useEffect(() => {
    if (!speakerScreenPos) return;
    let raf: number;
    const update = () => {
      const sp = speakerScreenPos.current;
      if (!sp || !sp.visible) {
        raf = requestAnimationFrame(update);
        return;
      }
      const px = sp.x * window.innerWidth;
      const py = sp.y * window.innerHeight;
      const bw = bubbleRef.current?.getBoundingClientRect().width ?? 260;
      const charH = sp.screenHeight || 80;
      const bh = bubbleRef.current?.getBoundingClientRect().height ?? 160;
      const gap = charH * 0.05;
      const baseX = Math.max(24, Math.min(window.innerWidth - bw - 24, px - bw / 2 - 20));
      const baseY = Math.max(20, py - charH * 0.3 - bh - gap);
      const bx = baseX + savedCharHOffset.current.x * charH;
      const by = baseY + savedCharHOffset.current.y * charH;
      lastCalcPos.current = { x: bx, y: by };
      lastSpeaker.current = { x: px, y: py, charH };
      if (!dragging.current) {
        setPos({ left: `${bx}px`, top: `${by}px` });
      }

      // Tail
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        const bubbleCenterX = rect.left + rect.width / 2;
        const dx = px - bubbleCenterX;
        const tailLeftPx = Math.max(20, Math.min(rect.width - 40, rect.width / 2 + dx * 0.5));
        setTailStyle({
          position: "absolute", bottom: -18, left: tailLeftPx,
          width: 0, height: 0,
          borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
          borderTop: "18px solid #222",
        });
        setTailInnerStyle({
          position: "absolute", bottom: -13, left: tailLeftPx + 2,
          width: 0, height: 0,
          borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
          borderTop: "15px solid #fff",
        });
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [speakerScreenPos]);

  // Keyboard: arrow keys + enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(choices.length - 1, s + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choices[selected]?.action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, choices]);

  return (
    <div
      ref={bubbleRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        padding: "14px 18px",
        background: "#fff",
        border: "3px solid #222",
        borderRadius: 20,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: dragging.current ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <div style={tailStyle} />
      <div style={tailInnerStyle} />

      {choices.map((c, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            if (justDragged.current) { justDragged.current = false; return; }
            c.action();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: i === selected ? "#f0e6ff" : "#f8f8f8",
            border: i === selected ? "2px solid #6a4c93" : "2px solid #ddd",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 14,
            color: "#333",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 12, color: i === selected ? "#6a4c93" : "transparent" }}>▸</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}
