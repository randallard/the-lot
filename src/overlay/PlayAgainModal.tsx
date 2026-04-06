import { useState, useEffect, useCallback } from "react";
import type { NpcConfig } from "../config/npcs";

interface PlayAgainModalProps {
  npcs: NpcConfig[];
  onSelectNpc: (npcId: string) => void;
  onClose: () => void;
}

export function PlayAgainModal({ npcs, onSelectNpc, onClose }: PlayAgainModalProps) {
  const [selected, setSelected] = useState(0);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const cols = 2;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, npcs.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + cols, npcs.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - cols, 0));
      } else if (e.key === "Tab") {
        e.preventDefault();
        setSelected((s) => (s + 1) % npcs.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectNpc(npcs[selected]!.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [selected, npcs, onSelectNpc, onClose],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      window.addEventListener("keydown", handleKey);
    }, 100);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", handleKey);
    };
  }, [handleKey]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        zIndex: 30,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a2e",
          borderRadius: 20,
          border: "1px solid #2a2a3e",
          padding: "28px 24px",
          maxWidth: 420,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 20,
            color: "#e0e0e0",
            fontWeight: 700,
            margin: 0,
            textAlign: "center",
          }}
        >
          back in townage
        </p>

        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
          jump straight into a match — skip the parts
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {npcs.map((npc, i) => (
            <button
              key={npc.id}
              onClick={() => onSelectNpc(npc.id)}
              style={{
                background: selected === i ? "#1e1438" : "#16162e",
                border: selected === i ? "2px solid #9b8abf" : "2px solid #2a2a3e",
                borderRadius: 12,
                padding: "16px 12px",
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transition: "border-color 0.1s",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{npc.emoji}</span>
              <span style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>{npc.displayName}</span>
              <span style={{ color: "#555", fontSize: 10, lineHeight: 1.4 }}>{npc.description}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: "8px 0",
            background: "transparent",
            color: "#555",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          not now
        </button>
      </div>
    </div>
  );
}
