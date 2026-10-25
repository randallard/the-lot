/**
 * 🧪 The posing screen — **a prototype of the controls, not yet of the posing.** (2026-10-18)
 *
 * Reached at `#review2`, `#review2=<figure>/<beau>-<belle>`, or `…/only` for one couple alone.
 *
 * The 10-11 change of approach — *Ryan poses, the rules check* — needs a screen whose whole job
 * is putting two bodies where Ryan wants them along a move and keeping those moments as
 * keyframes. `#review` grew a lab bench of dials over a month of solver work; this starts again
 * with none of it, beside it rather than in place of it.
 *
 * | Control | State |
 * |---|---|
 * | pairing — figure, the 25-pairing list, swap | ✅ real (the live `DanceFloor`) |
 * | play / pause · step ±1/10 · scrub | ✅ real (the floor's own clock and `seek`) |
 * | click a body part → its name and dials | ✅ real — every dial **reads** the drawn pose (`pose-dials.ts`) |
 * | turning a dial, couple width | ✅ moves the **drawn** pose (`applyToRigs`), not the solver; no rule keeps anything else right |
 * | keyframes, the drawer, accept & lock | ✅ real — an event log in IndexedDB (`pose-events.ts`, `pose-store.ts`) |
 * | save / load | ✅ real — an event bundle; load merges, never overwrites |
 * | play: my keyframes | ✅ each couple eases in and out between its own keyframes (`sampleTrack`), blending with the solver at the edges |
 *
 * **Every couple vs one couple.** With no pairing highlighted in the drawer, a keyframe goes
 * straight to **every couple that isn't locked**. With a pairing highlighted, it goes to that
 * couple alone, on top of everyone's, and that couple is marked for review. A couple accepted
 * and locked keeps its timeline through both. See `pose-events.ts`.
 *
 * **State** follows ADR-0065. The facts are the event log; where you are by pairing is the URL;
 * the moment, the selection and the dial edits are one pure reducer (`review2-session.ts`).
 * Everything the screen shows is derived from those three. What stays local is either a
 * measurement (the rig readings, where the modal fits) or the floor's own clock, read on pause.
 *
 * See `work/square-dance-planning/review2/` for the plan and what each stub is waiting on.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DanceFloor } from "./DanceFloor";
import { getBodyShape, type CharacterBodyShape } from "../services/body-shapes";
import { castRoster } from "../config/npcs";
import { REVIEW_FIGURES } from "./review-steps";
import { pairingId, reviewPairings } from "./review-route";
import { poseTargetId, review2Hash, review2Target, type PoseTarget } from "./review2-route";
import { EDGE_BLEND, PARTS, WIDTH_KEY, applyToRigs, dialKey, isPartId, readRigs, sampleTrack, type Aspect, type PartId } from "./pose-dials";
import {
  fromBundle,
  lockedBehind,
  makeEvent,
  pairingTimeline,
  reduce,
  reviewFlag,
  timelinesOf,
  toBundle,
  type DialKey,
  type Keyframe,
  type PoseEvent,
  type PoseEventBody,
  type ReviewFlag,
  type Source,
} from "./pose-events";
import { downloadText, openPoseStore, type PoseStore } from "./pose-store";
import { toWorld, type Coord } from "./couple-disk";
import {
  editsHere,
  initialSession,
  isMuted,
  keyframeHere,
  keyframeToKeep,
  reduce as reduceSession,
  sameMoment,
  setHere,
  SPACING,
  type Anchor,
} from "./review2-session";

const ORBIT_TARGET: [number, number, number] = [0, 0.9, 0];
const BOTTOM_HEIGHT = 128;
const DRAWER_WIDTH = 400;
const WIDTH_NUDGE = 2;

/** A keyframe on the timeline at the bottom, and where it came from. */
interface Shown {
  readonly keyframe: Keyframe;
  readonly source: Source;
}

const pct = (t: number) => `${(t * 100).toFixed(0)}%`;
const signed = (v: number) => `${v > 0 ? "+" : ""}${String(Math.round(v * 10) / 10)}`;

// ── Styles ─────────────────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  position: "absolute",
  background: "rgba(255,255,255,0.97)",
  border: "1px solid #ccc",
  borderRadius: 8,
  boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
  padding: 12,
  fontSize: 13,
  zIndex: 2,
};
const stub: React.CSSProperties = { color: "#a35d00", fontSize: 11 };
const btn: React.CSSProperties = { padding: "3px 9px", fontSize: 13, cursor: "pointer" };

const SOURCE_COLOR: Readonly<Record<Shown["source"], string>> = {
  general: "#8a8a84",
  own: "#d4561e",
  hidden: "transparent",
};
const SOURCE_LABEL: Readonly<Record<Shown["source"], string>> = {
  general: "every couple (except locked)",
  own: "this couple's own",
  hidden: "general, hidden for this couple",
};
const FLAG: Readonly<Record<ReviewFlag, ReactNode>> = {
  none: null,
  custom: <span style={{ color: "#d4561e", fontSize: 11 }} title="has keyframes of its own">✎ custom — review</span>,
  stale: <span style={{ color: "#b03a2e", fontSize: 11, fontWeight: 600 }} title="every couple's timeline changed after this couple's own keyframes were made">⚠ custom, every couple's changed since — review</span>,
  locked: <span style={{ color: "#2e7d4f", fontSize: 11, fontWeight: 600 }} title="accepted at this timeline; changes to every couple pass it by">🔒 accepted</span>,
};
/** The same marks, as text for the pairing list's options. */
const FLAG_TEXT: Readonly<Record<ReviewFlag, string>> = { none: "", custom: "✎ ", stale: "⚠ ", locked: "🔒 " };

const POPOVER_WIDTH = 320;

/**
 * A 🧪 label that says more on hover — what the stub will do once it is built, and what it is
 * waiting on. A positioned popover rather than a `title`, because these run to a paragraph and a
 * native tooltip is slow to appear and cannot wrap. `fixed`, so the scrolling modal cannot clip it.
 */
function Explain({ children, why }: { children: ReactNode; why: ReactNode }) {
  const [at, setAt] = useState<{ x: number; y: number; above: boolean } | null>(null);
  return (
    <span
      style={{ ...stub, borderBottom: "1px dotted #a35d00", cursor: "help" }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_WIDTH - 8);
        const above = r.top > window.innerHeight / 2;
        setAt({ x, y: above ? window.innerHeight - r.top + 6 : r.bottom + 6, above });
      }}
      onMouseLeave={() => { setAt(null); }}
    >
      {children}
      {at !== null && (
        <span
          style={{
            position: "fixed", left: at.x, width: POPOVER_WIDTH, zIndex: 10,
            ...(at.above ? { bottom: at.y } : { top: at.y }),
            background: "#fffaf0", color: "#333", border: "1px solid #d9b77a", borderRadius: 6,
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)", padding: "8px 10px", fontSize: 12, lineHeight: 1.45,
            whiteSpace: "normal", pointerEvents: "none",
          }}
        >
          {why}
        </span>
      )}
    </span>
  );
}

const MODAL_WIDTH = 380;
const MODAL_GAP = 16;
const MODAL_TOP = 64;

/**
 * Beside the couple, on the side of the part that was clicked — so the dials are a short move from
 * the click and cover neither dancer. The other side if that one has no room; if neither does, the
 * roomier side, pulled into the window (and then it overlaps, which beats leaving the screen).
 * `limit` is the right edge of the usable area — the window, less the drawer when it is open.
 */
function placeModal(a: Anchor, height: number, limit: number): { left: number; top: number; maxHeight: number } {
  const leftX = a.left - MODAL_GAP - MODAL_WIDTH;
  const rightX = a.right + MODAL_GAP;
  const fitsLeft = leftX >= 8;
  const fitsRight = rightX + MODAL_WIDTH <= limit - 8;
  const nearLeft = a.clickX < (a.left + a.right) / 2;
  let x: number;
  if (nearLeft && fitsLeft) x = leftX;
  else if (!nearLeft && fitsRight) x = rightX;
  else if (fitsLeft) x = leftX;
  else if (fitsRight) x = rightX;
  else x = a.left > limit - a.right ? 8 : limit - MODAL_WIDTH - 8;
  const floor = window.innerHeight - BOTTOM_HEIGHT - 10;
  const top = Math.min(Math.max(MODAL_TOP, a.clickY - Math.min(height, 260) / 2), Math.max(MODAL_TOP, floor - height));
  return { left: x, top, maxHeight: floor - top };
}

/**
 * Reads every dial off the drawn rigs, a few times a second — inside the canvas because the rigs
 * are. Paused, the values stop changing and so does the panel; playing, the dials follow the move.
 */
function RigReader({ focus, shapes, onRead }: { focus: string; shapes: readonly CharacterBodyShape[]; onRead: (v: Record<DialKey, number>) => void }) {
  const { scene } = useThree();
  const last = useRef(-1);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.15) return;
    last.current = clock.elapsedTime;
    const couple = scene.getObjectByName(`couple:${focus}`);
    if (couple !== undefined) onRead(readRigs(couple.getObjectsByProperty("name", "dancer"), shapes));
  });
  return null;
}

/**
 * Puts one couple's pose onto its drawn rigs, every frame, **after** the floor has posed them.
 * Mounted after the couple's `DanceFloor`, so its frame callback runs second.
 *
 * - `track`: playing my keyframes. The couple's timeline is sampled at the floor's clock, eased
 *   in and out between keyframes, and blended with the solver's pose into the first and out of the
 *   last. That pose is read off the rig **before** this writes over it: every frame while playing
 *   (the floor re-poses every frame), and on the frame of each seek while paused (the floor poses
 *   once, then holds).
 * - `values`: what's set at this moment (a keyframe here, unkept edits), on top of either.
 *
 * When either goes away the screen re-seeks every floor, which puts the solver's pose back.
 */
function PoseOverride({ id, shapes, values, track, clock, playing, seekToken }: {
  id: string;
  shapes: readonly CharacterBodyShape[];
  values: Readonly<Record<DialKey, number>> | undefined;
  track: readonly Keyframe[] | undefined;
  clock: { readonly current: number };
  playing: boolean;
  seekToken: number;
}) {
  const { scene } = useThree();
  const solver = useRef<Record<DialKey, number> | undefined>(undefined);
  const seen = useRef<number | null>(null);
  useFrame(() => {
    if (values === undefined && track === undefined) return;
    const couple = scene.getObjectByName(`couple:${id}`);
    if (couple === undefined) return;
    // Deep: the dancers sit inside the turn-around group, not directly under the couple.
    const rigs = couple.getObjectsByProperty("name", "dancer");
    if (track !== undefined && (playing || seen.current !== seekToken)) {
      solver.current = readRigs(rigs, shapes);
      seen.current = seekToken;
    }
    const sampled = track === undefined ? undefined : sampleTrack(track, clock.current, solver.current);
    if (values === undefined && sampled === undefined) return;
    applyToRigs(rigs, shapes, { ...sampled, ...values });
  });
  return null;
}

const FADE_SECONDS = 0.35;
/** A move shorter than this (spacing units) glides; anything longer fades out and back in. */
const GLIDE_UNDER = 0.75;
const GLIDE_RATE = 6;

/** Every material under a couple, faded together. Transparent only while fading, so a couple at rest draws exactly as before. */
function setOpacity(root: THREE.Object3D, opacity: number): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats as THREE.Material[]) {
      const fading = opacity < 1;
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = opacity;
    }
  });
}

/**
 * One couple's place on the floor. A short change of spot (a ring settling round a new focus)
 * glides there; a long one fades the couple out where it was and back in where it's going. A
 * change of **spacing** moves it straight there, because nobody changed places.
 */
function CoupleSlot({ id, coord, spacing, shown, turned, children }: { id: string; coord: Coord; spacing: number; shown: boolean; turned: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const drawnAt = useRef<Coord>(coord);
  const fade = useRef<{ phase: "out" | "in"; t: number } | null>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (g === null) return;
    const target = coord;
    const off = Math.hypot(target[0] - drawnAt.current[0], target[1] - drawnAt.current[1]);
    if (fade.current === null && off > 1e-6) {
      if (off >= GLIDE_UNDER) fade.current = { phase: "out", t: 0 };
      else if (off < 1e-3) drawnAt.current = target;
      else {
        const k = Math.min(1, dt * GLIDE_RATE);
        const [x0, z0] = drawnAt.current;
        drawnAt.current = [x0 + (target[0] - x0) * k, z0 + (target[1] - z0) * k];
      }
    }
    const f = fade.current;
    if (f !== null) {
      f.t += dt / FADE_SECONDS;
      if (f.phase === "out" && f.t >= 1) {
        drawnAt.current = target;
        fade.current = { phase: "in", t: 0 };
      } else if (f.phase === "in" && f.t >= 1) {
        fade.current = null;
      }
      const now = fade.current;
      const opacity = now === null ? 1 : now.phase === "out" ? 1 - Math.min(1, now.t) : Math.min(1, now.t);
      setOpacity(g, opacity);
      if (label.current) label.current.style.opacity = String(opacity);
    }
    const { x, z } = toWorld(drawnAt.current, spacing);
    g.position.set(x, 0, z);
  });
  return (
    <group ref={group} name={`couple:${id}`} visible={shown}>
      {/* The couple stand centred on the slot, so half a turn here is exactly where a turn-under left them. */}
      <group rotation={[0, turned ? Math.PI : 0, 0]}>{children}</group>
      <Html position={[0, 2.5, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[1, 0]}>
        <div ref={label} style={{ display: shown ? undefined : "none", fontSize: 11, color: "#444", background: "rgba(255,255,255,0.75)", padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap" }}>
          {id.replace("-", " → ")}
        </div>
      </Html>
    </group>
  );
}

/**
 * Glides the orbit camera to the focus couple: target and camera move by the same amount, so the
 * angle you were looking from is kept.
 */
function FollowFocus({ to }: { to: { x: number; z: number } }) {
  const controls = useThree((st) => st.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const camera = useThree((st) => st.camera);
  useFrame((_, dt) => {
    if (controls === null) return;
    const dx = to.x - controls.target.x;
    const dz = to.z - controls.target.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const k = Math.min(1, dt * 4);
    controls.target.x += dx * k;
    controls.target.z += dz * k;
    camera.position.x += dx * k;
    camera.position.z += dz * k;
    controls.update();
  });
  return null;
}

/** A thin 0–100% strip of keyframe diamonds, for the drawer's rows. */
function MiniTimeline({ frames }: { frames: readonly Shown[] }) {
  return (
    <div style={{ position: "relative", height: 14, background: "#f0f0ec", borderRadius: 3, margin: "4px 0 2px" }}>
      {frames.map((f) => (
        <div
          key={f.keyframe.t}
          style={{
            position: "absolute", left: pct(f.keyframe.t), top: 3, width: 7, height: 7,
            transform: "translateX(-50%) rotate(45deg)",
            background: SOURCE_COLOR[f.source], border: `1px solid ${f.source === "hidden" ? "#999" : "#333"}`,
          }}
        />
      ))}
    </div>
  );
}

export function Review2Scene({ initialTarget }: { initialTarget: PoseTarget }) {
  const [targetId, setTargetId] = useState(poseTargetId(initialTarget));
  const target = useMemo(() => review2Target(`#review2=${targetId}`) ?? initialTarget, [targetId, initialTarget]);
  const { figure, pairing, only } = target;
  const pid = pairingId(pairing);
  const loadedKey = `${pid}|${figure.id}`;

  const allIds = useMemo(() => reviewPairings().map(pairingId), []);
  const [session, dispatch] = useReducer(reduceSession, undefined, () => initialSession(targetId, loadedKey, allIds, pid));
  const { t, playing, selected, anchor, drawerOpen, openFrame, mode, everything, notice, layout, spacing, handsOnArc, allCouples, turnAround, turned } = session;
  useEffect(() => { dispatch({ type: "retarget", scope: targetId, loaded: loadedKey, focus: pid }); }, [targetId, loadedKey, pid]);

  useEffect(() => {
    const want = review2Hash(target);
    if (window.location.hash !== want) window.history.replaceState(null, "", want);
  }, [target]);
  useEffect(() => {
    const onHash = () => {
      const t = review2Target(window.location.hash);
      if (t !== null) setTargetId(poseTargetId(t));
    };
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("hashchange", onHash); };
  }, []);

  const labels = useMemo(() => new Map(castRoster().map((c) => [c.id, c.label])), []);
  const pairName = (p: { beau: string; belle: string }) => `${labels.get(p.beau) ?? p.beau} → ${labels.get(p.belle) ?? p.belle}`;
  const nameOf = (dancer: number) => {
    const id = dancer === 0 ? pairing.beau : pairing.belle;
    return `${labels.get(id) ?? id} (${dancer === 0 ? "beau" : "belle"})`;
  };
  const go = (beau: string, belle: string, opts: { figureId?: string; only?: boolean } = {}) => {
    const p = reviewPairings().find((x) => x.beau === beau && x.belle === belle);
    const f = REVIEW_FIGURES.find((x) => x.id === (opts.figureId ?? figure.id));
    if (p !== undefined && f !== undefined) setTargetId(poseTargetId({ figure: f, pairing: p, only: opts.only ?? only }));
  };

  const shapes = useMemo(
    () => [getBodyShape(pairing.beau), getBodyShape(pairing.belle)] as const,
    [pairing.beau, pairing.belle],
  );
  const allShapes = useMemo(
    () => new Map(reviewPairings().map((p) => [pairingId(p), [getBodyShape(p.beau), getBodyShape(p.belle)] as const])),
    [],
  );
  const focusAt = useMemo(() => toWorld(layout[pid] ?? [0, 0], spacing), [layout, pid, spacing]);

  // ── The event log ────────────────────────────────────────────────────────────────────────

  const store = useRef<PoseStore | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [events, setEvents] = useState<readonly PoseEvent[]>([]);
  useEffect(() => {
    let live = true;
    void openPoseStore().then(async ({ store: s, persistent: p }) => {
      const all = await s.all();
      if (!live) return;
      store.current = s;
      setPersistent(p);
      setEvents(all);
    });
    return () => { live = false; };
  }, []);
  const append = useCallback((...bodies: PoseEventBody[]) => {
    const made = bodies.map((b) => makeEvent(b));
    setEvents((prev) => [...prev, ...made]);
    void store.current?.append(made);
  }, []);

  const state = useMemo(() => reduce(events), [events]);
  const fig = useMemo(() => timelinesOf(state, figure.id), [state, figure.id]);
  const timeline: readonly Shown[] = useMemo(
    () => (only ? pairingTimeline(fig, pid) : fig.general.map((keyframe) => ({ keyframe, source: "general" as const }))),
    [fig, only, pid],
  );

  // ── Readings, and what's set here ──────────────────────────────────────────────────────
  //
  // A dial shows what the figure is doing (the reading) unless something is set at this moment:
  // the keyframe the playhead is on, with your unkept edits over it. All derived.

  const [readings, setReadings] = useState<Record<DialKey, number>>({});
  const lastReading = useRef("");
  const onRead = useCallback((v: Record<DialKey, number>) => {
    const s = JSON.stringify(v);
    if (s === lastReading.current) return;
    lastReading.current = s;
    setReadings(v);
  }, []);

  const hereRaw = keyframeHere(session, timeline);
  const here = hereRaw !== undefined && !isMuted(session, figure.id, pid, hereRaw.keyframe.t) ? hereRaw : undefined;
  const edits = editsHere(session);
  const set = setHere(here?.keyframe, edits);
  const valueOf = (k: DialKey) => set[k] ?? readings[k];

  /*
   * What each couple wears on top of the solver right now, paused: its own keyframe at this
   * moment (unless muted for it), plus the unkept dial edits wherever they'd land if kept. That's
   * the highlighted couple alone, or with nothing highlighted every unlocked couple without a
   * keyframe of its own here. Derived; the floors are re-posed whenever it changes.
   */
  const overrides = useMemo(() => {
    const out = new Map<string, Record<DialKey, number>>();
    if (playing) return out;
    for (const id of allIds) {
      const tl = only && id === pid ? timeline : pairingTimeline(fig, id);
      const k = tl.find((f) => f.source !== "hidden" && sameMoment(f.keyframe.t, t));
      const kept = k !== undefined && !isMuted(session, figure.id, id, t) ? k.keyframe : undefined;
      const takesEdits = only ? id === pid : !fig.locked.has(id) && k?.source !== "own";
      const v = setHere(kept, takesEdits ? edits : {});
      if (Object.keys(v).length > 0) out.set(id, v);
    }
    return out;
  }, [playing, allIds, only, pid, timeline, fig, t, session, figure.id, edits]);
  /** Playing my keyframes: each couple's timeline, less what it hides and what's muted for it. */
  const tracks = useMemo(() => {
    const out = new Map<string, readonly Keyframe[]>();
    if (mode !== "keyframes") return out;
    for (const id of allIds) {
      const frames = pairingTimeline(fig, id)
        .filter((f) => f.source !== "hidden" && !isMuted(session, figure.id, id, f.keyframe.t))
        .map((f) => f.keyframe);
      if (frames.length > 0) out.set(id, frames);
    }
    return out;
  }, [mode, allIds, fig, session, figure.id]);
  const overridesKey = useMemo(
    () => JSON.stringify([[...overrides.entries()], mode, events.length, session.muted]),
    [overrides, mode, events.length, session.muted],
  );
  const firstKey = useRef(overridesKey);
  useEffect(() => {
    if (overridesKey === firstKey.current) return;
    firstKey.current = overridesKey;
    dispatch({ type: "repose" });
  }, [overridesKey]);
  const setEdit = (k: DialKey, v: number | null) => { dispatch({ type: "edit", key: k, value: v }); };

  useEffect(() => {
    if (notice === null) return;
    const id = setTimeout(() => { dispatch({ type: "dismissNotice", n: notice.n }); }, 4000);
    return () => { clearTimeout(id); };
  }, [notice]);

  // ── Transport ────────────────────────────────────────────────────────────────────────────
  //
  // `t` is the fraction of the move, 0–1. While playing, the floor's clock is the truth and
  // is written straight to the DOM (onBeat must not set state); paused, `t` is state and the
  // floor is told where to stand by a seek.

  // The floor's clock, read every frame for the playhead and handed to the reducer on pause or a
  // step. Not a copy of `t`: while paused the two agree because the floor is standing at `t`.
  const clock = useRef(0);
  const looping = useRef(false);
  const lastBeat = useRef(0);
  const scrubRef = useRef<HTMLInputElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLSpanElement>(null);

  const seek = useMemo(
    () => ({ token: session.seekToken, beat: t * figure.beats, arch: "declared" as const }),
    // `t` deliberately left out: a seek is the token's to announce, and `t` also moves on pause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.seekToken, figure.beats],
  );

  const onBeat = useCallback(
    (beat: number) => {
      const frac = Math.min(1, Math.max(0, beat / figure.beats));
      clock.current = frac;
      if (headRef.current) headRef.current.style.left = pct(frac);
      if (scrubRef.current && playing) scrubRef.current.value = String(frac);
      if (readRef.current) readRef.current.textContent = `${pct(frac)} · beat ${beat.toFixed(2)} / ${String(figure.beats)}`;
      // The floor wraps by itself, so a loop is seen as the beat jumping from near the end back
      // to near the start while playing; a scrub or step doesn't jump like that.
      if (playing && lastBeat.current > figure.beats * 0.8 && beat < figure.beats * 0.2) dispatch({ type: "wrapped" });
      lastBeat.current = beat;
      if (playing && beat >= figure.beats && !looping.current) {
        looping.current = true;
        setTimeout(() => { looping.current = false; dispatch({ type: "loop" }); }, 250);
      }
    },
    [figure.beats, playing],
  );

  const seekTo = useCallback((to: number) => { dispatch({ type: "seek", to }); }, []);
  const togglePlay = useCallback(() => {
    dispatch(playing ? { type: "pause", at: clock.current } : { type: "play" });
  }, [playing]);
  const stepBy = useCallback((dir: 1 | -1) => {
    dispatch({ type: "step", dir, from: playing ? clock.current : t });
  }, [playing, t]);
  const nudgeWidth = useCallback((by: number) => {
    dispatch({ type: "nudge", key: WIDTH_KEY, by, base: set[WIDTH_KEY] ?? readings[WIDTH_KEY] ?? 0, min: 0, max: 300 });
  }, [set, readings]);

  // ── Selection: click a mesh, find its part and its dancer ────────────────────────────────

  // The click handler is created once; these let it reach the current pairing and navigation.
  const pidRef = useRef(pid);
  pidRef.current = pid;
  const goRef = useRef(go);
  goRef.current = go;

  // Where the modal fits is a measurement of the card and the window, not managed state.
  const modalRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const isOpen = selected !== null;
  // Placed once per click (and on a resize or the drawer moving), from the card's own height — not
  // on every render, or opening a linked part's section would move the dials out from under the mouse.
  useLayoutEffect(() => {
    if (anchor === null || modalRef.current === null) return;
    const place = () => {
      const limit = window.innerWidth - (drawerOpen ? DRAWER_WIDTH : 0);
      if (modalRef.current !== null) setPlaced(placeModal(anchor, modalRef.current.offsetHeight, limit));
    };
    place();
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("resize", place); };
  }, [anchor, isOpen, drawerOpen]);

  const lit = useRef<{ mat: THREE.MeshStandardMaterial; was: number } | null>(null);
  const unlight = useCallback(() => {
    if (lit.current) lit.current.mat.emissive.setHex(lit.current.was);
    lit.current = null;
  }, []);

  const onPick = useCallback((e: ThreeEvent<MouseEvent>) => {
    const obj = e.object;
    let couple: THREE.Object3D | null = obj;
    while (couple !== null && !couple.name.startsWith("couple:")) couple = couple.parent;
    // A hidden couple is still in the scene: let the click through to whatever is behind it.
    if (couple !== null && !couple.visible) return;
    e.stopPropagation();
    if (!isPartId(obj.name)) return;
    const clicked = couple?.name.slice("couple:".length);
    if (clicked !== undefined && clicked !== pidRef.current) {
      // Another couple: bring it to the centre rather than open its dials.
      const p = reviewPairings().find((x) => pairingId(x) === clicked);
      if (p !== undefined) goRef.current(p.beau, p.belle);
      return;
    }
    let rig: THREE.Object3D | null = obj;
    while (rig !== null && rig.name !== "dancer") rig = rig.parent;
    if (rig === null || rig.parent === null) return;
    const dancer = rig.parent.children.filter((c) => c.name === "dancer").indexOf(rig);
    if (dancer < 0) return;
    unlight();
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      lit.current = { mat: obj.material, was: obj.material.emissive.getHex() };
      obj.material.emissive.setHex(0x3355cc);
    }
    // Where the couple stands on screen right now: both dancers' boxes, projected.
    const box = new THREE.Box3();
    for (const d of rig.parent.children) if (d.name === "dancer") box.expandByObject(d);
    const rect = (e.nativeEvent.target as HTMLElement).getBoundingClientRect();
    let left = Infinity;
    let right = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const v = new THREE.Vector3(x, y, z).project(e.camera);
      const sx = rect.left + ((v.x + 1) / 2) * rect.width;
      left = Math.min(left, sx);
      right = Math.max(right, sx);
    }
    dispatch({ type: "select", selected: { dancer, part: obj.name }, anchor: { left, right, clickX: e.nativeEvent.clientX, clickY: e.nativeEvent.clientY } });
  }, [unlight]);
  const closePart = useCallback(() => { unlight(); dispatch({ type: "closePart" }); }, [unlight]);

  // A new pairing or figure remounts every mesh, so the old highlight has nothing to undo. The
  // reducer clears the selection itself on `retarget`.
  useEffect(() => { lit.current = null; }, [loadedKey]);

  // ── Keyframes ────────────────────────────────────────────────────────────────────────────

  const setKeyframe = useCallback(() => {
    if (only && fig.locked.has(pid)) {
      dispatch({ type: "notify", text: "This couple is accepted and locked — unlock it in the drawer to change it" });
      return;
    }
    const at = playing ? clock.current : t;
    if (playing) dispatch({ type: "pause", at });
    const keyframe = keyframeToKeep(at, readings, set);
    append({ kind: "keyframe-set", figure: figure.id, scope: only ? { pairing: pid } : "all", keyframe });
    dispatch({ type: "kept", at: keyframe.t });
  }, [append, readings, set, figure.id, only, pid, playing, t, fig.locked]);
  const setOpenFrame = (at: number | null) => { dispatch({ type: "openFrame", at }); };

  const shown = timeline.find((f) => openFrame !== null && sameMoment(f.keyframe.t, openFrame)) ?? null;
  const generalAt = (at: number) => fig.general.some((k) => sameMoment(k.t, at));

  // A locked couple is read-only while it's the one being tuned.
  const frozen = only && fig.locked.has(pid);
  const lockedCount = fig.locked.size;
  const everyLabel = `every couple${lockedCount > 0 ? ` (not ${String(lockedCount)} locked)` : ""}`;
  const toggleLock = (id: string) => {
    append({ kind: fig.locked.has(id) ? "unlocked" : "locked", figure: figure.id, pairing: id });
  };

  // ── Save / load ──────────────────────────────────────────────────────────────────────────

  const fileRef = useRef<HTMLInputElement>(null);
  const save = () => {
    downloadText(`townage-pose-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(toBundle(events), null, 1));
  };
  const load = async (file: File) => {
    const got = fromBundle(await file.text());
    if ("error" in got) {
      dispatch({ type: "notify", text: `Didn't load ${file.name}: ${got.error}` });
      return;
    }
    const known = new Set(events.map((e) => e.id));
    const fresh = got.events.filter((e) => !known.has(e.id));
    await store.current?.append(fresh);
    setEvents((prev) => [...prev, ...fresh]);
    dispatch({ type: "notify", text: `Loaded ${file.name}: ${String(fresh.length)} new of ${String(got.events.length)} events — merged, nothing replaced` });
  };

  // ── Keys ─────────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: "spacing", by: e.key === "ArrowUp" ? SPACING.nudge : -SPACING.nudge });
        return;
      }
      if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        // Captured ahead of a focused slider, which would otherwise take the arrow too.
        e.preventDefault();
        e.stopPropagation();
        nudgeWidth(e.key === "ArrowUp" ? WIDTH_NUDGE : -WIDTH_NUDGE);
        return;
      }
      if (el?.tagName === "INPUT" || el?.tagName === "SELECT" || el?.tagName === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight" || e.key === ".") stepBy(1);
      else if (e.key === "ArrowLeft" || e.key === ",") stepBy(-1);
      else if (e.key === "k") setKeyframe();
      else if (e.key === "Escape") { unlight(); dispatch({ type: "escape" }); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [nudgeWidth, togglePlay, stepBy, setKeyframe, unlight]);

  // The figure's own named moments, as landmarks behind the keyframes. Several steps can share a
  // beat (the turn-under styles), so they are grouped by where they fall.
  const landmarks = useMemo(() => {
    const at = new Map<number, string[]>();
    for (const s of figure.steps) {
      const f = s.pose.kind === "stand" ? 0 : s.pose.beat / figure.beats;
      at.set(f, [...(at.get(f) ?? []), s.label]);
    }
    return [...at.entries()].sort((a, b) => a[0] - b[0]);
  }, [figure]);

  const dialRow = (dancer: number, part: PartId, a: Aspect) => {
    const k = dialKey(dancer, part, a.id);
    const v = valueOf(k);
    const isSet = set[k] !== undefined;
    if (a.readOnly === true) {
      return (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "128px 1fr 58px 20px", gap: 6, alignItems: "center", margin: "3px 0", color: "#777" }}>
          <span style={{ fontSize: 12 }}>{a.label}</span>
          <span style={{ fontSize: 11, fontStyle: "italic" }}>readout — follows the upper arm and forearm</span>
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{v === undefined ? "—" : `${signed(v)}${a.unit}`}</span>
          <span />
        </div>
      );
    }
    return (
      <label key={k} style={{ display: "grid", gridTemplateColumns: "128px 1fr 58px 20px", gap: 6, alignItems: "center", margin: "3px 0" }}>
        <span style={{ fontSize: 12, fontWeight: isSet ? 600 : 400 }}>{isSet ? "● " : ""}{a.label}</span>
        <input
          type="range" min={a.min} max={a.max} step={a.step} value={v ?? 0} disabled={v === undefined || playing || frozen}
          onChange={(e) => { setEdit(k, Number(e.target.value)); }}
        />
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, color: isSet ? "#000" : "#777" }}>
          {v === undefined ? "—" : `${signed(v)}${a.unit}`}
        </span>
        <button style={{ ...btn, padding: "0 4px" }} title="back to what the figure shows" disabled={!isSet || playing || frozen} onClick={() => { setEdit(k, null); }}>↺</button>
      </label>
    );
  };

  const describeKey = (k: DialKey) => {
    if (k === WIDTH_KEY) return { who: "couple", part: "", aspect: "width", unit: "cm" };
    const [d, part, aspect] = k.split(".") as [string, PartId, string];
    const spec = PARTS[part] as (typeof PARTS)[PartId] | undefined;
    const a = spec?.aspects.find((x) => x.id === aspect);
    return { who: nameOf(Number(d)), part: spec?.label ?? part, aspect: a?.label ?? aspect, unit: a?.unit ?? "" };
  };

  const widthValue = valueOf(WIDTH_KEY);
  const widthSet = set[WIDTH_KEY] !== undefined;
  const rightEdge = drawerOpen ? DRAWER_WIDTH : 0;

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily: "system-ui, sans-serif", background: "#f4f4f1" }}>
      {/* ── Pairing, save / load ────────────────────────────────────────────────── */}
      <div style={{ ...card, top: 10, left: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", maxWidth: `calc(100vw - ${String(rightEdge + 40)}px)` }}>
        <strong>review2</strong>
        <select value={figure.id} onChange={(e) => { go(pairing.beau, pairing.belle, { figureId: e.target.value }); }}>
          {REVIEW_FIGURES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <span>pairing</span>
        {/* All 25 in matrix order, as `#review` lists them — beau → belle. */}
        <select
          value={pid}
          onChange={(e) => {
            const p = reviewPairings().find((x) => pairingId(x) === e.target.value);
            if (p !== undefined) go(p.beau, p.belle);
          }}
        >
          {reviewPairings().map((p) => (
            <option key={pairingId(p)} value={pairingId(p)}>{FLAG_TEXT[reviewFlag(fig, pairingId(p))]}{pairName(p)}</option>
          ))}
        </select>
        <button style={btn} title="swap beau and belle" onClick={() => { go(pairing.belle, pairing.beau); }}>⇄</button>
        <span style={{ borderLeft: "1px solid #ddd", paddingLeft: 8 }} />
        <button style={btn} onClick={save} title="download every keyframe event as one file">💾 save</button>
        <button style={btn} onClick={() => fileRef.current?.click()} title="merge a saved file in — nothing already here is replaced">📂 load</button>
        <input
          ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f !== undefined) void load(f);
            e.target.value = "";
          }}
        />
        {persistent === false && (
          <span style={{ color: "#b03a2e", fontSize: 12, fontWeight: 600 }}>not being kept — this browser won&apos;t give us IndexedDB; save before closing</span>
        )}
        <Explain
          why={
            <>
              <b>Real:</b> the pairing, play / pause / step / scrub, clicking a part, every dial&apos;s
              reading, and the keyframes (kept in this browser, and saved / loaded as a file).
              <br />
              <b>Dials move the drawn pose</b> while paused: exactly what you dial, on top of the
              solver, with nothing keeping holds or shoulders right. Keyframes show on every couple
              at their moment, and <b>play: my keyframes</b> eases every couple through its own.
            </>
          }
        >
          🧪 prototype — dials move the drawn pose; keyframes play
        </Explain>
      </div>

      {/* ── Scene ───────────────────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: rightEdge, bottom: BOTTOM_HEIGHT }}>
        <Canvas shadows camera={{ position: [0, 3.2, 5.5], fov: 45 }}>
          <OrbitControls makeDefault target={ORBIT_TARGET} maxPolarAngle={Math.PI / 2} minDistance={1.5} maxDistance={40} />
          <FollowFocus to={focusAt} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[400, 400]} />
            <meshStandardMaterial color="#e8e8e4" />
          </mesh>
          <gridHelper args={[400, 400, "#b9b9b3", "#d6d6d0"]} />
          {/* The focus couple's spot. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[focusAt.x, 0.005, focusAt.z]}>
            <ringGeometry args={[1.05, 1.15, 48]} />
            <meshBasicMaterial color="#3355cc" />
          </mesh>
          {/* Every couple dances the same figure at the same moment, the focus couple in the
              middle of a filled disk of the other 24 (couple-disk.ts). Only the focus couple
              reports the clock and gets its dials read. */}
          <group onClick={onPick}>
            {reviewPairings().map((p) => {
              const id = pairingId(p);
              const coupleShapes = allShapes.get(id) ?? shapes;
              return (
                <CoupleSlot key={id} id={id} coord={layout[id] ?? [0, 0]} spacing={spacing} shown={allCouples || id === pid} turned={turned}>
                  <DanceFloor
                    key={`${id}|${figure.id}`}
                    call={figure.call}
                    {...(figure.sequence === undefined ? {} : { sequence: figure.sequence })}
                    paused={!playing}
                    seek={seek}
                    {...(id === pid ? { onBeat } : {})}
                    shapes={coupleShapes}
                    joinArc={handsOnArc}
                  />
                  <PoseOverride key={`${id}|${figure.id}`} id={id} shapes={coupleShapes} values={overrides.get(id)} track={tracks.get(id)} clock={clock} playing={playing} seekToken={session.seekToken} />
                </CoupleSlot>
              );
            })}
          </group>
          <RigReader focus={pid} shapes={shapes} onRead={onRead} />
        </Canvas>
      </div>

      {/* ── Body-part modal ─────────────────────────────────────────────────────── */}
      {selected !== null && (
        <div
          ref={modalRef}
          style={{
            ...card, width: MODAL_WIDTH, overflowY: "auto", boxSizing: "border-box",
            ...(placed === null
              ? { top: MODAL_TOP, right: 10 + rightEdge, maxHeight: `calc(100vh - ${String(BOTTOM_HEIGHT + 84)}px)` }
              : placed),
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{PARTS[selected.part].label}</div>
              <div style={{ color: "#555" }}>{nameOf(selected.dancer)} · at {pct(t)}</div>
            </div>
            <button style={btn} onClick={closePart} title="Esc">×</button>
          </div>
          {PARTS[selected.part].note !== undefined && (
            <div style={{ ...stub, margin: "4px 0" }}>
              {PARTS[selected.part].why === undefined
                ? PARTS[selected.part].note
                : <Explain why={PARTS[selected.part].why}>{PARTS[selected.part].note}</Explain>}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#777" }}>grey = what the figure shows · <b>●</b> = set at this moment{here !== undefined ? " (this keyframe)" : ""}{playing ? " · pause to dial" : ""}</div>
          <div style={{ margin: "8px 0" }}>
            {PARTS[selected.part].aspects.map((a) => dialRow(selected.dancer, selected.part, a))}
          </div>
          <div style={{ fontWeight: 600, marginTop: 10, borderTop: "1px solid #ddd", paddingTop: 6 }}>Linked</div>
          {PARTS[selected.part].linked.map((lp) => (
            <details key={lp} style={{ margin: "4px 0" }}>
              <summary style={{ cursor: "pointer" }}>
                {PARTS[lp].label}{" "}
                <button style={{ ...btn, padding: "0 5px", fontSize: 11 }} onClick={(e) => { e.preventDefault(); unlight(); dispatch({ type: "select", selected: { dancer: selected.dancer, part: lp } }); }}>
                  open
                </button>
              </summary>
              {PARTS[lp].aspects.map((a) => dialRow(selected.dancer, lp, a))}
            </details>
          ))}
          <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <button style={btn} onClick={setKeyframe} disabled={frozen}>◆ set keyframe at {pct(t)}</button>
            <span style={{ fontSize: 11, color: frozen ? "#2e7d4f" : only ? "#d4561e" : "#777" }}>{frozen ? "🔒 accepted — unlock in the drawer to change" : only ? `${pairName(pairing)} only` : everyLabel}</span>
          </div>
        </div>
      )}

      {/* ── Keyframe detail ─────────────────────────────────────────────────────── */}
      {shown !== null && (
        <div style={{ ...card, bottom: BOTTOM_HEIGHT + 10, left: 10, width: 460, maxHeight: "45vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              ◆ {pct(shown.keyframe.t)} <span style={{ color: "#666", fontWeight: 400 }}>· beat {(shown.keyframe.t * figure.beats).toFixed(2)}</span>
            </div>
            <button style={btn} onClick={() => { setOpenFrame(null); }}>×</button>
          </div>
          <div style={{ fontSize: 12, color: SOURCE_COLOR[shown.source] === "transparent" ? "#777" : SOURCE_COLOR[shown.source] }}>{SOURCE_LABEL[shown.source]}</div>
          {(() => {
            const set = shown.keyframe.setKeys;
            const rest = Object.keys(shown.keyframe.values).filter((k) => !set.includes(k));
            const row = (k: DialKey, bold: boolean) => {
              const d = describeKey(k);
              const v = shown.keyframe.values[k] ?? 0;
              return (
                <tr key={k} style={{ borderTop: "1px solid #eee", fontWeight: bold ? 600 : 400 }}>
                  <td>{d.who}</td><td>{d.part}</td><td>{d.aspect}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{signed(v)}{d.unit}</td>
                </tr>
              );
            };
            return (
              <>
                <div style={{ fontWeight: 600, marginTop: 6 }}>Set by you ({set.length})</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <tbody>
                    {set.map((k) => row(k, true))}
                    {set.length === 0 && <tr><td style={{ color: "#888" }}>Nothing — this keyframe holds the figure&apos;s own pose here.</td></tr>}
                  </tbody>
                </table>
                <label style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={everything} onChange={(e) => { dispatch({ type: "setEverything", on: e.target.checked }); }} />
                  everything else at this moment ({rest.length}, read off the figure)
                </label>
                {everything && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#555" }}>
                    <tbody>{rest.map((k) => row(k, false))}</tbody>
                  </table>
                )}
              </>
            );
          })()}
          <label style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 12, cursor: "pointer", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!isMuted(session, figure.id, pid, shown.keyframe.t)}
              onChange={(e) => { dispatch({ type: "mute", figure: figure.id, pairing: pid, t: shown.keyframe.t, on: !e.target.checked }); }}
            />
            active on {pairName(pairing)}
            <span style={{ color: "#999" }}>— troubleshooting only, not saved</span>
          </label>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <button style={btn} onClick={() => { seekTo(shown.keyframe.t); }}>go to</button>
            {!only && shown.source === "general" && (
              <button style={btn} onClick={() => { append({ kind: "keyframe-removed", figure: figure.id, scope: "all", t: shown.keyframe.t }); setOpenFrame(null); }}>delete for every couple</button>
            )}
            {only && !frozen && shown.source === "general" && (
              <button style={btn} onClick={() => { append({ kind: "keyframe-removed", figure: figure.id, scope: { pairing: pid }, t: shown.keyframe.t }); }}>hide for this couple</button>
            )}
            {!frozen && shown.source === "own" && generalAt(shown.keyframe.t) && (
              <button style={btn} onClick={() => { append({ kind: "override-cleared", figure: figure.id, pairing: pid, t: shown.keyframe.t }); }}>back to general&apos;s</button>
            )}
            {!frozen && shown.source === "own" && (
              <button style={btn} onClick={() => { append({ kind: "keyframe-removed", figure: figure.id, scope: { pairing: pid }, t: shown.keyframe.t }); if (!generalAt(shown.keyframe.t)) setOpenFrame(null); }}>delete</button>
            )}
            {!frozen && shown.source === "hidden" && (
              <button style={btn} onClick={() => { append({ kind: "override-cleared", figure: figure.id, pairing: pid, t: shown.keyframe.t }); }}>bring back</button>
            )}
          </div>
        </div>
      )}

      {/* ── Drawer: every pairing's timeline ────────────────────────────────────── */}
      <button
        onClick={() => { dispatch({ type: "toggleDrawer" }); }}
        title={drawerOpen ? "close the pairings drawer" : "open the pairings drawer"}
        style={{
          ...btn, position: "absolute", right: rightEdge, top: 120, zIndex: 3, padding: "10px 4px",
          writingMode: "vertical-rl", borderRadius: "6px 0 0 6px", border: "1px solid #ccc", background: "#fff",
        }}
      >
        {drawerOpen ? "▸ pairings" : "◂ pairings"}
      </button>
      {drawerOpen && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: BOTTOM_HEIGHT, width: DRAWER_WIDTH, background: "#fff", borderLeft: "1px solid #ccc", display: "flex", flexDirection: "column", zIndex: 2, boxSizing: "border-box" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: only ? "#d4561e" : "#333" }}>
              {only ? `changes go to ${pairName(pairing)} only` : `changes go to every couple${lockedCount > 0 ? ` except ${String(lockedCount)} locked` : ""}`}
            </div>
            <div style={{ fontSize: 11, color: "#777", marginTop: 6 }}>{figure.label} · every couple</div>
            <MiniTimeline frames={fig.general.map((keyframe) => ({ keyframe, source: "general" as const }))} />
            <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
              click a pairing to tune it alone · click it again to go back to every couple
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: "1 1 auto" }}>
            {reviewPairings().map((p) => {
              const id = pairingId(p);
              const hi = only && id === pid;
              const loaded = id === pid;
              return (
                <div
                  key={id}
                  onClick={() => { if (hi) go(p.beau, p.belle, { only: false }); else go(p.beau, p.belle, { only: true }); }}
                  style={{
                    padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f0f0ec",
                    background: hi ? "#fff1e6" : fig.locked.has(id) ? "#eef7f1" : reviewFlag(fig, id) !== "none" ? "#fff8f2" : "transparent",
                    borderLeft: hi ? "4px solid #d4561e" : loaded ? "4px solid #ccc" : "4px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: loaded ? 600 : 400 }}>{pairName(p)}</span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {FLAG[reviewFlag(fig, id)]}
                      {lockedBehind(fig, id) && <span style={{ color: "#777", fontSize: 11 }} title="every couple's timeline has changed since this was accepted">· every couple's changed since</span>}
                      <button
                        style={{ ...btn, padding: "0 6px", fontSize: 11 }}
                        title={fig.locked.has(id) ? "unlock: back to the live timeline" : "accept this couple's timeline as it is, and lock it against changes to every couple"}
                        onClick={(e) => { e.stopPropagation(); toggleLock(id); }}
                      >
                        {fig.locked.has(id) ? "🔓 unlock" : "🔒 accept"}
                      </button>
                    </span>
                  </div>
                  <MiniTimeline frames={pairingTimeline(fig, id)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transport + timeline ────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BOTTOM_HEIGHT, background: "#fff", borderTop: "1px solid #ccc", padding: "8px 14px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={btn} onClick={() => { stepBy(-1); }} title="← or ,">◀ 1/10</button>
          <button style={{ ...btn, minWidth: 64 }} onClick={togglePlay} title="Space">{playing ? "⏸ pause" : "▶ play"}</button>
          <button style={btn} onClick={() => { stepBy(1); }} title="→ or .">1/10 ▶</button>
          <input
            ref={scrubRef}
            type="range" min={0} max={1} step={0.001}
            value={t}
            onChange={(e) => { seekTo(Number(e.target.value)); }}
            style={{ flex: "1 1 200px" }}
          />
          <span ref={readRef} style={{ fontVariantNumeric: "tabular-nums", minWidth: 150, fontSize: 12 }}>{pct(t)}</span>
          <span style={{ borderLeft: "1px solid #ddd", paddingLeft: 8, fontWeight: widthSet ? 600 : 400 }}>{widthSet ? "● " : ""}couple width</span>
          <input
            type="range" min={0} max={300} step={1} value={widthValue ?? 0} disabled={widthValue === undefined || playing || frozen}
            onChange={(e) => { setEdit(WIDTH_KEY, Number(e.target.value)); }} title="Shift+↑ / Shift+↓ — 2 cm"
          />
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, minWidth: 54, color: widthSet ? "#000" : "#777" }}>
            {widthValue === undefined ? "—" : `${String(Math.round(widthValue))} cm`}
          </span>
          <button style={{ ...btn, padding: "0 4px" }} disabled={!widthSet} onClick={() => { setEdit(WIDTH_KEY, null); }} title="back to what the figure shows">↺</button>
          <span style={{ borderLeft: "1px solid #ddd", paddingLeft: 8 }}>couple spacing</span>
          <input
            type="range" min={SPACING.min} max={SPACING.max} step={SPACING.nudge} value={spacing}
            onChange={(e) => { dispatch({ type: "spacing", by: Number(e.target.value) - spacing }); }} title="Ctrl+↑ / Ctrl+↓"
          />
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12, minWidth: 40 }}>{spacing.toFixed(2)} m</span>
          <button style={btn} onClick={setKeyframe} title="k" disabled={frozen}>◆ set keyframe</button>
          <select value={mode} onChange={(e) => { dispatch({ type: "setMode", mode: e.target.value as "solver" | "keyframes" }); }} title="what play shows">
            <option value="solver">play: the move as solved</option>
            <option value="keyframes">play: my keyframes</option>
          </select>
          {mode === "keyframes" && (
            <Explain
              why={
                <>
                  Every couple plays its <b>own</b> timeline: its own keyframes over everyone&apos;s, or
                  its locked copy, less what it hides and what&apos;s switched off for it. Between two
                  keyframes each value eases in and out (angles the short way round). Over the tenth
                  of the move before a couple&apos;s first keyframe it blends in from the solver, and
                  over the tenth after its last it blends back out; further out the solver plays.
                  It moves the picture only: nothing keeps holds or shoulders right in between.
                </>
              }
            >
              ▶ keyframes — eased, blended with the solver at the edges
            </Explain>
          )}
          <label style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={handsOnArc} onChange={(e) => { dispatch({ type: "handsOnArc", on: e.target.checked }); }} />
            <Explain
              why={
                <>
                  The joined hands travel one arc in one upright plane through the centre of the
                  exchange: low and a little in front of the couple, up over the centre as she
                  passes under, down a little in front of their new facing. How far along it they
                  are is how far she has turned. The bodies walk their own paths; the arms reach
                  for wherever the hands are. Off is the solver&apos;s own arch. A break (hands
                  apart) isn&apos;t touched.
                </>
              }
            >
              🧪 hands on the arc
            </Explain>
          </label>
          <label style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={allCouples} onChange={(e) => { dispatch({ type: "allCouples", on: e.target.checked }); }} />
            <Explain
              why={
                <>
                  On, all 25 couples dance round the focus couple. Off, only the focus couple is
                  drawn. The others keep dancing out of sight, so they come back in step, and
                  clicks go through them to the focus couple.
                </>
              }
            >
              all couples
            </Explain>
          </label>
          <label style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={turnAround} onChange={(e) => { dispatch({ type: "turnAround", on: e.target.checked }); }} />
            <Explain
              why={
                <>
                  A turn-under ends with the couple turned half way round. On, each loop starts
                  where the last one ended, so playing shows the move from the front, then from the
                  back, then the front again. Off, every loop starts as the first did.
                </>
              }
            >
              🧪 turn around each loop{turned ? " (turned)" : ""}
            </Explain>
          </label>
          {notice !== null && <span style={{ fontSize: 12, color: "#a35d00" }}>{notice.text}</span>}
        </div>

        {/* The move, 0–100%: named steps behind, keyframes on top, the playhead over both. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 6px 0" }}>
          <span style={{ fontSize: 11, width: 120, color: only ? "#d4561e" : "#777", fontWeight: only ? 600 : 400 }}>
            {frozen ? `🔒 ${pairName(pairing)} — accepted` : only ? `${pairName(pairing)} only` : everyLabel}
          </span>
          <div
            style={{ position: "relative", height: 46, flex: "1 1 auto", background: only ? "#fff6ee" : "#f3f3ef", borderRadius: 4, cursor: "pointer", border: only ? "1px solid #f0c9a8" : "1px solid transparent" }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo((e.clientX - r.left) / r.width);
            }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} style={{ position: "absolute", left: pct(i / 10), top: 0, bottom: 0, borderLeft: "1px dotted #ccc" }} />
            ))}
            {/* Playing my keyframes: where this couple's keyframes are in charge, not the solver. */}
            {(() => {
              const tr = tracks.get(pid);
              const lo = tr?.[0]?.t;
              const hi = tr?.[tr.length - 1]?.t;
              if (lo === undefined || hi === undefined) return null;
              const inFrom = Math.max(0, lo - EDGE_BLEND);
              const outTo = Math.min(1, hi + EDGE_BLEND);
              const band = (from: number, to: number, background: string, title: string) => (
                <div title={title} style={{ position: "absolute", left: pct(from), width: `${((to - from) * 100).toFixed(2)}%`, bottom: 0, height: 4, background, opacity: 0.6, minWidth: 2 }} />
              );
              return (
                <>
                  {band(inFrom, lo, "linear-gradient(to right, transparent, #cc8a22)", "blending in from the solver")}
                  {band(lo, hi, "#cc8a22", "keyframes play here")}
                  {band(hi, outTo, "linear-gradient(to right, #cc8a22, transparent)", "blending back out to the solver")}
                </>
              );
            })()}
            {landmarks.map(([f, names]) => (
              <div key={f} title={names.join("\n")} style={{ position: "absolute", left: pct(f), top: 0, transform: "translateX(-50%)", fontSize: 10, color: "#888", whiteSpace: "nowrap" }}>
                <div style={{ width: 1, height: 10, background: "#aaa", margin: "0 auto" }} />
                {names.length > 1 ? `${names[0] ?? ""} +${String(names.length - 1)}` : names[0]}
              </div>
            ))}
            {timeline.map((f) => (
              <div
                key={f.keyframe.t}
                title={`${pct(f.keyframe.t)} — ${SOURCE_LABEL[f.source]}`}
                onClick={(e) => { e.stopPropagation(); setOpenFrame(f.keyframe.t); }}
                style={{
                  position: "absolute", left: pct(f.keyframe.t), bottom: 6, width: 14, height: 14,
                  transform: "translateX(-50%) rotate(45deg)",
                  background: SOURCE_COLOR[f.source],
                  border: shown?.keyframe.t === f.keyframe.t ? "2px solid #3355cc" : `1px solid ${f.source === "hidden" ? "#999" : "#333"}`,
                }}
              />
            ))}
            <div ref={headRef} style={{ position: "absolute", left: pct(t), top: -4, bottom: -4, width: 2, background: "#cc4433", pointerEvents: "none" }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
          click a body part · <b>Space</b> play/pause · <b>←/→</b> step 1/10 · <b>Shift+↑/↓</b> couple width · <b>Ctrl+↑/↓</b> couple spacing · click another couple to focus it · <b>k</b> keyframe · <b>Esc</b> close · drag to orbit
        </div>
      </div>
    </div>
  );
}
