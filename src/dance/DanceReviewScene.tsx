/**
 * The pose review: every figure, at every named step, on every pairing — one at a time,
 * scored 0–4 with a note.
 *
 * Reached at `#review`, or `#review=<figure>/<step>/<beau>-<belle>` for one cell.
 *
 * ## What this is for
 *
 * `#dance` is the instrument that *finds* defects; this is the one that **tracks** them.
 * The difference is coverage that can be resumed. Every arm and arch decision of the last
 * month came out of Ryan standing one pose up and looking at it, and the recurring cost
 * was never the looking — it was that the pose had to be caught by hand at 120 bpm, that
 * only the pairing on screen got checked, and that "I looked at this and it was fine" was
 * not written down anywhere a week later. Three of those ADRs turned on a pairing nobody
 * had stood up until a dropdown existed.
 *
 * So: the moments are named and addressable (`review-steps.ts`), the matrix is enumerated
 * rather than remembered (`review-route.ts`), and the judgement is stored beside the
 * address (`review-store.ts`).
 *
 * ## The pose is live, not a picture
 *
 * Each cell stands the **real scene** up through the same `DanceFloor` the debug scene
 * uses, at the same beat, with the same bodies. A captured screenshot would be cheaper to
 * page through and would go stale the moment `arm-pose.ts` changes — and stale is the
 * worst thing a review can be, because a wrong rating that looks right is worse than a
 * missing one. It also means the camera still moves: a pose is judged from a *chosen*
 * angle, and the arm defect this route was built for is invisible from the front.
 *
 * ## The panel
 *
 * | Control | What it is for |
 * |---|---|
 * | **0–4** | The score. 0 terrible · 1 bad · **2 can't tell** · 3 good · 4 perfect. 2 is the abstention, not the average — see `review-store.ts`. |
 * | **note** | The finding, in words. Saved as you type, so nothing is lost to a keystroke that navigates. |
 * | **← / →** | Previous and next cell in matrix order: figure, then step, then pairing — so the bodies change under a held moment. |
 * | **next unrated** | Resume. A 650-cell sweep is not one sitting. |
 * | **figure filter** | Narrow the walk to one figure, for when a fix has landed and only its own cells are owed a re-look. |
 * | **beat readout** | What the clock actually says, against what the step asked for. An instrument that cannot be caught lying is not an instrument. |
 * | **export** | The whole matrix as markdown, for `work/square-dance-planning/`. |
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DanceFloor } from "./DanceFloor";
import { getBodyShape } from "../services/body-shapes";
import { castRoster } from "../config/npcs";
import { REVIEW_FIGURES } from "./review-steps";
import {
  cellId as addressOf,
  pairingId,
  reviewCells,
  reviewPairings,
  reviewSceneCell,
  reviewSceneHash,
  type ReviewCell,
} from "./review-route";
import {
  RATING_LABELS,
  clearCell,
  exportJson,
  isRating,
  loadReviews,
  noteCell,
  rateCell,
  type Rating,
  type ReviewRecords,
} from "./review-store";
import { reviewChartMarkdown } from "./review-chart";

const PANEL_WIDTH = 340;

/** Chest height, the same target the debug scene orbits — see its note. */
const ORBIT_TARGET: [number, number, number] = [0, 0.9, 0];

/** Warm for good, cold for bad, grey for the abstention. */
const RATING_COLOR: Readonly<Record<Rating, string>> = {
  0: "#b03a2e",
  1: "#c97b3c",
  2: "#8a8a84",
  3: "#5b8c5a",
  4: "#2e7d32",
};

const BUTTON: React.CSSProperties = {
  padding: "4px 8px",
  cursor: "pointer",
  background: "#fff",
  color: "#333",
  border: "1px solid #999",
  borderRadius: 4,
};

export function DanceReviewScene({ initialCell }: { initialCell: ReviewCell }) {
  const allCells = useMemo(() => reviewCells(), []);
  const [records, setRecords] = useState<ReviewRecords>(() => loadReviews());
  const [figureFilter, setFigureFilter] = useState<string>("all");
  const [advance, setAdvance] = useState(true);

  /**
   * The cells being walked. Filtering narrows the *walk*, never the store: a rating given
   * under a filter is a rating of that cell, and re-widening must bring it back. The
   * filter exists because a landed fix owes a re-look to its own figure and not to the
   * other four.
   */
  const cells = useMemo(
    () => (figureFilter === "all" ? allCells : allCells.filter((c) => c.figure.id === figureFilter)),
    [allCells, figureFilter],
  );

  const [cellId, setCellId] = useState<string>(initialCell.id);
  // Falling back to the filtered list's first cell keeps the scene showing something the
  // arrows can move from when a filter is applied that excludes the current cell.
  const cell = cells.find((c) => c.id === cellId) ?? cells[0] ?? initialCell;
  const index = cells.findIndex((c) => c.id === cell.id);
  const record = records[cell.id];

  // The URL follows the cell, in the namespace the loader reads — so what is in the bar
  // reopens what is on screen, and a note about a bad pose can carry its link.
  useEffect(() => {
    window.location.hash = reviewSceneHash(cell);
  }, [cell]);

  /**
   * …and the cell follows the URL, which is the half that was missing.
   *
   * 🔴 Found by using it: the loader reads the hash **once, at mount**, so pasting a
   * `#review=…` address into an already-open review moved the bar and nothing else. Every
   * claim made for these URLs — share one, keep one in a note, reopen a pose tomorrow —
   * quietly needed a reload first. Writing a URL nobody can navigate to is worse than not
   * writing one, because it looks like it worked.
   *
   * No loop: the effect above writes the hash the cell already names, so the event this
   * hears sets the id it is already on, and setting state to its current value is a no-op.
   */
  useEffect(() => {
    const onHash = () => {
      const target = reviewSceneCell(window.location.hash);
      if (target !== null) setCellId(target.id);
    };
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("hashchange", onHash); };
  }, []);

  /**
   * What the floor is asked to stand up, derived straight from the cell rather than
   * bumped in an effect.
   *
   * The token only has to *change* when the cell does, and the cell's own position in the
   * full matrix already does that — so the address is the token. Deriving it means there
   * is no order in which the pose and the panel can disagree: they are the same render.
   *
   * `arch: "down"` is the `stand` step asking for the standing couple — the pose
   * underneath a California Twirl's beat-0 arch, which `go home` produces in the debug
   * scene. Asking for it **by name** rather than by bumping the `home` prop is what keeps
   * the two poses at beat 0 distinguishable.
   */
  const seek = useMemo(
    () => ({
      token: allCells.findIndex((c) => c.id === cell.id),
      beat: cell.step.pose.kind === "stand" ? 0 : cell.step.pose.beat,
      arch: cell.step.pose.kind === "stand" ? ("down" as const) : ("declared" as const),
    }),
    [allCells, cell],
  );

  const shapes = useMemo(
    () => [getBodyShape(cell.pairing.beau), getBodyShape(cell.pairing.belle)] as const,
    [cell.pairing.beau, cell.pairing.belle],
  );

  const labels = useMemo(() => new Map(castRoster().map((c) => [c.id, c.label])), []);

  const go = useCallback(
    (delta: number) => {
      if (cells.length === 0) return;
      const next = cells[(index + delta + cells.length) % cells.length];
      if (next) setCellId(next.id);
    },
    [cells, index],
  );

  /**
   * Move along one axis and hold the other two — the two walks the arrow keys cannot do.
   *
   * 🔑 **This is the ask, and the first version did not have it.** Ryan asked to go through
   * *"step by step … at each step in each move and each pairing"*, and with the pairing
   * innermost the arrows walk twenty bodies before they reach the next step. Following one
   * couple through a whole California Twirl meant twenty presses per step or hand-editing
   * the URL. Holding the pairing and stepping through the figure is one question; holding
   * the step and changing the bodies under it is the other; the matrix order only serves
   * the second.
   */
  const goToStep = useCallback(
    (stepId: string) => {
      const step = cell.figure.steps.find((s) => s.id === stepId);
      if (step) setCellId(addressOf(cell.figure, step, cell.pairing));
    },
    [cell],
  );

  const goToPairing = useCallback(
    (id: string) => {
      const pairing = reviewPairings().find((p) => pairingId(p) === id);
      if (pairing) setCellId(addressOf(cell.figure, cell.step, pairing));
    },
    [cell],
  );

  const nextUnrated = useCallback(() => {
    if (cells.length === 0) return;
    // From here forward, wrapping — so "next unrated" after the last one goes back for the
    // ones skipped on the way rather than reporting the sweep finished.
    for (let i = 1; i <= cells.length; i++) {
      const candidate = cells[(index + i) % cells.length];
      if (candidate && records[candidate.id] === undefined) {
        setCellId(candidate.id);
        return;
      }
    }
  }, [cells, index, records]);

  const rate = useCallback(
    (rating: Rating) => {
      setRecords((r) => rateCell(r, cell.id, rating));
      if (advance) go(1);
    },
    [cell.id, advance, go],
  );

  /**
   * Keyboard, and the one rule that makes it usable: **not while typing.**
   *
   * The note field is the reason this route has a note field, and a `2` typed into a
   * sentence must be a `2` in the sentence rather than a score. Checking the event target
   * rather than tracking focus in state keeps that true however focus got there.
   */
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (typing) {
        // Escape leaves the note and hands the keys back, which is the way out of the one
        // mode this scene has.
        if (e.key === "Escape") target.blur();
        return;
      }
      const n = Number(e.key);
      if (e.key.length === 1 && !Number.isNaN(n) && isRating(n)) {
        rate(n);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "j") { go(1); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "k") { go(-1); e.preventDefault(); }
      else if (e.key === "u") { nextUnrated(); e.preventDefault(); }
      else if (e.key === "n") { noteRef.current?.focus(); e.preventDefault(); }
      else if (e.key === "x") { setRecords((r) => clearCell(r, cell.id)); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [rate, go, nextUnrated, cell.id]);

  // The beat the clock actually reports, written straight to the DOM at 60 fps (ADR-0002's
  // idiom). Its job is to be able to *disagree* with the step: if a seek to beat 2 reports
  // anything else, the pose on screen is not the pose being rated.
  const beatLabel = useRef<HTMLSpanElement>(null);
  const onBeat = useCallback((beat: number, totalBeats: number) => {
    const el = beatLabel.current;
    if (el) el.textContent = `${beat.toFixed(2)} / ${String(totalBeats)}`;
  }, []);

  const ratedCount = allCells.filter((c) => records[c.id] !== undefined).length;
  const ratedHere = cells.filter((c) => records[c.id] !== undefined).length;

  const copyChart = useCallback(() => {
    void navigator.clipboard.writeText(reviewChartMarkdown(records));
  }, [records]);
  const copyJson = useCallback(() => {
    void navigator.clipboard.writeText(exportJson(records));
  }, [records]);

  const asked =
    cell.step.pose.kind === "stand" ? "standing couple" : `beat ${String(cell.step.pose.beat)}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f2", display: "flex" }}>
      <div
        style={{
          width: PANEL_WIDTH,
          flex: "0 0 auto",
          overflowY: "auto",
          borderRight: "1px solid #ccc",
          background: "#fbfbfa",
          font: "13px/1.45 system-ui, sans-serif",
          color: "#333",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div>
          <strong>pose review</strong>
          <div style={{ color: "#666", fontSize: 11 }}>
            {ratedCount} of {allCells.length} rated
            {figureFilter === "all" ? "" : ` · ${String(ratedHere)}/${String(cells.length)} in filter`}
          </div>
        </div>

        {/* Where we are. The figure and the pairing are the axes; the step is the moment. */}
        <div style={{ borderTop: "1px solid #e0e0da", paddingTop: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{cell.figure.label}</div>
          <div style={{ fontSize: 14 }}>{cell.step.label}</div>
          <div style={{ color: "#444" }}>
            {labels.get(cell.pairing.beau) ?? cell.pairing.beau}
            <span style={{ color: "#999" }}> → </span>
            {labels.get(cell.pairing.belle) ?? cell.pairing.belle}
          </div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
            cell {index + 1} of {cells.length} · asked for <strong>{asked}</strong> · clock{" "}
            <span ref={beatLabel} style={{ fontVariantNumeric: "tabular-nums" }}>–</span>
          </div>
        </div>

        {/* The two axes the arrows cannot walk. Steps first, because following one couple
            through a figure is the thing the matrix order is worst at and the thing that was
            actually asked for. A rated step carries its score on the chip, so the figure's
            shape across this pairing is readable without moving. */}
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {cell.figure.steps.map((s) => {
            const r = records[addressOf(cell.figure, s, cell.pairing)];
            const here = s.id === cell.step.id;
            return (
              <button
                key={s.id}
                onClick={() => { goToStep(s.id); }}
                title={s.label}
                style={{
                  ...BUTTON,
                  padding: "3px 6px",
                  fontSize: 11,
                  background: here ? "#333" : "#fff",
                  color: here ? "#fff" : "#333",
                  borderColor: r === undefined ? "#bbb" : RATING_COLOR[r.rating],
                  borderWidth: r === undefined ? 1 : 2,
                }}
              >
                {s.label}
                {r === undefined ? "" : ` ${String(r.rating)}`}
              </button>
            );
          })}
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          pairing
          <select
            value={pairingId(cell.pairing)}
            onChange={(e) => { goToPairing(e.target.value); }}
            style={{ ...BUTTON, cursor: "default", flex: "1 1 0" }}
          >
            {reviewPairings().map((p) => (
              <option key={pairingId(p)} value={pairingId(p)}>
                {labels.get(p.beau) ?? p.beau} → {labels.get(p.belle) ?? p.belle}
              </option>
            ))}
          </select>
        </label>

        {/* What this step is on screen to answer. Above the buttons on purpose: a rating
            given without the question in view is a rating of the general vibe. */}
        <div
          style={{
            background: "#f7f7f4",
            border: "1px solid #e0e0da",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
          }}
        >
          {cell.step.watch}
        </div>

        <div>
          <div style={{ display: "flex", gap: 4 }}>
            {([0, 1, 2, 3, 4] as const).map((r) => (
              <button
                key={r}
                onClick={() => { rate(r); }}
                title={RATING_LABELS[r]}
                style={{
                  ...BUTTON,
                  flex: "1 1 0",
                  padding: "6px 0",
                  fontWeight: 600,
                  background: record?.rating === r ? RATING_COLOR[r] : "#fff",
                  color: record?.rating === r ? "#fff" : "#333",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 3 }}>
            {record === undefined
              ? "0 terrible · 2 can't tell · 4 perfect"
              : `${String(record.rating)} — ${RATING_LABELS[record.rating]}`}
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "#666" }}>note (n to focus · esc to leave)</span>
          <textarea
            ref={noteRef}
            value={record?.note ?? ""}
            onChange={(e) => { setRecords((r) => noteCell(r, cell.id, e.target.value)); }}
            rows={4}
            placeholder="what is wrong, in your words"
            style={{
              font: "12px/1.4 system-ui, sans-serif",
              padding: "6px 8px",
              border: "1px solid #999",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { go(-1); }} style={{ ...BUTTON, flex: "1 1 0" }}>← prev</button>
          <button onClick={() => { go(1); }} style={{ ...BUTTON, flex: "1 1 0" }}>next →</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={nextUnrated} style={{ ...BUTTON, flex: "1 1 0" }}>next unrated (u)</button>
          <button onClick={() => { setRecords((r) => clearCell(r, cell.id)); }} style={BUTTON}>
            clear (x)
          </button>
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          <input type="checkbox" checked={advance} onChange={(e) => { setAdvance(e.target.checked); }} />
          advance on rate
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "#666" }}>walk</span>
          <select
            value={figureFilter}
            onChange={(e) => { setFigureFilter(e.target.value); }}
            style={{ ...BUTTON, cursor: "default" }}
          >
            <option value="all">every figure ({allCells.length} cells)</option>
            {REVIEW_FIGURES.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={copyChart} style={{ ...BUTTON, flex: "1 1 0" }}>copy chart (md)</button>
          <button onClick={copyJson} style={BUTTON}>json</button>
        </div>

        <span style={{ color: "#666", fontSize: 11 }}>
          <strong>0–4</strong> rate · <strong>←/→</strong> or <strong>k/j</strong> move ·{" "}
          <strong>u</strong> next unrated · <strong>n</strong> note · <strong>x</strong> clear.
          Drag to orbit, scroll to zoom — the pose is live, so judge it from the angle that
          answers the question, not the one it opens on.
        </span>
      </div>

      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Canvas shadows camera={{ position: [0, 6.5, 7.5], fov: 45 }}>
          <OrbitControls
            target={ORBIT_TARGET}
            maxPolarAngle={Math.PI / 2}
            minDistance={1.5}
            maxDistance={24}
          />
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[24, 24]} />
            <meshStandardMaterial color="#e8e8e4" />
          </mesh>
          <gridHelper args={[24, 24, "#b9b9b3", "#d6d6d0"]} />
          <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.02, 0), 2.2, 0xcc4433]} />
          <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.02, 0), 2.2, 0x3355cc]} />

          {/* Keyed on the cast **and the figure**: the frame and its body-derived scale are
              built once per mount, and the performance is memoised per figure — so a fresh
              floor is the honest way to change either. The step is not in the key, because
              a step change is exactly what `seek` is for. */}
          <DanceFloor
            key={`${cell.pairing.beau}|${cell.pairing.belle}|${cell.figure.id}`}
            call={cell.figure.call}
            {...(cell.figure.sequence === undefined ? {} : { sequence: cell.figure.sequence })}
            paused
            seek={seek}
            onBeat={onBeat}
            shapes={shapes}
          />
        </Canvas>
      </div>
    </div>
  );
}
