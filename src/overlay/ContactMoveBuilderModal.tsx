/**
 * The contact-move editor — ADR-0016's authoring surface.
 *
 * Deliberately shaped like `EmoteBuilderModal` (list view → editor view, same palette,
 * same `SliderRow`), because it is the same kind of tool and a second visual language
 * would be its own tax. What it authors is different in kind: not keyframes, but the
 * rules a move resolves by.
 *
 * The preview drives through the same resolver the game does — see `ContactMovePreview`.
 */

import { useCallback, useEffect, useState } from "react";
import { SliderRow } from "./SliderRow";
import { ContactMovePreview, type CastMember } from "./ContactMovePreview";
import {
  ANCHOR_PARTS,
  HANDEDNESS,
  HORIZONTAL_RULES,
  OUT_OF_RANGE,
  STANCES,
  VERTICAL_RULES,
  type Anchor,
  type ContactConstraint,
  type ContactMove,
  type RoleId,
  fistBumpMove,
  makeContactMove,
  totalSeconds,
} from "../dance/contact-move";
import {
  deleteContactMove,
  getContactMoves,
  saveContactMove,
} from "../services/contact-moves";
import {
  NPC_BODY_CENTER_Y,
  PLAYER_BODY_CENTER_Y,
  getBodyShape,
} from "../services/body-shapes";
import { NPC_CONFIGS } from "../config/npcs";

// ---------------------------------------------------------------------------
// Styles — lifted from EmoteBuilderModal so the two editors read as one tool.

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

const SUB: React.CSSProperties = {
  color: "#555",
  fontSize: 9,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  margin: "10px 0 4px",
};

const PANEL: React.CSSProperties = {
  background: "#12121e",
  border: "1px solid #1e1e30",
  borderRadius: 10,
  padding: "8px 12px 10px",
  marginBottom: 8,
};

const HINT: React.CSSProperties = { color: "#4a4a5e", fontSize: 10, lineHeight: 1.5, margin: "2px 0 0" };

/** A row of mutually exclusive choices. The editor is almost entirely made of these. */
function Choice<T extends string>({
  value, options, onChange, labels,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 2 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            ...BTN,
            fontSize: 10,
            padding: "3px 8px",
            borderColor: value === o ? "#6a4c93" : "#2a2a40",
            color: value === o ? "#c080e0" : "#555",
          }}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

// Plain-language labels. The type names are precise; these are what a person reads.
const STANCE_LABELS = {
  "facing-within-reach": "facing, within reach",
  "side-by-side-within-reach": "side by side, within reach",
} as const;

const HORIZONTAL_LABELS = {
  "reach-fraction": "meet in the middle (by reach)",
  midpoint: "halfway",
  "at-a": "at A",
  "at-b": "at B",
} as const;

const VERTICAL_LABELS = {
  "mean-elbow": "between elbows",
  "mean-shoulder": "between shoulders",
  absolute: "a fixed height",
} as const;

const HANDEDNESS_LABELS = {
  "same-hand": "same hand (handshake)",
  "opposite-hand": "opposite hands",
  independent: "each side its own",
} as const;

const OUT_OF_RANGE_LABELS = {
  decline: "don't offer it",
  reach: "stretch to reach",
  lean: "lean in",
  none: "do nothing",
} as const;

// ---------------------------------------------------------------------------
// Editor

interface EditorProps {
  move: ContactMove;
  cast: { A: CastMember; B: CastMember };
  castOptions: { id: string; label: string }[];
  castIds: { A: string; B: string };
  onCast: (role: RoleId, id: string) => void;
  onSave: (m: ContactMove) => void;
  onBack: () => void;
  isWide: boolean;
}

function Editor({ move: initial, cast, castOptions, castIds, onCast, onSave, onBack, isWide }: EditorProps) {
  const [move, setMove] = useState<ContactMove>(initial);
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(1);

  const constraint = move.constraints[0];

  const patch = (p: Partial<ContactMove>) => setMove((m) => ({ ...m, ...p }));

  const patchConstraint = (p: Partial<ContactConstraint>) =>
    setMove((m) => ({
      ...m,
      constraints: m.constraints.map((c, i) => (i === 0 ? { ...c, ...p } : c)),
    }));

  const patchAnchor = (role: RoleId, p: Partial<Anchor>) =>
    setMove((m) => ({
      ...m,
      constraints: m.constraints.map((c, i) =>
        i === 0
          ? {
              ...c,
              anchors: c.anchors.map((an) => (an.role === role ? { ...an, ...p } : an)) as unknown as ContactConstraint["anchors"],
            }
          : c,
      ),
    }));

  const anchorFor = (role: RoleId) => constraint?.anchors.find((a) => a.role === role);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isWide ? "row" : "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Preview */}
      <div
        style={{
          flexShrink: 0,
          position: "relative",
          ...(isWide
            ? { width: "46%", minWidth: 280, maxWidth: 560, borderRight: "1px solid #1a1a2e" }
            : { height: 240, borderBottom: "1px solid #1a1a2e" }),
        }}
      >
        <ContactMovePreview move={move} cast={cast} scrub={playing ? undefined : scrub} />
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              ...BTN,
              background: "#0a0a14cc",
              borderColor: playing ? "#6a4c93" : "#2a2a40",
              color: playing ? "#c080e0" : "#666",
            }}
          >
            {playing ? "■ stop" : "▶ play"}
          </button>
          {!playing && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={scrub}
              onChange={(e) => setScrub(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "#6a4c93" }}
              aria-label="scrub the move"
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: isWide ? "12px 16px 32px" : "10px 12px 32px" }}>
        <input
          value={move.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="move name"
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
            boxSizing: "border-box" as const,
            marginBottom: 4,
          }}
        />

        <p style={SUB}>who's in it</p>
        <div style={PANEL}>
          {(["A", "B"] as RoleId[]).map((role) => (
            <div key={role} style={{ marginBottom: 6 }}>
              <span style={{ color: "#9b8abf", fontSize: 10, marginRight: 6 }}>role {role}</span>
              <select
                value={castIds[role]}
                onChange={(e) => onCast(role, e.target.value)}
                style={{
                  background: "#0d0d1a",
                  border: "1px solid #2a2a40",
                  borderRadius: 5,
                  color: "#9b8abf",
                  fontSize: 11,
                  padding: "2px 6px",
                }}
              >
                {castOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
          <p style={HINT}>
            The move is authored against roles, not characters — casting is for this preview
            only. That's what lets one fist bump work between any two bodies.
          </p>
        </div>

        <p style={SUB}>where they start</p>
        <div style={PANEL}>
          <Choice
            value={move.stance}
            options={STANCES}
            labels={STANCE_LABELS}
            onChange={(stance) => patch({ stance })}
          />
          <p style={HINT}>
            Doubles as the rule for when the move is offered at all — this is what greys the
            wedge out instead of letting the arms stretch across the floor.
          </p>
        </div>

        {constraint && (
          <>
            <p style={SUB}>what touches</p>
            <div style={PANEL}>
              {(["A", "B"] as RoleId[]).map((role) => {
                const a = anchorFor(role);
                if (!a) return null;
                return (
                  <div key={role} style={{ marginBottom: 8 }}>
                    <span style={{ color: "#9b8abf", fontSize: 10 }}>{role}'s</span>
                    <Choice
                      value={a.side}
                      options={["left", "right"] as const}
                      onChange={(side) => patchAnchor(role, { side })}
                    />
                    <Choice
                      value={a.part}
                      options={ANCHOR_PARTS}
                      onChange={(part) => patchAnchor(role, { part })}
                    />
                    <Choice
                      value={a.hand}
                      options={["open", "closed"] as const}
                      labels={{ open: "open hand", closed: "closed fist" }}
                      onChange={(hand) => patchAnchor(role, { hand })}
                    />
                  </div>
                );
              })}
              <p style={HINT}>
                The hand shape isn't cosmetic — it's what the contact is measured on, so a
                fist meets at a fist's width.
              </p>
            </div>

            <p style={SUB}>which hands</p>
            <div style={PANEL}>
              <Choice
                value={move.handedness}
                options={HANDEDNESS}
                labels={HANDEDNESS_LABELS}
                onChange={(handedness) => patch({ handedness })}
              />
              <p style={HINT}>
                Facing each other, a fist bump is both <em>right</em> hands — same hand, not
                mirrored. Side by side for a hip bump, it's opposite sides.
              </p>
            </div>

            <p style={SUB}>where they meet</p>
            <div style={PANEL}>
              <span style={{ color: "#666", fontSize: 10 }}>across the floor</span>
              <Choice
                value={constraint.horizontal}
                options={HORIZONTAL_RULES}
                labels={HORIZONTAL_LABELS}
                onChange={(horizontal) => patchConstraint({ horizontal })}
              />
              <span style={{ color: "#666", fontSize: 10, display: "block", marginTop: 8 }}>
                how high
              </span>
              <Choice
                value={constraint.vertical}
                options={VERTICAL_RULES}
                labels={VERTICAL_LABELS}
                onChange={(vertical) => patchConstraint({ vertical })}
              />
              {constraint.vertical === "absolute" && (
                <div style={{ marginTop: 6 }}>
                  <SliderRow
                    label="height"
                    value={constraint.absoluteHeight}
                    min={0.2}
                    max={2.5}
                    step={0.01}
                    onChange={(absoluteHeight) => patchConstraint({ absoluteHeight })}
                  />
                </div>
              )}
              <p style={HINT}>
                "By reach" makes the longer-armed character cover more of the gap, so a tall
                and a short dancer meet where they both can.
              </p>
            </div>
          </>
        )}

        <p style={SUB}>if they can't reach</p>
        <div style={PANEL}>
          <Choice
            value={move.outOfRange}
            options={OUT_OF_RANGE}
            labels={OUT_OF_RANGE_LABELS}
            onChange={(outOfRange) => patch({ outOfRange })}
          />
          <p style={HINT}>
            Stretching is a choice, not a bug — it's how an arm gets thrown across the floor.
            "Lean in" isn't built yet and behaves like stretch.
          </p>
        </div>

        <p style={SUB}>timing (seconds)</p>
        <div style={PANEL}>
          <SliderRow label="extend" value={move.envelope.extend} min={0} max={2} step={0.05}
            onChange={(v) => patch({ envelope: { ...move.envelope, extend: v } })} />
          <SliderRow label="hold" value={move.envelope.hold} min={0} max={3} step={0.05}
            onChange={(v) => patch({ envelope: { ...move.envelope, hold: v } })} />
          <SliderRow label="withdraw" value={move.envelope.withdraw} min={0} max={2} step={0.05}
            onChange={(v) => patch({ envelope: { ...move.envelope, withdraw: v } })} />
          <p style={HINT}>total {totalSeconds(move.envelope).toFixed(2)}s</p>
        </div>

        <p style={SUB}>tags</p>
        <div style={PANEL}>
          <input
            value={move.tags.join(", ")}
            onChange={(e) =>
              patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
            placeholder="greeting, contact"
            style={{
              width: "100%",
              background: "#0d0d1a",
              border: "1px solid #2a2a40",
              borderRadius: 5,
              color: "#9b8abf",
              fontSize: 11,
              padding: "4px 6px",
              boxSizing: "border-box" as const,
            }}
          />
          <p style={HINT}>
            Nothing filters on these yet. They're authored now because classifying moves
            after the fact is the expensive half.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            onClick={() => { onSave(move); onBack(); }}
            style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0", fontSize: 12, padding: "7px 24px" }}
          >
            save move
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return wide;
}

export interface ContactMoveBuilderModalProps {
  onClose: () => void;
}

/**
 * Every body that can be cast, loaded here rather than passed in.
 *
 * A contact move belongs to no one character — it is authored against roles — so this
 * modal is not opened *for* a subject the way the body, arm-action and emote editors are.
 * Taking a `subjectId` would imply an ownership that does not exist.
 */
function castRoster(): { id: string; label: string }[] {
  return [
    { id: "player", label: "you" },
    ...NPC_CONFIGS.map((n) => ({ id: n.id, label: n.displayName })),
  ];
}

export function ContactMoveBuilderModal({ onClose }: ContactMoveBuilderModalProps) {
  const [moves, setMoves] = useState<ContactMove[]>(() => getContactMoves());
  const [editing, setEditing] = useState<ContactMove | null>(null);
  const [castIds, setCastIds] = useState<{ A: string; B: string }>({ A: "player", B: "ryan" });
  const isWide = useIsWide();

  const castOptions = castRoster();

  const member = (id: string): CastMember => ({
    shape: getBodyShape(id),
    // The player's rig measures from 0 and an NPC's from 0.5. Kept distinct rather than
    // normalised, because the contact height has to resolve across that difference — it
    // is the exact gap that put the two fists 0.75 apart in the game.
    bodyCenterY: id === "player" ? PLAYER_BODY_CENTER_Y : NPC_BODY_CENTER_Y,
    label: castOptions.find((o) => o.id === id)?.label ?? id,
  });

  const cast = { A: member(castIds.A), B: member(castIds.B) };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editing, onClose]);

  const handleSave = useCallback((m: ContactMove) => {
    saveContactMove(m);
    setMoves(getContactMoves());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteContactMove(id);
    setMoves(getContactMoves());
  }, []);

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
          {editing ? editing.name || "new move" : "contact moves"}
        </span>
        {!editing && (
          <>
            <button
              onClick={() => setEditing(fistBumpMove())}
              style={{ ...BTN }}
            >
              + from fist bump
            </button>
            <button
              onClick={() => setEditing(makeContactMove(""))}
              style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0" }}
            >
              + new
            </button>
          </>
        )}
      </div>

      {editing ? (
        <Editor
          move={editing}
          cast={cast}
          castOptions={castOptions}
          castIds={castIds}
          onCast={(role, id) => setCastIds((c) => ({ ...c, [role]: id }))}
          onSave={handleSave}
          onBack={() => setEditing(null)}
          isWide={isWide}
        />
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
          {moves.length === 0 ? (
            <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              no moves yet — start from the fist bump
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {moves.map((m) => (
                <div
                  key={m.id}
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
                  onClick={() => setEditing(m)}
                >
                  <span style={{ flex: 1, color: "#ccc", fontSize: 13 }}>{m.name || "untitled"}</span>
                  {m.tags.length > 0 && (
                    <span style={{ color: "#555", fontSize: 10 }}>{m.tags.join(", ")}</span>
                  )}
                  <span style={{ color: "#555", fontSize: 11 }}>
                    {totalSeconds(m.envelope).toFixed(1)}s
                  </span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); handleDelete(m.id); }}
                    style={{ ...BTN, border: "none", color: "#553333", fontSize: 14, padding: "0 4px" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
