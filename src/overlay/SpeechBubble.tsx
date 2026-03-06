import { useEffect, useRef, useState } from "react";
import type { ScreenPos } from "../world/useScreenPosition";

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
      if (e.code === "Enter") onDismiss();
    };
    const onClick = () => onDismiss();
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

      // Position bubble above the speaker
      const bx = Math.max(24, Math.min(window.innerWidth - 344, speakerX - 160));
      const by = Math.max(20, speakerY - 120);

      setBubblePos({
        left: `${bx}px`,
        top: `${by}px`,
      });
      setPositioned(true);

      // Tail points toward the speaker from the bubble
      const rect = bubbleRef.current.getBoundingClientRect();
      const bubbleCenterX = rect.left + rect.width / 2;
      const bubbleBottom = rect.bottom;

      // Tail comes from bottom of bubble, pointing toward speaker
      const dx = speakerX - bubbleCenterX;
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

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [inModal, speakerScreenPos, visible]);

  if (!visible) return null;

  // Modal mode: fixed left position with left-pointing tail
  if (inModal) {
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
        cursor: autoClose ? "default" : "pointer",
        opacity: positioned ? 1 : 0,
        transition: "opacity 0.15s ease-in",
      }}
    >
      <div style={tailStyle} />
      <div style={tailInnerStyle} />
      <p style={{ color: "#222", fontSize: 16, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
