import { useEffect, useRef, useState, useCallback } from "react";
import type { ScreenPos } from "../world/useScreenPosition";
import { loadBubbleOffset, saveBubbleOffset } from "./bubble-offset";

interface SpeechBubbleProps {
  text: string;
  onDismiss: () => void;
  delay?: number;
  autoClose?: number; // Auto-dismiss after this many ms (no click-to-dismiss)
  inModal?: boolean; // When true, use fixed left position with left-pointing tail
  speakerScreenPos?: React.RefObject<ScreenPos>; // Screen position of speaker
}

export function SpeechBubble({
  text,
  onDismiss,
  delay = 0,
  autoClose,
  inModal,
  speakerScreenPos,
}: SpeechBubbleProps) {
  const [visible, setVisible] = useState(delay === 0);
  const [ready, setReady] = useState(false);
  const [positioned, setPositioned] = useState(false); // world-mode: wait for first position
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [tailStyle, setTailStyle] = useState<React.CSSProperties>({});
  const [tailInnerStyle, setTailInnerStyle] = useState<React.CSSProperties>({});
  const [bubblePos, setBubblePos] = useState<{ left: string; top: string }>({
    left: "24px",
    top: "30%",
  });

  // Drag state
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
  const lastCalcPos = useRef({ x: 0, y: 0 });
  const lastSpeaker = useRef<{ x: number; y: number; charH: number }>({ x: 0, y: 0, charH: 80 });
  const savedCharHOffset = useRef({ x: 0, y: 0 });

  // Load saved offset preference for current screen size
  useEffect(() => {
    const saved = loadBubbleOffset("npc");
    if (saved) savedCharHOffset.current = saved;
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (inModal) return;
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragging.current = true;
    dragStart.current = { mx: clientX, my: clientY, bx: rect.left, by: rect.top };
  }, [inModal]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
      setBubblePos({ left: `${newX}px`, top: `${newY}px` });
    };
    const endDrag = () => {
      if (!dragging.current) return;
      const didMove = dragOffset.current !== null;
      dragging.current = false;
      if (didMove) justDragged.current = true;
      if (dragOffset.current) {
        const sp = lastSpeaker.current;
        const off = dragOffset.current;
        const newOffset = {
          x: savedCharHOffset.current.x + off.x / sp.charH,
          y: savedCharHOffset.current.y + off.y / sp.charH,
        };
        savedCharHOffset.current = newOffset;
        dragOffset.current = null;
        saveBubbleOffset("npc", newOffset);
        console.log(
          `[SpeechBubble] saved NPC offset: x=${newOffset.x.toFixed(2)}, y=${newOffset.y.toFixed(2)} charH`
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

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, [visible]);

  // Auto-close: dismiss after timeout, no click listener
  useEffect(() => {
    if (!ready || !autoClose) return;
    const t = setTimeout(onDismiss, autoClose);
    return () => clearTimeout(t);
  }, [ready, autoClose, onDismiss]);

  // Click-to-dismiss (only when not auto-closing)
  useEffect(() => {
    if (!ready || autoClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Enter") onDismiss();
    };
    const onClick = () => {
      if (dragging.current) return;
      if (justDragged.current) {
        justDragged.current = false;
        return;
      }
      onDismiss();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [ready, autoClose, onDismiss]);

  // Track speaker position for tail direction (non-modal only)
  useEffect(() => {
    if (inModal || !speakerScreenPos || !visible) return;

    let raf: number;
    const update = () => {
      const sp = speakerScreenPos.current;
      if (!sp || !sp.visible || !bubbleRef.current) {
        raf = requestAnimationFrame(update);
        return;
      }

      const speakerX = sp.x * window.innerWidth;
      const speakerY = sp.y * window.innerHeight;
      const rect = bubbleRef.current.getBoundingClientRect();
      const bw = rect.width;
      const bh = rect.height;
      const margin = 24;

      // Use character's screen height to offset bubble above their head
      const charH = sp.screenHeight || 80;
      const gap = charH * 0.15; // small gap above head

      lastSpeaker.current = { x: speakerX, y: speakerY, charH };

      // Center bubble above speaker, clamp to viewport, apply saved offset
      const baseX = Math.max(margin, Math.min(window.innerWidth - bw - margin, speakerX - bw / 2));
      const baseY = Math.max(20, speakerY - charH * 0.75 - bh - gap);
      const bx = baseX + savedCharHOffset.current.x * charH;
      const by = baseY + savedCharHOffset.current.y * charH;

      lastCalcPos.current = { x: bx, y: by };

      // Don't override position while dragging
      if (!dragging.current) {
        setBubblePos({
          left: `${bx}px`,
          top: `${by}px`,
        });
      }
      setPositioned(true);

      // Tail points toward the speaker from the bubble
      const updatedRect = bubbleRef.current.getBoundingClientRect();
      const bubbleCenterX = updatedRect.left + updatedRect.width / 2;

      // Tail comes from bottom of bubble, pointing toward speaker
      const dx = speakerX - bubbleCenterX;
      const tailLeftPx = Math.max(20, Math.min(updatedRect.width - 40, updatedRect.width / 2 + dx * 0.5));

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

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [inModal, speakerScreenPos, visible]);

  if (!visible) return null;

  // Modal mode: on desktop, left side with left-pointing tail.
  // On mobile (narrow), bottom of screen with upward tail.
  if (inModal) {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

    if (isMobile) {
      return (
        <div
          ref={bubbleRef}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            padding: "14px 20px",
            background: "#fff",
            border: "3px solid #222",
            borderRadius: 20,
            zIndex: 20,
            cursor: "pointer",
          }}
        >
          {/* Tail pointing up toward the phone */}
          <div style={{
            position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
            borderBottom: "18px solid #222",
          }} />
          <div style={{
            position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
            borderBottom: "15px solid #fff",
          }} />
          <p style={{ color: "#222", fontSize: 14, lineHeight: 1.4, textAlign: "center" }}>{text}</p>
        </div>
      );
    }

    return (
      <div
        ref={bubbleRef}
        style={{
          position: "fixed",
          top: "30%",
          left: 24,
          maxWidth: 320,
          padding: "18px 28px",
          background: "#fff",
          border: "3px solid #222",
          borderRadius: 20,
          zIndex: 20,
          cursor: "pointer",
        }}
      >
        <div style={{
          position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "12px solid transparent", borderBottom: "12px solid transparent",
          borderRight: "18px solid #222",
        }} />
        <div style={{
          position: "absolute", left: -13, top: "50%", transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "10px solid transparent", borderBottom: "10px solid transparent",
          borderRight: "15px solid #fff",
        }} />
        <p style={{ color: "#222", fontSize: 16, lineHeight: 1.5 }}>{text}</p>
      </div>
    );
  }

  // World mode: positioned near speaker, tail points at them
  return (
    <div
      ref={bubbleRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        left: bubblePos.left,
        top: bubblePos.top,
        maxWidth: 320,
        padding: "18px 28px",
        background: "#fff",
        border: "3px solid #222",
        borderRadius: 20,
        zIndex: 20,
        cursor: dragging.current ? "grabbing" : "grab",
        opacity: positioned ? 1 : 0,
        transition: "opacity 0.15s ease-in",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <div style={tailStyle} />
      <div style={tailInnerStyle} />
      <p style={{ color: "#222", fontSize: 16, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
