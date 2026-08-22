/**
 * The dance debug scene: two NPCs driven by square-one — a facing pair looping one
 * call (M4), or a **couple** dancing a sequence (planning ADR-0011's S1).
 *
 * This is the milestone's "done when", and it is also the check three call specs
 * are stacked behind — square-one's Dosado marks its waypoints "provisional until
 * rendered", and this is the renderer.
 *
 * Reached at `#dance` (optionally `#dance=pass-thru`, `#dance=two-trades`, …).
 * Deliberately its own Canvas
 * and its own early return in `App.tsx`, so nothing about the debug scene can touch
 * the game's state machine.
 *
 * ## The control panel, docked on the left
 *
 * Every control here exists because some watch needed it. Kept as a list because the
 * scene is the project's only instrument for the class of defect tests cannot see, and
 * an instrument whose dials are undocumented gets used for less than it can do.
 *
 * | Control | What it is for |
 * |---|---|
 * | **figure buttons** | The six things this scene can dance — three single calls by a facing pair, three couple sequences (planning ADR-0011's S1). The two `2×` figures and the mixed one are **zeros**: watch that the set finishes where it started, which is as much the point as the shapes on the way. |
 * | **tempo** | 30–180 bpm. Slow it down to judge a moment, not because the dance is wrong at 120. |
 * | **pause / beat readout** | Freeze mid-move and read the beat. The clock keeps being reported while paused, so the readout is trustworthy either way. |
 * | **go home** | Stand the square at beat 0 of the selected figure and hold it there — the starting pose, paused, with any emote in flight dropped. This is how you get a *nameable* moment to judge: "the standing couple" only exists at the top of the loop, and at 120 bpm you cannot pause on it. |
 * | **the camera** (drag · scroll · right-drag) | Orbit, zoom and pan the fixed three-quarter view. Not a control in the panel, but a control: a pose is judged from a *chosen* angle — a straight-on front view and a level side view are two different questions about the same arm — and this scene had one angle and no way off it. Tilt stops at the horizon through the dancers, so the level side view is reachable and the camera never ends up under the floor. |
 * | **emote row** | Fires a one-shot emote *while* a call runs — the ADR-0010 arbitration this scene exists to watch. Arms fold where they trespass, a gripped hand ignores the emote outright, and a spin turns the head but must never turn a driven dancer's body: judge that on the **chest** dot, not the head dot. |
 * | **joint markers** | Black = the pair's midpoint, blue = elbows, red = hands — on whichever hand is in the partner's, an engine grip or a standing couple's touch hold. A held *grip* should look nailed to the black dot while the bodies breathe past it; a *touch hold* sits off it in **two** directions — `hold.lateral` (the hands hang between the two inside shoulders, not between the two bodies) and `hold.forward` (the upper arms hang, so the hands come out in front), both printed in the readout. The forward offset is a **plan view** question: from above, the dot the pair holds over and the dot their hands are on are visibly different points (ADR-0027). Off by default — a debugging aid, not part of the dance. |
 * | **follow drift** | Re-fits the frame to the dancers' centroid as the square migrates (square-one's ADR-0006 drift). |
 * | **beau / belle** | Who is dancing, from every character the game has — the four NPCs and the player. Colours are **positional**: `DanceFloor` paints occupant 0 and occupant 1, so the beau stays the beau's colour whoever stands there, and a swap changes exactly one thing. The pair is what every clearance in the arch work is solved from, so this is how a figure gets watched on a body it was not fitted to: Myco with Sprout is where it first paid off: a mismatched pair is pushed to twice their handholding width by the arch sizing, which is a defect the shipped pairing could not show. Read live through `getBodyShape`, so a body-editor edit shows up here. |
 * | **bodies** | Overrides the chosen pair's body radius to the SHAPE_BOUNDS extremes, to exercise the body-derived frame scale (ADR-0012). `mixed` and `max` must visibly grow the square while everyone still clears. A modifier on whoever is standing there, so the frame-scale watch is available on every pairing rather than only on Myco and Ember. |
 * | **contact readout** | Min–max of every tracked quantity since the current grip engaged, so drift shows as a spread rather than scrolling past. `separation` should breathe; everything else should be flat. Off by default, and **last in the column on purpose** — it is the one element whose height changes every frame, so nothing clickable sits below it. |
 *
 * The panel is **docked** rather than floating. It used to sit `position: absolute` over
 * the canvas, which put the controls on top of the one thing they exist to let you look
 * at.
 */

import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DanceFloor, type ArmReport } from "./DanceFloor";
import { AnimationController } from "../services/animation-controller";
import { DEBUG_EMOTES } from "./debug-emotes";
import type { Emote } from "../services/emotes";
import { DEFAULT_BPM } from "./useDancePerformance";
import { DEBUG_FIGURES, danceSceneHash, type DebugFigure } from "./dance-route";
import { armMetrics, sideExtentAt, touchHold, touchReach } from "./arm-pose";
import {
  getBodyShape,
  type CharacterBodyShape,
} from "../services/body-shapes";
import { castRoster } from "../config/npcs";

function withBodyRadius(shape: CharacterBodyShape, radius: number): CharacterBodyShape {
  return { ...shape, body: { ...shape.body, radius } };
}

type SizeCast = "default" | "mixed" | "max";

/**
 * Body radii for exercising the body-derived frame scale at the SHAPE_BOUNDS extremes,
 * as `[beau, belle]`. `default` dances the two chosen characters as they are authored
 * (which on Myco/Ember lands on DEFAULT_SCALE); the others must visibly grow the square
 * while everyone still clears.
 *
 * 🔑 **A size cast is a modifier on the chosen pair, not a cast of its own.** It used to
 * name Myco and Ember directly, which meant the size extremes could only ever be watched
 * on that one pairing — and the pairing is now a dropdown. Overriding one field of
 * whoever is standing there keeps the frame-scale watch (ADR-0012) available on every
 * pair the scene can put up.
 */
const BODY_RADII: Record<SizeCast, readonly [number, number] | undefined> = {
  default: undefined,
  mixed: [0.6, 0.1],
  max: [0.6, 0.6],
};

/** Who stands where when the scene opens — the pair every measurement in the ADRs is quoted on. */
const DEFAULT_CAST = { beau: "myco", belle: "ember" } as const;

/** The beau and the belle, in the order `DanceFloor` reads them: `[0]` wears the engine's key `a`. */
type CoupleShapes = readonly [CharacterBodyShape, CharacterBodyShape];

/**
 * The two dancers, as bodies.
 *
 * 🔴 **Read through {@link getBodyShape}, so this is the character as it exists** —
 * body-editor edits included — rather than the authored constant. That is the point of a
 * picker (the scene should dance the Myco the game draws), and it is also the one way
 * this scene can now disagree with a number quoted in an ADR: those were measured on the
 * *defaults*. With nothing saved the two are identical, and the hold readout below is
 * solved from these same shapes, so the panel still cannot disagree with the picture.
 *
 * 🔑 **The player is a body shape like any other here.** `Dancer` seats every occupant at
 * `NPC_BODY_CENTER_Y` and every measurement in the dance code reads the same constant, so
 * the rig-origin trap `ArmMetrics.rigOriginY` warns about — the player's group sitting at
 * a different world height from an NPC's — cannot be sprung inside `DanceFloor`. What the
 * player brings is proportions, which is exactly what is being watched.
 */
function castShapes(beauId: string, belleId: string, sizes: SizeCast): CoupleShapes {
  const radii = BODY_RADII[sizes];
  const pick = (id: string, i: 0 | 1): CharacterBodyShape => {
    const shape = getBodyShape(id);
    return radii === undefined ? shape : withBodyRadius(shape, radii[i]);
  };
  return [pick(beauId, 0), pick(belleId, 1)];
}

/**
 * The couple's solved handhold for a cast, as text — the numbers behind what the
 * standing couple looks like.
 *
 * Read straight from {@link touchHold} rather than plumbed out of the render, because it
 * *is* what the render poses against: one function, one set of inputs, so the panel cannot
 * disagree with the picture. `shapes[0]` is the beau (it wears the engine's key `a`).
 *
 * `reach` is the fraction of their own arm each dancer spends on the hold — the one that says
 * whether an arm is folded or stretched — and `across` is the distance itself. Since ADR-0027
 * the hands hang halfway between the two inside shoulders, so it is **`across` that the two
 * dancers share equally**; the fractions differ with the arms, and a shorter-armed dancer
 * spends more of themselves on the same distance.
 */
function holdReadout(cast: CoupleShapes): string {
  const beau = armMetrics(cast[0]);
  const belle = armMetrics(cast[1]);
  const hold = touchHold(beau, belle);
  const lines = [
    `stance   ${hold.width.toFixed(3)}  hands ${hold.height.toFixed(3)}`,
    `off-mid  ${hold.lateral.toFixed(3)} toward the belle`,
    `forward  ${hold.forward.toFixed(3)} in front of the pair`,
  ];
  // Daylight between the joined hands and each dancer's own surface at the hold's height.
  // Negative means the hands are *inside* somebody, which is what the size casts used to do
  // and what no amount of looking at the default cast would have shown.
  const stack = Math.max(beau.handRadius, belle.handRadius);
  for (const [m, name, sign] of [
    [beau, "beau ", 1],
    [belle, "belle", -1],
  ] as const) {
    // Each dancer stands half a stance from the midpoint on their own side, so the hold's
    // distance from *them* is the half-stance plus its offset toward the other one.
    const toHold = hold.width / 2 + sign * hold.lateral;
    const gap = toHold - sideExtentAt(m.parts, hold.height) - stack;
    // `+ 0` because a hold sitting exactly on a surface lands on negative zero, and a
    // readout that says `-0.000` for "touching" invites a bug hunt that has no bug in it.
    lines.push(`clear    ${name} ${(Number(gap.toFixed(3)) + 0).toFixed(3)}`);
  }
  for (const [m, name, isBeau] of [
    [beau, "beau ", true],
    [belle, "belle", false],
  ] as const) {
    const across = hold.width / 2 + (isBeau ? hold.lateral : -hold.lateral) - m.restX;
    const reach = touchReach(m, hold, isBeau);
    lines.push(`${name}    reach ${(100 * reach).toFixed(0)}%  across ${across.toFixed(3)}`);
  }
  return lines.join("\n");
}

/** Min–max of one tracked quantity since the current grip engaged. */
interface Span {
  min: number;
  max: number;
}

function track(spans: Map<string, Span>, name: string, value: number): void {
  const seen = spans.get(name);
  if (seen === undefined) {
    spans.set(name, { min: value, max: value });
    return;
  }
  seen.min = Math.min(seen.min, value);
  seen.max = Math.max(seen.max, value);
}

/** The two cast dropdowns, styled to sit with the panel's light chrome rather than the
 *  browser default, which is a full shade darker than everything around it. */
const CAST_SELECT: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #999",
  borderRadius: 4,
  color: "#333",
  padding: "3px 6px",
};

/** Width of the docked control column, in px. Wide enough for the emote row not to
 *  wrap and narrow enough to leave the floor the majority of the window. */
const PANEL_WIDTH = 320;

/**
 * What the camera orbits around, and what a level view is level *with*.
 *
 * Chest height rather than the floor or the frame's centre: the things this scene is
 * looked at to judge — an elbow, a joined hand, a shoulder — all live in that band
 * (the solved hold sits at 0.713 on the default cast, shoulders at 0.950), so an
 * orbit at the horizon puts the eye at the joint instead of below the dancers looking
 * up at them.
 */
const ORBIT_TARGET: [number, number, number] = [0, 0.9, 0];

function fmt(v: number): string {
  return (v < 0 ? "" : " ") + v.toFixed(3);
}

export function DanceDebugScene({ initialFigure }: { initialFigure: DebugFigure }) {
  const [figure, setFigure] = useState<DebugFigure>(initialFigure);
  const call = figure.call;
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [drift, setDrift] = useState(false);
  const [sizes, setSizes] = useState<SizeCast>("default");
  const [castIds, setCastIds] = useState<{ beau: string; belle: string }>({ ...DEFAULT_CAST });
  const [paused, setPaused] = useState(false);
  // Bumped to send the square home; `DanceFloor` reads the change, not the value.
  const [home, setHome] = useState(0);
  const [joints, setJoints] = useState(false);
  const [emoting, setEmoting] = useState<string | null>(null);
  // The contact readout is off by default and sits at the bottom of the panel. It
  // rewrites every frame and its height changes with the number of tracked rows, so
  // anything below it moves while you are trying to click it — which is no way to
  // fire an emote at a chosen moment. It is for judging grip drift; that watch is
  // done, and it can be turned back on for the next one.
  const [readout, setReadout] = useState(false);

  /**
   * The two bodies on the floor. Memoised on the three things that choose them, because
   * `DanceFloor` is keyed on the same three: a new array identity every render would be
   * harmless to the render and misleading to read.
   */
  const cast = useMemo(
    () => castShapes(castIds.beau, castIds.belle, sizes),
    [castIds.beau, castIds.belle, sizes],
  );
  const castOptions = castRoster();

  // One expression layer per dancer, so an emote can be fired *while* a call runs —
  // the arbitration this scene exists to watch. Both dancers get the same emote:
  // the interesting frames are the ones where both are reaching at once.
  const controllers = useMemo(
    () => [new AnimationController(), new AnimationController()] as const,
    [],
  );
  // An emote button is a trigger, not a switch. Two things follow from that.
  //
  // `interrupt` rather than `play`, because `play` *queues* behind whatever is
  // already running — press two emotes in a row and the second one appears to do
  // nothing, then arrives late. A hand-fired debug button means "show me this
  // now", so the press takes over.
  //
  // And the highlight is momentary: it marks the emote that is running and
  // releases itself when the emote ends. The emotes are one-shot, so their own
  // duration is when that is.
  const emoteTimer = useRef<number | null>(null);
  const fire = useCallback(
    (emote: Emote) => {
      if (emoteTimer.current !== null) clearTimeout(emoteTimer.current);
      for (const c of controllers) c.interrupt(emote, { resume: false });
      setEmoting(emote.id);
      emoteTimer.current = window.setTimeout(() => {
        emoteTimer.current = null;
        setEmoting(null);
      }, emote.duration * 1000);
    },
    [controllers],
  );
  useEffect(
    () => () => {
      if (emoteTimer.current !== null) clearTimeout(emoteTimer.current);
    },
    [],
  );

  // Go home: stand the square at beat 0 of the selected figure, and **stay** there.
  //
  // Pausing is not a side effect of this button, it is half of what it means. The
  // reason to ask for the start of a move is to look at it, and a scene that ran on
  // from beat 0 would give you the one frame you asked for and then take it away.
  //
  // Any emote in flight is stopped for the same reason: at beat 0 what should be on
  // screen is the figure's own starting pose, and a mid-flight emote is still folding
  // an arm somewhere while you judge it.
  const goHome = useCallback(() => {
    if (emoteTimer.current !== null) {
      clearTimeout(emoteTimer.current);
      emoteTimer.current = null;
    }
    for (const c of controllers) c.stop();
    setEmoting(null);
    setPaused(true);
    setHome((n) => n + 1);
  }, [controllers]);

  // The beat readout updates every frame; written straight to the DOM so a
  // 60 fps clock doesn't become 60 fps React renders (ADR-0002's idiom).
  const beatLabel = useRef<HTMLSpanElement>(null);
  const onBeat = useCallback((beat: number, totalBeats: number) => {
    const el = beatLabel.current;
    if (el) el.textContent = `beat ${beat.toFixed(1)} / ${totalBeats}`;
  }, []);

  // The tactile channel, in numbers — and in **ranges**, because an instantaneous
  // reading hides exactly the defect that matters. A grip is only a grip if it holds
  // *still*: `hand↔pivot` must be one frozen number while `separation` breathes, and
  // `along` (0 at the partner's elbow, 1 at their hand) must not wander. `gap` is the
  // surface distance, so negative is a hold. Every row is min–max since the current
  // grip engaged, so drift shows up as a spread instead of scrolling past.
  const armLabel = useRef<HTMLPreElement>(null);
  const spans = useRef(new Map<string, Span>());

  // The same thing in the scene: a marker on every tracked joint, so "is the grip
  // pinned to the pivot" is answerable by looking. Off by default — they are a
  // debugging aid, not part of the dance — and the refs simply read `null` while
  // unmounted, so the frame callback needs no notion of whether they are shown.
  // Created in a memo rather than by mutating a ref during render, same as
  // `DanceFloor`'s rigs.
  const markers = useMemo(
    () => ({
      pivot: createRef<THREE.Mesh>(),
      elbows: [createRef<THREE.Mesh>(), createRef<THREE.Mesh>()],
      hands: [createRef<THREE.Mesh>(), createRef<THREE.Mesh>()],
    }),
    [],
  );

  // What the last pass found there was to mark: whether the pair have a midpoint worth
  // a dot, and which hand — if either — each dancer has in somebody else's.
  //
  // Remembered rather than recomputed because **a paused floor runs no frame**. The
  // markers are turned on to judge a held pose, and the way to get one is `go home`,
  // which pauses — so a marker that only learned it had something to show during a pass
  // would come up dark at exactly the moment it was switched on for.
  const held = useRef<{ pivot: boolean; sides: ("left" | "right" | null)[] }>({
    pivot: false,
    sides: [null, null],
  });

  /** Show or hide the markers from what the last pass found. Positions are already on
   *  the meshes — they are mounted whether or not they are shown, so they keep them. */
  const paintMarkers = useCallback(
    (show: boolean) => {
      const pivot = markers.pivot.current;
      if (pivot) pivot.visible = show && held.current.pivot;
      held.current.sides.forEach((side, i) => {
        for (const marker of [markers.elbows[i], markers.hands[i]]) {
          const mesh = marker?.current;
          if (mesh) mesh.visible = show && side !== null;
        }
      });
    },
    [markers],
  );

  const onArms = useCallback((report: ArmReport) => {
    // Markers first: they should track whether or not the readout is legible.
    const pivot = markers.pivot.current;
    // Drawn for a standing couple too, not only a gripping pair. The joined hands sit
    // *off* this dot by `hold.lateral` **and** `hold.forward` there, by design (ADR-0027) — the one
    // thing about a touch hold worth having a reference point for.
    held.current.pivot = report.dancers.some((d) => d.holding || d.touch !== null);
    if (pivot) pivot.position.set(report.pivot.x, 0.02, report.pivot.z);
    report.dancers.forEach((d, i) => {
      // A hand in somebody else's, however it got there: square-one's grip spans, or the
      // couple's standing touch hold, which is not one of them and used to leave every
      // dot dark for the exact pose the elbow watch was about.
      const side = d.grip === "left" || d.grip === "right" ? d.grip : d.touch;
      held.current.sides[i] = side;
      if (side === null) return;
      for (const [which, marker] of [
        ["elbow", markers.elbows[i]],
        ["hand", markers.hands[i]],
      ] as const) {
        const mesh = marker?.current;
        if (!mesh) continue;
        const point = which === "elbow" ? d[side].elbow : d[side].hand;
        mesh.position.set(point.x, point.y, point.z);
      }
    });
    paintMarkers(joints);

    const el = armLabel.current;
    if (!el) return;
    const holding = report.dancers.filter((d) => d.holding);
    if (holding.length === 0) {
      spans.current.clear();
      // A standing couple is not "hands free" — their hands are joined, they simply have
      // no *engine* grip, which is what every row below is measured against. Two panes
      // of the same instrument should not disagree about whether anyone is holding on.
      // An arch is an engine grip, but it is posed as a *hold* rather than through the grip
      // blend — so `holding` is false for it and it would otherwise read here as "hands
      // free", the one wrong answer available. Which accommodation the pair drew is the
      // thing to watch (see `arch.ts`), so it is what the line says.
      const arching = report.dancers.find((d) => d.arch !== null);
      const stretched = report.dancers
        .filter((d) => d.bodyDelta !== 0)
        .map((d) => `${d.key} ${d.bodyDelta > 0 ? "+" : ""}${d.bodyDelta.toFixed(3)}`)
        .join(", ");
      el.textContent = arching
        ? `arch — ${arching.accommodation ?? "?"}${stretched === "" ? "" : ` (torso ${stretched})`}`
        : report.dancers.some((d) => d.touch !== null)
          ? "hands joined — a standing couple, no engine grip to track"
          : "hands free";
      return;
    }
    track(spans.current, "separation", report.separation);
    for (const d of holding) {
      const hand = d.grip === "left" || d.grip === "right" ? d[d.grip].hand : null;
      if (hand) {
        track(
          spans.current,
          `${d.key} hand↔pivot`,
          Math.hypot(hand.x - report.pivot.x, hand.z - report.pivot.z),
        );
      }
      track(spans.current, `${d.key} along`, d.contact.along);
      track(spans.current, `${d.key} gap`, d.contact.gap);
      // The undrawn upper arm (ADR-0017). A grip is pinned to the pair's pivot, so this
      // one *is* expected to breathe with the bodies — that is the compliant link doing
      // its job, and seeing the range is the point. A reach would hold it steady.
      if (d.grip === "left" || d.grip === "right") {
        track(spans.current, `${d.key} upper arm`, d.upperArm[d.grip]);
      }
    }
    el.textContent = [...spans.current]
      .map(([name, s]) => `${name.padEnd(14)} ${fmt(s.min)} → ${fmt(s.max)}   ±${fmt((s.max - s.min) / 2)}`)
      .join("\n");
  }, [markers, joints, paintMarkers]);

  // The toggle itself, for the paused case: no pass is coming to act on it.
  useEffect(() => { paintMarkers(joints); }, [joints, paintMarkers]);

  // The URL follows the chosen figure, and it follows it in the namespace the loader
  // reads: `danceSceneHash` is `danceSceneFigure`'s inverse, so what is in the bar is
  // what a reload — or a link to somebody else — brings back.
  useEffect(() => {
    window.location.hash = danceSceneHash(figure);
  }, [figure]);

  // The panel's own markup, lifted into a variable so the layout above reads as the
  // two columns it now is rather than burying the docked column under 150 lines of
  // controls. Same elements, same order, same handlers.
  const panel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        font: "13px/1.4 system-ui, sans-serif",
      }}
    >
        <strong>square-one · M4 debug</strong>
        <div style={{ display: "flex", gap: 6 }}>
          {DEBUG_FIGURES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setFigure(c); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: c.id === figure.id ? "#333" : "#fff",
                color: c.id === figure.id ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label>
          tempo {bpm} bpm
          <input
            type="range"
            min={30}
            max={180}
            value={bpm}
            onChange={(e) => { setBpm(Number(e.target.value)); }}
            style={{ width: "100%" }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { setPaused((p) => !p); }}
            style={{
              padding: "4px 10px",
              cursor: "pointer",
              background: paused ? "#333" : "#fff",
              color: paused ? "#fff" : "#333",
              border: "1px solid #999",
              borderRadius: 4,
            }}
          >
            {paused ? "▶ play" : "⏸ pause"}
          </button>
          <button
            onClick={goHome}
            title="Stand the square at beat 0 of the selected figure, paused"
            style={{
              padding: "4px 10px",
              cursor: "pointer",
              background: "#fff",
              color: "#333",
              border: "1px solid #999",
              borderRadius: 4,
            }}
          >
            ⏮ go home
          </button>
          <span ref={beatLabel} style={{ fontVariantNumeric: "tabular-nums", color: "#333" }}>
            beat 0.0 / –
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          emote
          {DEBUG_EMOTES.map((e) => (
            <button
              key={e.id}
              onClick={() => { fire(e); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: emoting === e.id ? "#333" : "#fff",
                color: emoting === e.id ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {e.name}
            </button>
          ))}
        </div>
        <span style={{ color: "#666", fontSize: 11 }}>
          One-shot — the button releases when the emote ends. Arms fold where they
          trespass; a gripped hand ignores the emote entirely; a spin turns the head
          and sweeps the arms but must not turn a driven dancer's body at all — judge
          that on the <strong>chest</strong> dot, not the head dot, which the spin owns.
          Puff up should swell in full while the pair is apart and be squeezed back as
          they close, each dancer by their own share of the gap.
        </span>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={joints} onChange={(e) => { setJoints(e.target.checked); }} />
          joint markers (pivot · elbows · hands)
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={drift} onChange={(e) => { setDrift(e.target.checked); }} />
          follow drift (re-fit frame to centroid)
        </label>
        {/* Who is dancing. Colours stay positional — `DanceFloor` paints occupant 0 and
            occupant 1, not Myco and Ember — so the beau is the same colour whoever is
            standing there, and the two dropdowns read as two *places* rather than two
            people. That is what makes swapping a body a controlled change. */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
            beau
            <select
              value={castIds.beau}
              onChange={(e) => { setCastIds((c) => ({ ...c, beau: e.target.value })); }}
              style={CAST_SELECT}
            >
              {castOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
            belle
            <select
              value={castIds.belle}
              onChange={(e) => { setCastIds((c) => ({ ...c, belle: e.target.value })); }}
              style={CAST_SELECT}
            >
              {castOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          bodies
          {(Object.keys(BODY_RADII) as SizeCast[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSizes(s); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: s === sizes ? "#333" : "#fff",
                color: s === sizes ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <span style={{ color: "#666" }}>red = engine +x · blue = engine +y</span>

        {/* Touch hands, as numbers. Fixed for a cast, so it sits above the frame-by-frame
            readout and never moves. */}
        {figure.sequence !== undefined && (
          <>
            <pre
              style={{
                font: "11px/1.45 ui-monospace, monospace",
                color: "#333",
                margin: 0,
                padding: "6px 8px",
                background: "#f7f7f4",
                border: "1px solid #e0e0da",
                borderRadius: 4,
                whiteSpace: "pre",
              }}
            >
              {holdReadout(cast)}
            </pre>
            <span style={{ color: "#666", fontSize: 11 }}>
              The standing couple, solved from the two bodies. The hands hang halfway
              between the two inside shoulders, so the two <strong>across</strong> figures
              should be <em>equal</em> — the reach percentages need not be, since a shorter
              arm spends more of itself on the same distance, and neither may exceed 100%.
              <strong>forward</strong> is how far in front of the pair the hands sit: as far
              as both can manage with the upper arm hanging straight down, so one dancer's
              elbow is dead below their shoulder and the other's folds back.
              <strong>clear</strong> is the daylight between the joined hands and each
              dancer's own surface at that height — never negative, whatever the cast, or the
              hands are inside somebody. Measured side-to-side at <em>z</em> 0, which is the
              conservative reading now the hands are in front: a body is narrower there.
            </span>
          </>
        )}

        {/* Last in the column on purpose: this is the one element whose height
            changes every frame, so nothing that has to be clicked sits below it. */}
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={readout}
            onChange={(e) => {
              // Spans stop accumulating while hidden, so a stale map would otherwise
              // reappear as history from before it was switched off.
              spans.current.clear();
              setReadout(e.target.checked);
            }}
          />
          contact readout (grip drift)
        </label>
        {readout && (
          <>
            <pre
              ref={armLabel}
              style={{
                font: "11px/1.45 ui-monospace, monospace",
                color: "#333",
                margin: 0,
                padding: "6px 8px",
                background: "#f7f7f4",
                border: "1px solid #e0e0da",
                borderRadius: 4,
                whiteSpace: "pre",
              }}
            >
              hands free
            </pre>
            <span style={{ color: "#666", fontSize: 11 }}>
              min → max since the grip engaged. `separation` should breathe; everything
              else should be flat.
            </span>
          </>
        )}
    </div>
  );

  return (
    // Docked, not floating. The panel used to sit `position: absolute` over the canvas,
    // which put the controls on top of the one thing they exist to let you look at — and
    // this scene's whole job is looking. A flex row gives the panel its own column and
    // the canvas everything else, so nothing to judge is ever underneath a button.
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f2", display: "flex" }}>
      <div
        style={{
          width: PANEL_WIDTH,
          flex: "0 0 auto",
          overflowY: "auto",
          borderRight: "1px solid #ccc",
          background: "#fbfbfa",
        }}
      >
        {panel}
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
      <Canvas shadows camera={{ position: [0, 6.5, 7.5], fov: 45 }}>
        {/* The camera moves. Until now it did not, and that was the missing half of
            every watch this scene exists for: "go home" gets you the moment, this gets
            you the angle — a straight-on front view and a level side view of the same
            paused pose are two different judgements, and the fixed three-quarter view
            answered neither cleanly.

            `maxPolarAngle` stops the orbit at the horizon through {@link ORBIT_TARGET}:
            level with the dancers' chests is the lowest useful angle and also the last
            one above the floor, so one clamp buys the side view and rules out the
            camera-under-the-ground-plane mistake. Panning stays enabled, unlike the
            character previews — the square migrates under `follow drift`, and going
            after it by hand is a thing you want to be able to do. */}
        <OrbitControls
          target={ORBIT_TARGET}
          maxPolarAngle={Math.PI / 2}
          minDistance={1.5}
          maxDistance={24}
        />

        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />

        {/* Floor, with a grid so travel and lane offsets are readable. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#e8e8e4" />
        </mesh>
        <gridHelper args={[24, 24, "#b9b9b3", "#d6d6d0"]} />
        {/* Engine axes: red = +x, blue = engine +y (world −z). */}
        <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.02, 0), 2.2, 0xcc4433]} />
        <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.02, 0), 2.2, 0x3355cc]} />

        {/* Keyed on the cast: the frame (and its body-derived scale) is built
            once per mount, so a new cast means a fresh DanceFloor — which is now either
            dancer being swapped as well as the size extreme being changed. */}
        <DanceFloor
          key={`${castIds.beau}|${castIds.belle}|${sizes}`}
          call={call}
          {...(figure.sequence === undefined ? {} : { sequence: figure.sequence })}
          bpm={bpm}
          loop
          followDrift={drift}
          paused={paused}
          home={home}
          onBeat={onBeat}
          onArms={onArms}
          controllers={controllers}
          shapes={cast}
        />

        {/* Joint markers: black = the pair's midpoint, blue = each elbow, red = each
            hand — on whichever hand is in the partner's, an engine grip or a standing
            couple's touch hold. A held grip should look nailed to the black dot while
            the bodies breathe past it; a touch hold sits off it by `hold.lateral`.

            Always mounted, shown by `paintMarkers` — five tiny spheres cost nothing,
            and unmounting them on the toggle threw away both their positions and their
            visibility, which only a *pass* could put back. A paused floor runs none. */}
        <mesh ref={markers.pivot} visible={false}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        {markers.elbows.map((ref, i) => (
          <mesh key={`elbow-${String(i)}`} ref={ref} visible={false}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color="#2255cc" />
          </mesh>
        ))}
        {markers.hands.map((ref, i) => (
          <mesh key={`hand-${String(i)}`} ref={ref} visible={false}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color="#cc3322" />
          </mesh>
        ))}
      </Canvas>
      </div>
    </div>
  );
}
