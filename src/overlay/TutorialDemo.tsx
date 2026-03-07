import { useState, useEffect, useCallback } from "react";
import { BoardGrid } from "./BoardGrid";
import type { CellContent, BoardMove } from "../state/types";

interface TutorialDemoProps {
  step: number;
  onAdvance: () => void;
}

const EMPTY_GRID: CellContent[][] = [
  ["empty", "empty"],
  ["empty", "empty"],
];

export const TUTORIAL_STEP_TEXTS = [
  "we both put up some cheese",
  "pick a starting column",
  "you can set a trap in any adjacent space",
  "move to the next row towards the cheese",
  "the next move gets the cheese",
  "here's my plan",
  "I'm going to race straight for the finish — if I get to the goal before you then you're stuck",
  "here's our starting moves",
  "I stepped in the trap, that's minus a point for me",
  "you get a point for advancing towards the goal",
  "you made it to the cheese so you get the stack — that's 2 for size 2 board",
  "now let's make your first board...",
];

interface StepCfg {
  grid: CellContent[][];
  sequence: BoardMove[];
  playerPos?: { row: number; col: number } | null;
  opponentPos?: { row: number; col: number } | null;
  highlightCell?: { row: number; col: number } | null;
  showBoard: boolean;
  showNumbers: boolean;
  pulseTop: boolean;
  pulseBottom: boolean;
  pieceColor?: string;
}

const STEP_CONFIG: StepCfg[] = [
  // 0: "we both put up some cheese"
  { grid: EMPTY_GRID, sequence: [], showBoard: false, showNumbers: false, pulseTop: false, pulseBottom: false },

  // 1: "pick a starting column" — blue 1 at bottom-left
  {
    grid: EMPTY_GRID,
    sequence: [{ position: { row: 1, col: 0 }, type: "piece", order: 1 }],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 2: "you can set a trap in any adjacent space" — add trap at bottom-right
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1 },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
    ],
    highlightCell: { row: 1, col: 1 },
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 3: "move to the next row towards the cheese" — add piece 3 at top-left
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1 },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
      { position: { row: 0, col: 0 }, type: "piece", order: 3 },
    ],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 4: "the next move gets the cheese" — pulse top cheese
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1 },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
      { position: { row: 0, col: 0 }, type: "piece", order: 3 },
    ],
    showBoard: true, showNumbers: true, pulseTop: true, pulseBottom: false,
  },

  // 5: "here's my plan" — opponent purple 1 at top-right
  {
    grid: EMPTY_GRID,
    sequence: [{ position: { row: 0, col: 1 }, type: "piece", order: 1 }],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
    pieceColor: "#9b59b6",
  },

  // 6: "I'm going to race straight for the finish" — purple 1 + 2
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 0, col: 1 }, type: "piece", order: 1 },
      { position: { row: 1, col: 1 }, type: "piece", order: 2 },
    ],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: true,
    pieceColor: "#9b59b6",
  },

  // 7: "here's our starting moves" — both starting pieces with numbers
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1, color: "#4a90e2" },
      { position: { row: 0, col: 1 }, type: "piece", order: 1, color: "#9b59b6" },
    ],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 8: "I stepped in the trap" — opponent purple 2 at (1,1) with trap X on top
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1, color: "#4a90e2" },
      { position: { row: 0, col: 1 }, type: "piece", order: 1, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "piece", order: 2, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
    ],
    highlightCell: { row: 1, col: 1 },
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 9: "you get a point for advancing towards the goal" — blue 3 at (0,0)
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1, color: "#4a90e2" },
      { position: { row: 0, col: 1 }, type: "piece", order: 1, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "piece", order: 2, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
      { position: { row: 0, col: 0 }, type: "piece", order: 3, color: "#4a90e2" },
    ],
    showBoard: true, showNumbers: true, pulseTop: false, pulseBottom: false,
  },

  // 10: "you made it to the cheese" — same board, pulse top cheese
  {
    grid: EMPTY_GRID,
    sequence: [
      { position: { row: 1, col: 0 }, type: "piece", order: 1, color: "#4a90e2" },
      { position: { row: 0, col: 1 }, type: "piece", order: 1, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "piece", order: 2, color: "#9b59b6" },
      { position: { row: 1, col: 1 }, type: "trap", order: 2 },
      { position: { row: 0, col: 0 }, type: "piece", order: 3, color: "#4a90e2" },
    ],
    showBoard: true, showNumbers: true, pulseTop: true, pulseBottom: false,
  },

  // 11: "now let's make your first board..."
  { grid: EMPTY_GRID, sequence: [], showBoard: false, showNumbers: false, pulseTop: false, pulseBottom: false },
];

export function TutorialDemo({ step, onAdvance }: TutorialDemoProps) {
  const [visible, setVisible] = useState(false);
  const [clickable, setClickable] = useState(false);

  useEffect(() => {
    setVisible(false);
    setClickable(false);
    const t1 = setTimeout(() => setVisible(true), 200);
    const t2 = setTimeout(() => setClickable(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);

  const handleClick = useCallback(() => {
    if (clickable) onAdvance();
  }, [clickable, onAdvance]);

  // Keyboard support (works even with stopPropagation since it's on window)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!clickable) return;
      if (e.code === "Enter" || e.code === "Space") onAdvance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAdvance, clickable]);

  const cfg = STEP_CONFIG[step];
  if (!cfg) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "16px 0",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        cursor: clickable ? "pointer" : "default",
        minHeight: "100%",
      }}
    >
      {/* Step 0: just cheese stacks centered */}
      {step === 0 && (
        <div style={{ display: "flex", gap: 40, marginTop: 32 }}>
          <CheeseTokenStack pulse={false} />
          <CheeseTokenStack pulse={false} />
        </div>
      )}

      {/* Board with cheese goal areas */}
      {cfg.showBoard && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginTop: 8, flex: 1, width: "100%" }}>
          {/* Top goal area — opponent's cheese (player's bot tries to get this) */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            borderBottom: "2px dashed #555",
            marginBottom: 4,
            width: "100%",
          }}>
            <CheeseTokenStack pulse={cfg.pulseTop} small />
          </div>

          {/* Board grid */}
          <BoardGrid
            grid={cfg.grid}
            sequence={cfg.sequence}
            boardSize={2}
            showNumbers={cfg.showNumbers}
            playerPos={cfg.playerPos}
            opponentPos={cfg.opponentPos}
            highlightCell={cfg.highlightCell}
            pieceColor={cfg.pieceColor}
          />

          {/* Bottom goal area — player's cheese (opponent's bot tries to get this) */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            borderTop: "2px dashed #555",
            marginTop: 4,
            width: "100%",
          }}>
            <CheeseTokenStack pulse={cfg.pulseBottom} small />
          </div>
        </div>
      )}

      {/* Last step: no board */}
      {step === STEP_CONFIG.length - 1 && (
        <div style={{ marginTop: 20 }} />
      )}

      <p style={{ color: "#666", fontSize: 11, margin: 0 }}>
        {step < STEP_CONFIG.length - 1 ? "tap to continue" : "tap to start building"}
      </p>
    </div>
  );
}

export const TUTORIAL_DEMO_STEPS = STEP_CONFIG.length;

/** A stack of cheese tokens that looks like poker chips */
function CheeseTokenStack({ pulse = false, small = false }: { pulse?: boolean; small?: boolean }) {
  const chipColor = "#f5a623";
  const rimColor = "#d4891a";
  const chips = small ? [0, 1, 2] : [0, 1, 2, 3];
  const w = small ? 36 : 52;
  const faceH = small ? 18 : 26;
  const edgeH = small ? 6 : 8;
  const stackGap = small ? 5 : 6;
  const totalH = small ? 42 : 64;

  return (
    <div style={{
      position: "relative",
      width: w,
      height: totalH,
      animation: pulse ? "pocket-pulse 1s ease-in-out infinite" : undefined,
      filter: pulse ? "drop-shadow(0 0 8px #f5a623)" : undefined,
    }}>
      {chips.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: i * stackGap,
            left: 0,
            width: w,
            height: faceH + edgeH,
          }}
        >
          {/* Chip edge */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 2,
              width: w - 4,
              height: edgeH,
              background: rimColor,
              borderRadius: `0 0 ${w / 2}px ${w / 2}px`,
            }}
          />
          {/* Chip face */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: w,
              height: faceH,
              background: chipColor,
              borderRadius: "50%",
              border: `${small ? 2 : 3}px solid ${rimColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: i === chips.length - 1 ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {i === chips.length - 1 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    width: w * 0.7,
                    height: faceH * 0.7,
                    borderRadius: "50%",
                    border: `${small ? 1 : 2}px dashed #fff`,
                    opacity: 0.5,
                  }}
                />
                <span
                  style={{
                    fontSize: small ? 10 : 13,
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    position: "relative",
                  }}
                >
                  1
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
