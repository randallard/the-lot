import { useEffect, useState } from "react";

interface SpeechBubbleProps {
  text: string;
  onDismiss: () => void;
  delay?: number;
}

export function SpeechBubble({ text, onDismiss, delay = 0 }: SpeechBubbleProps) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Delay listener so the triggering click doesn't immediately dismiss
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, onDismiss]);

  if (!visible) return null;

  return (
    <div
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
      <p
        style={{
          color: "#222",
          fontSize: 16,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}
