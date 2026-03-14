import { useEffect, useRef, useState, useCallback } from "react";
import type { ScreenPos } from "../world/useScreenPosition";
import { loadBubbleOffset, saveBubbleOffset } from "./bubble-offset";

interface NpcChatBubbleProps {
  playerScreenPos: React.RefObject<ScreenPos>;
  onSend: (message: string) => void;
  onClose: () => void;
  onPlayGame?: () => void;
  continueMode?: boolean;
  /** Pre-fill the text input (e.g. Haiku's suggested reply). */
  defaultText?: string;
  /** When true, start with "let's play" selected instead of text input. */
  defaultPlay?: boolean;
}

export function NpcChatBubble({
  playerScreenPos,
  onSend,
  onClose,
  onPlayGame,
  continueMode,
  defaultText,
  defaultPlay,
}: NpcChatBubbleProps) {
  // 0 = text input, 1 = play game
  const [selected, setSelected] = useState(defaultPlay && onPlayGame ? 1 : 0);
  const [text, setText] = useState(defaultText ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: "50%", top: "40%" });
  const [positioned, setPositioned] = useState(false);
  const [tailStyle, setTailStyle] = useState<React.CSSProperties>({});
  const [tailInnerStyle, setTailInnerStyle] = useState<React.CSSProperties>({});

  // Drag state
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
  const lastCalcPos = useRef({ x: 0, y: 0 });
  const lastSpeaker = useRef<{ x: number; y: number; charH: number }>({ x: 0, y: 0, charH: 80 });
  const savedCharHOffset = useRef({ x: 0, y: 0 });

  // Load saved offset preference for current screen size
  useEffect(() => {
    const saved = loadBubbleOffset("pc");
    if (saved) savedCharHOffset.current = saved;
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragging.current = true;
    dragStart.current = { mx: clientX, my: clientY, bx: rect.left, by: rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the bubble border area on desktop, not from interactive elements
    if ((e.target as HTMLElement).closest("button, input")) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // On mobile, allow dragging from anywhere on the bubble
    if ((e.target as HTMLElement).closest("input")) return;
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
        const sp = lastSpeaker.current;
        const off = dragOffset.current;
        const newOffset = {
          x: savedCharHOffset.current.x + off.x / sp.charH,
          y: savedCharHOffset.current.y + off.y / sp.charH,
        };
        savedCharHOffset.current = newOffset;
        dragOffset.current = null;
        saveBubbleOffset("pc", newOffset);
        console.log(
          `[NpcChatBubble] saved PC offset: x=${newOffset.x.toFixed(2)}, y=${newOffset.y.toFixed(2)} charH`
        );
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

  // Auto-focus input (unless "let's play" is pre-selected)
  useEffect(() => {
    if (!(defaultPlay && onPlayGame)) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, []);

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
      const bw = bubbleRef.current?.getBoundingClientRect().width ?? 260;
      const charH = sp.screenHeight || 80;
      const bh = bubbleRef.current?.getBoundingClientRect().height ?? 160;
      const gap = charH * 0.05;
      // Base position + saved charH offset
      const baseX = Math.max(24, Math.min(window.innerWidth - bw - 24, px - bw / 2 - 20));
      const baseY = Math.max(20, py - charH * 0.3 - bh - gap);
      const bx = baseX + savedCharHOffset.current.x * charH;
      const by = baseY + savedCharHOffset.current.y * charH;
      lastCalcPos.current = { x: bx, y: by };
      lastSpeaker.current = { x: px, y: py, charH };
      if (!dragging.current) {
        setPos({ left: `${bx}px`, top: `${by}px` });
      }
      setPositioned(true);

      // Tail points toward the player from the bubble bottom
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        const bubbleCenterX = rect.left + rect.width / 2;
        const dx = px - bubbleCenterX;
        const tailLeftPx = Math.max(20, Math.min(rect.width - 40, rect.width / 2 + dx * 0.5));

        setTailStyle({
          position: "absolute",
          bottom: -18,
          left: tailLeftPx,
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop: "18px solid #222",
        });
        setTailInnerStyle({
          position: "absolute",
          bottom: -13,
          left: tailLeftPx + 2,
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "15px solid #fff",
        });
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [playerScreenPos]);

  // 0 = text input, 1 = play game
  const optionCount = onPlayGame ? 2 : 1;

  // Keyboard navigation (only when input is not focused)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? -1 : 1;
        setSelected((s) => {
          const next = ((s + dir) % optionCount + optionCount) % optionCount;
          if (next === 0) setTimeout(() => inputRef.current?.focus(), 0);
          return next;
        });
      } else if (e.key === "Enter") {
        if (selected === 1 && onPlayGame) onPlayGame();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, onClose, onPlayGame, optionCount]);

  const playGameButton = onPlayGame && (
    <OptionButton
      label="let's play a game"
      selected={selected === 1}
      onClick={onPlayGame}
      onFocus={() => setSelected(1)}
    />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: continueMode ? "transparent" : "rgba(0, 0, 0, 0.2)",
          zIndex: 15,
        }}
      />

      {/* Bubble */}
      <div
        ref={bubbleRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => e.stopPropagation()}
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
          minWidth: continueMode ? 200 : 240,
          cursor: dragging.current ? "grabbing" : "grab",
          opacity: positioned ? 1 : 0,
          transition: "opacity 0.15s ease-in",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Tail pointing at player */}
        <div style={tailStyle} />
        <div style={tailInnerStyle} />

        <TextInput
          ref={inputRef}
          text={text}
          setText={setText}
          selected={selected === 0}
          onFocus={() => setSelected(0)}
          onSend={(msg) => { onSend(msg); setText(""); }}
          onClose={onClose}
          onPrevNext={(dir) => {
            if (onPlayGame && dir === "down") {
              setSelected(1);
              inputRef.current?.blur();
            }
          }}
        />
        {playGameButton}
      </div>
    </>
  );
}

function OptionButton({ label, selected, onClick, onFocus }: {
  label: string;
  selected: boolean;
  onClick: () => void;
  onFocus: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onFocus={onFocus}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: selected ? "#f0e6ff" : "#f8f8f8",
        border: selected ? "2px solid #6a4c93" : "2px solid #ddd",
        borderRadius: 12,
        cursor: "pointer",
        fontSize: 14,
        color: "#333",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 12, color: selected ? "#6a4c93" : "transparent" }}>▸</span>
      {label}
    </button>
  );
}

import { forwardRef } from "react";

const TextInput = forwardRef<HTMLInputElement, {
  text: string;
  setText: (t: string) => void;
  selected: boolean;
  onFocus: () => void;
  onSend: (msg: string) => void;
  onClose: () => void;
  onPrevNext: (dir: "up" | "down") => void;
}>(({ text, setText, selected, onFocus, onSend, onClose, onPrevNext }, ref) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 4px 4px 14px",
      background: selected ? "#f0e6ff" : "#f8f8f8",
      border: selected ? "2px solid #6a4c93" : "2px solid #ddd",
      borderRadius: 12,
    }}
  >
    <input
      ref={ref}
      type="text"
      placeholder="say something..."
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        onFocus();
        e.currentTarget.select();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          if (text.trim()) {
            onSend(text.trim());
          } else {
            onClose();
          }
        } else if (e.key === "Escape") {
          onClose();
        } else if ((e.key === "Tab" || e.key === "ArrowUp") && !e.shiftKey) {
          e.preventDefault();
          onPrevNext("up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onPrevNext("down");
        }
      }}
      style={{
        flex: 1,
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: 14,
        color: "#333",
        padding: "6px 0",
      }}
    />
    <button
      onClick={() => { if (text.trim()) onSend(text.trim()); }}
      style={{
        padding: "6px 12px",
        background: text.trim() ? "#6a4c93" : "#ccc",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
        cursor: text.trim() ? "pointer" : "default",
        fontWeight: 600,
      }}
    >
      chat
    </button>
  </div>
));
