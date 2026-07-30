import { useState, useEffect, useCallback } from "react";
import {
  type CharacterBodyShape,
  getBodyShape,
  setBodyShape,
  resetBodyShape,
} from "../services/body-shapes";
import { getNpcById } from "../config/npcs";
import { CharacterPreview } from "./CharacterPreview";
import { BodyEditor } from "./BodyEditor";
import { type Section, ALL_SECTIONS } from "./body-editor-sections";
import { ArmActionBuilderModal } from "./ArmActionBuilderModal";
import { EmoteBuilderModal } from "./EmoteBuilderModal";
import { ContactMoveBuilderModal } from "./ContactMoveBuilderModal";


function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return wide;
}

interface BodyEditorModalProps {
  subjectId: string;
  onClose: () => void;
  onShapeChange: (id: string, shape: CharacterBodyShape) => void;
}

const EMPTY_SECTIONS: Record<Section, boolean> = {
  head: false, body: false, forearm: false, hand: false, layout: false, eyes: false,
};
const ALL_OPEN: Record<Section, boolean> = {
  head: true, body: true, forearm: true, hand: true, layout: true, eyes: true,
};

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

export function BodyEditorModal({ subjectId, onClose, onShapeChange }: BodyEditorModalProps) {
  const [shape, setShape] = useState<CharacterBodyShape>(() => getBodyShape(subjectId));
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    head: true, body: false, forearm: false, hand: false, layout: false, eyes: false,
  });
  const [previewPose, setPreviewPose] = useState<"open" | "closed">("open");
  const [showActions, setShowActions] = useState<"arms" | "emotes" | "contact" | null>(null);
  const isWide = useIsWide();
  const color = shape.bodyColor;
  const npc = subjectId !== "player" ? getNpcById(subjectId) : null;
  const label = npc ? `${npc.emoji} ${npc.displayName}` : "you";

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleChange = useCallback((newShape: CharacterBodyShape) => {
    setShape(newShape);
    setBodyShape(subjectId, newShape);
    onShapeChange(subjectId, newShape);
  }, [subjectId, onShapeChange]);

  const handleReset = useCallback(() => {
    const fresh = resetBodyShape(subjectId);
    setShape(fresh);
    onShapeChange(subjectId, fresh);
  }, [subjectId, onShapeChange]);

  const handleToggleSection = useCallback((s: Section) => {
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
  }, []);

  const openCount = ALL_SECTIONS.filter(s => openSections[s]).length;

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "#0a0a14",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid #1a1a2e" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isWide ? "12px 20px 6px" : "10px 14px 6px" }}>
          <button
            onClick={onClose}
            style={{ ...BTN, color: "#9b8abf", fontSize: 20, border: "none", padding: "2px 8px 2px 0" }}
          >
            ‹
          </button>
          <span style={{ color: "#c080e0", fontSize: isWide ? 16 : 14, fontWeight: 700, flex: 1 }}>
            appearance
          </span>
          <span style={{ color: "#666", fontSize: 12 }}>{label}</span>
          {isWide && (
            <>
              <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("arms")}>arm actions</button>
              <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("emotes")}>emotes</button>
              <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("contact")}>contact moves</button>
              <button style={BTN} onClick={() => setOpenSections(EMPTY_SECTIONS)}>close all</button>
              <button style={{ ...BTN, borderColor: openCount === 5 ? "#6a4c93" : "#2a2a40", color: openCount === 5 ? "#c080e0" : "#888" }} onClick={() => setOpenSections(ALL_OPEN)}>open all</button>
            </>
          )}
        </div>
        {/* Action row — mobile only */}
        {!isWide && (
          <div style={{ display: "flex", gap: 6, padding: "0 14px 8px", flexWrap: "wrap" }}>
            <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("arms")}>arm actions</button>
            <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("emotes")}>emotes</button>
              <button style={{ ...BTN, borderColor: "#2a2a40", color: "#888" }} onClick={() => setShowActions("contact")}>contact moves</button>
            <button style={BTN} onClick={() => setOpenSections(EMPTY_SECTIONS)}>close all</button>
            <button style={{ ...BTN, borderColor: openCount === 5 ? "#6a4c93" : "#2a2a40", color: openCount === 5 ? "#c080e0" : "#888" }} onClick={() => setOpenSections(ALL_OPEN)}>open all</button>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          flex: 1,
          minHeight: 0,
        }}
      >
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
          <CharacterPreview shape={shape} color={color} handPose={previewPose} />
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, pointerEvents: "none" }}>
            {(["open", "closed"] as const).map(pose => (
              <button
                key={pose}
                onClick={() => setPreviewPose(pose)}
                style={{
                  ...BTN,
                  pointerEvents: "auto",
                  borderColor: previewPose === pose ? "#6a4c93" : "#2a2a40",
                  color: previewPose === pose ? "#c080e0" : "#666",
                  background: "#0a0a14cc",
                }}
              >
                {pose}
              </button>
            ))}
          </div>
        </div>

        {/* Controls pane */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isWide ? "16px 20px 24px" : "12px 14px 24px",
          }}
        >
          <BodyEditor
            shape={shape}
            onChange={handleChange}
            openSections={openSections}
            onToggleSection={handleToggleSection}
          />

          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "1px solid #222",
                color: "#555",
                fontSize: 11,
                borderRadius: 8,
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>

    {showActions === "arms" && (
      <ArmActionBuilderModal
        subjectId={subjectId}
        shape={shape}
        onClose={() => setShowActions(null)}
      />
    )}
    {showActions === "emotes" && (
      <EmoteBuilderModal
        subjectId={subjectId}
        shape={shape}
        onClose={() => setShowActions(null)}
      />
    )}
    {/* Not scoped to `subjectId`: a contact move is authored against roles and cast at
        play time, so it belongs to no one character. Reachable from here because this is
        where the other authoring tools are, not because it is this subject's. */}
    {showActions === "contact" && (
      <ContactMoveBuilderModal onClose={() => setShowActions(null)} />
    )}
    </>
  );
}
