import { useState, useEffect, useCallback } from "react";
import type { CharacterBodyShape } from "../services/body-shapes";
import {
  type ArmAction,
  type ActionKeyframe,
  type ArmPose,
  getActions,
  saveAction,
  deleteAction,
  makeAction,
  makeKeyframe,
  makeParadeWaveAction,
  ZERO_POSE,
} from "../services/arm-actions";
import { getNpcById } from "../config/npcs";
import { CharacterPreview } from "./CharacterPreview";
import { KeyframeCard, ReturnToRestCard } from "./KeyframeCard";

function getSubjectColor(id: string): string {
  if (id === "player") return "#444444";
  return getNpcById(id)?.appearance.bodyColor ?? "#5a5a6e";
}

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return wide;
}

const BTN: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2a2a40",
  color: "#888",
  fontSize: 11,
  borderRadius: 7,
  padding: "4px 10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ---------------------------------------------------------------------------
// Action list view

interface ListViewProps {
  subjectId: string;
  actions: ArmAction[];
  onEdit: (action: ArmAction) => void;
  onNew: () => void;
  onParadeWave: () => void;
  onDelete: (id: string) => void;
}

function ListView({ subjectId: _subjectId, actions, onEdit, onNew, onParadeWave, onDelete }: ListViewProps) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
      {actions.length === 0 ? (
        <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>
          no actions yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map(action => (
            <div
              key={action.id}
              style={{
                background: "#12121e",
                border: "1px solid #1e1e30",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
              onClick={() => onEdit(action)}
            >
              <span style={{ flex: 1, color: "#ccc", fontSize: 13 }}>{action.name}</span>
              <span style={{ color: "#555", fontSize: 11 }}>{action.keyframes.length} kf</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(action.id); }}
                style={{ ...BTN, color: "#553333", border: "none", fontSize: 14, padding: "0 4px" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8 }}>
        <button
          onClick={onNew}
          style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0", fontSize: 12, padding: "6px 18px" }}
        >
          + new action
        </button>
        <button
          onClick={onParadeWave}
          style={{ ...BTN, borderColor: "#2a3a40", color: "#70aacc", fontSize: 12, padding: "6px 14px" }}
        >
          + parade wave
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action editor view

interface EditorViewProps {
  action: ArmAction;
  shape: CharacterBodyShape;
  color: string;
  onBack: () => void;
  onSave: (action: ArmAction) => void;
  isWide: boolean;
}

function EditorView({ action: initial, shape, color, onBack, onSave, isWide }: EditorViewProps) {
  const [action, setAction] = useState<ArmAction>(initial);
  const [activeKfId, setActiveKfId] = useState<string | null>(
    initial.keyframes[0]?.id ?? null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [livePose, setLivePose] = useState<ArmPose>(ZERO_POSE);

  // The pose shown in the preview: either the active keyframe's pose, or the live animated pose
  const previewPose: ArmPose = isPlaying
    ? livePose
    : action.keyframes.find(k => k.id === activeKfId)?.pose ?? ZERO_POSE;

  const updateKf = useCallback((updated: ActionKeyframe) => {
    setAction(a => ({ ...a, keyframes: a.keyframes.map(k => k.id === updated.id ? updated : k) }));
  }, []);

  const deleteKf = useCallback((id: string) => {
    setAction(a => {
      const next = a.keyframes.filter(k => k.id !== id);
      return { ...a, keyframes: next };
    });
    setActiveKfId(prev => (prev === id ? null : prev));
  }, []);

  const addKf = useCallback(() => {
    setAction(a => {
      const lastPose = a.keyframes[a.keyframes.length - 1]?.pose ?? ZERO_POSE;
      const kf = makeKeyframe({ pose: { ...lastPose } });
      setActiveKfId(kf.id);
      return { ...a, keyframes: [...a.keyframes, kf] };
    });
  }, []);

  const handleSave = () => {
    onSave(action);
    onBack();
  };

  return (
    <div style={{ display: "flex", flexDirection: isWide ? "row" : "column", flex: 1, minHeight: 0 }}>
      {/* Preview pane */}
      <div
        style={{
          flexShrink: 0,
          position: "relative",
          ...(isWide
            ? { width: "45%", minWidth: 260, maxWidth: 500, borderRight: "1px solid #1a1a2e" }
            : { height: "38%", minHeight: 180, borderBottom: "1px solid #1a1a2e" }),
        }}
      >
        <CharacterPreview
          shape={shape}
          color={color}
          focusMode="arms"
          armPoseOverride={previewPose}
          animationPreview={action}
          isPlaying={isPlaying}
          onLivePose={setLivePose}
        />
        {/* Play button */}
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, pointerEvents: "none" }}>
          <button
            onClick={() => setIsPlaying(p => !p)}
            style={{
              ...BTN,
              pointerEvents: "auto",
              borderColor: isPlaying ? "#6a4c93" : "#2a2a40",
              color: isPlaying ? "#c080e0" : "#666",
              background: "#0a0a14cc",
            }}
          >
            {isPlaying ? "■ stop" : "▶ preview"}
          </button>
        </div>
      </div>

      {/* Editor pane */}
      <div style={{ flex: 1, overflowY: "auto", padding: isWide ? "16px 20px 24px" : "12px 14px 24px" }}>
        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <input
            value={action.name}
            onChange={e => setAction(a => ({ ...a, name: e.target.value }))}
            placeholder="action name"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid #2a2a40",
              color: "#e0e0ff",
              fontSize: 15,
              fontWeight: 700,
              outline: "none",
              padding: "4px 2px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Keyframes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {action.keyframes.map((kf, i) => (
            <KeyframeCard
              key={kf.id}
              keyframe={kf}
              index={i}
              isActive={kf.id === activeKfId}
              onChange={updateKf}
              onDelete={() => deleteKf(kf.id)}
              onSelect={() => { setActiveKfId(kf.id); setIsPlaying(false); }}
            />
          ))}

          <button
            onClick={addKf}
            style={{
              ...BTN,
              borderColor: "#2a2a40",
              color: "#666",
              borderStyle: "dashed",
              padding: "8px",
              fontSize: 12,
              width: "100%",
              textAlign: "center",
            }}
          >
            + add keyframe
          </button>

          <ReturnToRestCard
            returnDuration={action.returnDuration}
            onChange={v => setAction(a => ({ ...a, returnDuration: v }))}
          />
        </div>

        {/* Save */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleSave}
            style={{
              ...BTN,
              borderColor: "#6a4c93",
              color: "#c080e0",
              fontSize: 12,
              padding: "7px 24px",
            }}
          >
            save action
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root modal

interface ArmActionBuilderModalProps {
  subjectId: string;
  shape: CharacterBodyShape;
  onClose: () => void;
}

export function ArmActionBuilderModal({ subjectId, shape, onClose }: ArmActionBuilderModalProps) {
  const [actions, setActions] = useState<ArmAction[]>(() => getActions(subjectId));
  const [editing, setEditing] = useState<ArmAction | null>(null);
  const isWide = useIsWide();
  const color = getSubjectColor(subjectId);
  const npc = subjectId !== "player" ? getNpcById(subjectId) : null;
  const label = npc ? `${npc.emoji} ${npc.displayName}` : "you";

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (editing) setEditing(null); else onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editing, onClose]);

  const handleNew = () => {
    const action = makeAction(`action ${actions.length + 1}`);
    setEditing(action);
  };

  const handleParadeWave = () => {
    setEditing(makeParadeWaveAction());
  };

  const handleSave = useCallback((action: ArmAction) => {
    saveAction(subjectId, action);
    setActions(getActions(subjectId));
  }, [subjectId]);

  const handleDelete = useCallback((id: string) => {
    deleteAction(subjectId, id);
    setActions(getActions(subjectId));
  }, [subjectId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9001,
        background: "#0a0a14",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: isWide ? "12px 20px 10px" : "10px 14px 8px",
          borderBottom: "1px solid #1a1a2e",
          flexShrink: 0,
        }}
      >
        <button
          onClick={editing ? () => setEditing(null) : onClose}
          style={{ ...BTN, color: "#9b8abf", fontSize: 20, border: "none", padding: "2px 8px 2px 0" }}
        >
          ‹
        </button>
        <span style={{ color: "#c080e0", fontSize: isWide ? 16 : 14, fontWeight: 700, flex: 1 }}>
          {editing ? editing.name || "new action" : "actions"}
        </span>
        <span style={{ color: "#666", fontSize: 12, marginRight: 6 }}>{label}</span>
        {!editing && (
          <button
            onClick={handleNew}
            style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0" }}
          >
            + new
          </button>
        )}
      </div>

      {/* Body */}
      {editing ? (
        <EditorView
          action={editing}
          shape={shape}
          color={color}
          onBack={() => setEditing(null)}
          onSave={handleSave}
          isWide={isWide}
        />
      ) : (
        <ListView
          subjectId={subjectId}
          actions={actions}
          onEdit={setEditing}
          onNew={handleNew}
          onParadeWave={handleParadeWave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
