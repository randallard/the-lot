import { useEffect, useRef, useState } from "react";
import { getPreferences } from "../services/chat-storage";
import { checkChatServerHealth } from "../services/haiku-npc";

interface StartupNotificationProps {
  onOpenSettings: () => void;
}

export function StartupNotification({ onOpenSettings }: StartupNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [serverStatus, setServerStatus] = useState<"checking" | "ok" | "unavailable">("checking");
  const ref = useRef<HTMLDivElement>(null);

  const prefs = getPreferences();

  useEffect(() => {
    if (!prefs.optInShown) return;
    checkChatServerHealth().then((ok) => setServerStatus(ok ? "ok" : "unavailable"));
  }, []);

  // Any click outside the notification closes it
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [visible]);

  if (!visible || !prefs.optInShown) return null;

  const chatMode = prefs.useHaiku ? "AI on" : "emoji only";
  const serverColor = serverStatus === "ok" ? "#4caf50" : serverStatus === "unavailable" ? "#e74c3c" : "#888";
  const serverLabel =
    serverStatus === "ok" ? "chat server ✓" :
    serverStatus === "unavailable" ? "chat server ✗ — set VITE_NPC_CHAT_URL in .env.local" :
    "chat server...";

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(20, 20, 30, 0.92)",
        border: "1px solid #333",
        borderRadius: 10,
        padding: "10px 16px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 12,
        color: "#aaa",
        backdropFilter: "blur(4px)",
        whiteSpace: "nowrap",
      }}
    >
      <button
        onClick={() => { setVisible(false); onOpenSettings(); }}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "inherit",
          fontSize: "inherit",
          fontFamily: "inherit",
        }}
      >
        <span>chat: <strong style={{ color: "#ccc" }}>{chatMode}</strong></span>
        <span style={{ color: "#444" }}>|</span>
        <span style={{ color: serverColor }}>{serverLabel}</span>
      </button>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "#555",
          fontSize: 14,
          cursor: "pointer",
          padding: "0 0 0 4px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
