import { useState, useRef, useEffect, useCallback } from "react";
import { NPC_CONFIGS } from "../config/npcs";

interface FindAppProps {
  onFind: (npcId: string) => void;
  onClose: () => void;
}

export function FindApp({ onFind, onClose }: FindAppProps) {
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search field on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = NPC_CONFIGS.filter((npc) =>
    npc.displayName.toLowerCase().startsWith(query.toLowerCase()),
  );

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightIdx]) {
          onFind(filtered[highlightIdx].id);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, highlightIdx, onFind, onClose],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "24px 16px",
        minHeight: "100%",
      }}
    >
      <p
        style={{
          color: "#9b59b6",
          fontSize: 16,
          fontWeight: 700,
          margin: 0,
          letterSpacing: 1,
        }}
      >
        find...
      </p>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="search"
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "#0f0f1a",
          border: "1px solid #2a2a3e",
          borderRadius: 10,
          color: "#ccc",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {filtered.map((npc, i) => (
        <button
          key={npc.id}
          onClick={() => onFind(npc.id)}
          style={{
            width: "100%",
            background: i === highlightIdx ? "#2a2a4e" : "#1a1a2e",
            border:
              i === highlightIdx
                ? "1px solid #6a4c93"
                : "1px solid #2a2a3e",
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 22 }}>{npc.emoji}</span>
          <div>
            <p
              style={{
                color: "#ccc",
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
              }}
            >
              {npc.displayName}
            </p>
            <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>
              {npc.description}
            </p>
          </div>
        </button>
      ))}

      {filtered.length === 0 && (
        <p style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>
          no matches
        </p>
      )}

      <button
        onClick={onClose}
        style={{
          padding: "6px 16px",
          background: "transparent",
          color: "#666",
          border: "1px solid #333",
          borderRadius: 8,
          fontSize: 12,
          cursor: "pointer",
          marginTop: 8,
        }}
      >
        close
      </button>
    </div>
  );
}
