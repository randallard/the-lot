import { useState, useCallback } from "react";
import { NPC_CONFIGS } from "../config/npcs";
import {
  getNpcLevel,
  setNpcLevel,
  getMoodToday,
  setMoodToday,
  clearMoodToday,
  DEFAULT_LEVEL,
  MIN_LEVEL,
  MAX_LEVEL,
} from "../services/enthusiasm";
import { getFriendliness, FRIENDLINESS_MIN, FRIENDLINESS_MAX } from "../services/npc-friendliness";

interface EnthusiasmSettingsProps {
  onBack: () => void;
}

const MOOD_LABELS = ["", "mellow", "chill", "normal", "good", "pumped"];

const NPC_LABELS = ["silent", "quiet", "chill", "normal", "expressive", "max"];

const FRIENDLINESS_LABELS: Record<number, string> = {
  [-1]: "guarded",
  0: "cordial",
  1: "warming up",
  2: "friendly",
  3: "good friends",
  4: "close",
};

export function EnthusiasmSettings({ onBack }: EnthusiasmSettingsProps) {
  const [filter, setFilter] = useState("");
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const npc of NPC_CONFIGS) m[npc.id] = getNpcLevel(npc.id);
    return m;
  });
  const [friendliness] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const npc of NPC_CONFIGS) m[npc.id] = getFriendliness(npc.id);
    return m;
  });
  const [mood, setMood] = useState<number>(() => getMoodToday() ?? DEFAULT_LEVEL);

  const handleMoodChange = useCallback((value: number) => {
    if (value === DEFAULT_LEVEL) {
      clearMoodToday();
    } else {
      setMoodToday(value);
    }
    setMood(value);
  }, []);

  const handleNpcChange = useCallback((npcId: string, value: number) => {
    setNpcLevel(npcId, value);
    setLevels((prev) => ({ ...prev, [npcId]: value }));
  }, []);

  const filtered = NPC_CONFIGS.filter(
    (npc) =>
      !filter ||
      npc.displayName.toLowerCase().includes(filter.toLowerCase()) ||
      npc.id.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 4px",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "#6a4c93",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ←
        </button>
        <p
          style={{
            color: "#9b59b6",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          npc vibes
        </p>
      </div>

      {/* Me today */}
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <p
            style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: 0 }}
          >
            me today
          </p>
          <p style={{ color: "#888", fontSize: 11, margin: 0 }}>
            {MOOD_LABELS[mood] || "low"}
          </p>
        </div>
        <input
          type="range"
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          value={mood}
          onChange={(e) => handleMoodChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#6a4c93" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#555",
            marginTop: 2,
          }}
        >
          <span>chill</span>
          <span />
          <span />
          <span />
          <span />
          <span>pumped</span>
        </div>
      </div>

      {/* Divider */}
      <p style={{ color: "#555", fontSize: 11, margin: "4px 0 0" }}>
        per npc
      </p>

      {/* Search */}
      <input
        type="text"
        placeholder="search npcs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          padding: "8px 12px",
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
          borderRadius: 10,
          color: "#ccc",
          fontSize: 13,
          outline: "none",
        }}
      />

      {/* Per-NPC sliders */}
      {filtered.map((npc) => {
        const fl = friendliness[npc.id] ?? 0;
        const flLevel = Math.round(fl);
        // Map friendliness (-1 to 4) to 0-1 for the bar
        const flPct = Math.max(0, Math.min(1,
          (fl - FRIENDLINESS_MIN) / (FRIENDLINESS_MAX - FRIENDLINESS_MIN)
        ));
        return (
          <div
            key={npc.id}
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 12,
              padding: "10px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{npc.emoji}</span>
                <p
                  style={{
                    color: "#ccc",
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {npc.displayName}
                </p>
              </div>
              <p style={{ color: "#888", fontSize: 11, margin: 0 }}>
                {NPC_LABELS[levels[npc.id] ?? DEFAULT_LEVEL]}
              </p>
            </div>
            <input
              type="range"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              value={levels[npc.id] ?? DEFAULT_LEVEL}
              onChange={(e) => handleNpcChange(npc.id, Number(e.target.value))}
              style={{ width: "100%", accentColor: "#6a4c93" }}
            />
            {/* Friendliness — readonly */}
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 3,
                }}
              >
                <p style={{ color: "#777", fontSize: 10, margin: 0 }}>
                  friendliness
                </p>
                <p style={{ color: "#777", fontSize: 10, margin: 0 }}>
                  {FRIENDLINESS_LABELS[flLevel] ?? "cordial"}
                </p>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  background: "#2a2a3e",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${flPct * 100}%`,
                    height: "100%",
                    background: flLevel <= -1 ? "#c0392b" : flLevel <= 1 ? "#6a4c93" : "#27ae60",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p
          style={{
            color: "#555",
            fontSize: 12,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          no matches
        </p>
      )}
    </div>
  );
}
