import { useState, useRef, useEffect } from "react";
import type { ScreenPos } from "../world/useScreenPosition";
import { sendSupportMessage } from "../services/support";

interface SupportFormProps {
  npcScreenPos: React.RefObject<ScreenPos>;
  onClose: () => void;
}

const MAX_CHARS = 500;

export function SupportForm({ npcScreenPos, onClose }: SupportFormProps) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: "50%", top: "30%" });
  const [positioned, setPositioned] = useState(false);

  // Position near NPC
  useEffect(() => {
    if (!npcScreenPos) return;
    let raf: number;
    const update = () => {
      const sp = npcScreenPos.current;
      if (!sp || !sp.visible || !formRef.current) {
        raf = requestAnimationFrame(update);
        return;
      }
      const px = sp.x * window.innerWidth;
      const py = sp.y * window.innerHeight;
      const fw = formRef.current.getBoundingClientRect().width || 320;
      const fh = formRef.current.getBoundingClientRect().height || 300;
      const charH = sp.screenHeight || 80;
      const bx = Math.max(16, Math.min(window.innerWidth - fw - 16, px - fw / 2));
      const by = Math.max(16, py - charH * 0.75 - fh - charH * 0.1);
      setPos({ left: `${bx}px`, top: `${by}px` });
      setPositioned(true);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [npcScreenPos]);

  // Auto-focus textarea
  useEffect(() => {
    setTimeout(() => textRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    await sendSupportMessage(email.trim() || "(no email)", message.trim());
    setSending(false);
    setSent(true);
    setTimeout(onClose, 2000);
  };

  const remaining = MAX_CHARS - message.length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 15,
        }}
      />

      {/* Form */}
      <div
        ref={formRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: 320,
          padding: "16px 20px",
          background: "#fff",
          border: "3px solid #222",
          borderRadius: 20,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          opacity: positioned ? 1 : 0,
          transition: "opacity 0.15s ease-in",
        }}
      >
        {sent ? (
          <p style={{ color: "#333", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            sent! Ryan will take a look
          </p>
        ) : (
          <>
            <p style={{ color: "#333", fontSize: 13, fontWeight: 600, margin: 0 }}>
              message for Ryan
            </p>

            <div style={{ position: "relative" }}>
              <textarea
                ref={textRef}
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) setMessage(e.target.value);
                }}
                placeholder="bug, suggestion, question..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #ddd",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#333",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 10,
                  fontSize: 10,
                  color: remaining < 50 ? "#e74c3c" : "#aaa",
                }}
              >
                {remaining}
              </span>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (optional — for follow-up)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "2px solid #ddd",
                borderRadius: 10,
                fontSize: 13,
                color: "#333",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || sending}
                style={{
                  padding: "8px 16px",
                  background: message.trim() && !sending ? "#6a4c93" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: message.trim() && !sending ? "pointer" : "default",
                }}
              >
                {sending ? "sending..." : "send"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
