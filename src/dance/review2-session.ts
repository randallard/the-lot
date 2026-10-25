/**
 * `#review2`'s session state: one pure reducer (the-lot ADR-0065).
 *
 * Owns the **managed position** that isn't in the URL (the moment `t`, what's selected, what's
 * open) and the dial edits made at a moment. Every transition is a named action here, tested
 * without a browser.
 *
 * Not owned here, by design:
 * - **Facts**: the keyframe events (`pose-events.ts`), owned by the store.
 * - **Where you are by pairing** (figure, pairing, `/only`): owned by the URL. The reducer only
 *   hears it change, through `retarget`.
 * - **The floor's clock while playing.** The floor owns that. It's read into `t` at defined
 *   moments (pause, step, loop) and never mirrored continuously.
 * - **Derived values**: the timeline, the keyframe under the playhead, what a dial shows. They
 *   are computed from this state plus the facts, by the functions at the bottom.
 *
 * 🔑 **Edits remember their moment and their scope.** That's what lets "which keyframe am I on"
 * and "do these edits apply" be derived by comparing, instead of being set by whoever happened to
 * move the playhead. It's also why reloading on a keyframe now shows it: the keyframes arrive
 * later, and the comparison simply starts matching.
 */

import type { DialKey, Keyframe } from "./pose-events";
import type { PartId } from "./pose-dials";
import { initialLayout, refocus, type Layout } from "./couple-disk";

export interface Selected {
  readonly dancer: number;
  readonly part: PartId;
}

/** Where the couple stood on screen when a part was clicked, and where the click was. */
export interface Anchor {
  readonly left: number;
  readonly right: number;
  readonly clickX: number;
  readonly clickY: number;
}

/**
 * Dial changes not yet kept in a keyframe. `null` means "back to what the figure shows", which is
 * how a value a keyframe kept gets un-set.
 */
export interface Edits {
  readonly at: number;
  readonly scope: string;
  readonly values: Readonly<Record<DialKey, number | null>>;
}

export interface Session {
  /** The moment, 0–1. While playing this is where play started; the floor's clock is ahead of it. */
  readonly t: number;
  readonly playing: boolean;
  /** Bumped whenever the floor must be told to stand at `t`. */
  readonly seekToken: number;
  /** `figure/beau-belle[/only]` — whose timeline edits belong to. Set by `retarget` from the URL. */
  readonly scope: string;
  /** `figure|beau-belle` — what's on the floor. A change remounts every mesh. */
  readonly loaded: string;
  readonly edits: Edits | null;
  readonly selected: Selected | null;
  readonly anchor: Anchor | null;
  readonly drawerOpen: boolean;
  readonly openFrame: number | null;
  readonly everything: boolean;
  readonly mode: "solver" | "keyframes";
  /**
   * 🧪 The joined hands travel one arc in one upright plane (`DanceFloor`'s `joinArc`, 10-19).
   * On by default here; off is the solver's own arch.
   */
  readonly handsOnArc: boolean;
  /**
   * Every couple on the floor, or only the focus couple. The others stay mounted and keep
   * dancing while hidden, so they come back in step.
   */
  readonly allCouples: boolean;
  /**
   * 🧪 Each loop starts where the last one ended (2026-10-24). A turn-under ends with the couple
   * turned half way round, so the next loop is drawn turned by π: front, then back, then front.
   * Ryan: *"have the dancers remain facing the way they are when the move ends … so we can
   * watch first from the front and then from the back."*
   */
  readonly turnAround: boolean;
  /** Whether this loop is the turned one. Flipped by `wrapped` while `turnAround` is on. */
  readonly turned: boolean;
  /** Where each couple stands, in spacing units; the focus couple is the disk's centre. */
  readonly layout: Layout;
  /** Every couple on the floor, in matrix order — what `layout` places. */
  readonly couples: readonly string[];
  /** Metres between neighbouring couples. */
  readonly spacing: number;
  /**
   * Keyframes switched off for one couple while troubleshooting, as `figure|pairing|t`. Session
   * only and never saved: it's for seeing what a couple does without one keyframe, not a decision
   * about its timeline (that's "hide for this couple").
   */
  readonly muted: Readonly<Record<string, true>>;
  /** A one-line message, with a counter so the same text twice still restarts its timer. */
  readonly notice: { readonly text: string; readonly n: number } | null;
}

export type Action =
  /** The URL changed. `focus` is the pairing on screen, which the disk re-forms around. */
  | { readonly type: "retarget"; readonly scope: string; readonly loaded: string; readonly focus: string }
  | { readonly type: "spacing"; readonly by: number }
  | { readonly type: "mute"; readonly figure: string; readonly pairing: string; readonly t: number; readonly on: boolean }
  /** Tell every floor to stand at `t` again: the solver's pose, before any dial values go back on. */
  | { readonly type: "repose" }
  | { readonly type: "seek"; readonly to: number }
  | { readonly type: "step"; readonly dir: 1 | -1; readonly from: number }
  | { readonly type: "play" }
  | { readonly type: "pause"; readonly at: number }
  | { readonly type: "loop" }
  /** The playing floor came round to the start again (it wraps by itself). */
  | { readonly type: "wrapped" }
  | { readonly type: "edit"; readonly key: DialKey; readonly value: number | null }
  | { readonly type: "nudge"; readonly key: DialKey; readonly by: number; readonly base: number; readonly min: number; readonly max: number }
  | { readonly type: "kept"; readonly at: number }
  | { readonly type: "select"; readonly selected: Selected; readonly anchor?: Anchor }
  | { readonly type: "closePart" }
  | { readonly type: "openFrame"; readonly at: number | null }
  | { readonly type: "toggleDrawer" }
  | { readonly type: "setEverything"; readonly on: boolean }
  | { readonly type: "setMode"; readonly mode: "solver" | "keyframes" }
  | { readonly type: "handsOnArc"; readonly on: boolean }
  | { readonly type: "allCouples"; readonly on: boolean }
  | { readonly type: "turnAround"; readonly on: boolean }
  | { readonly type: "notify"; readonly text: string }
  | { readonly type: "dismissNotice"; readonly n: number }
  | { readonly type: "escape" };

export const SAME_T = 0.0005;
export const SPACING = { min: 1.5, max: 8, initial: 3, nudge: 0.25 } as const;
const STEP = 0.1;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const sameMoment = (a: number, b: number) => Math.abs(a - b) < SAME_T;

export function initialSession(scope: string, loaded: string, couples: readonly string[] = [], focus = ""): Session {
  return {
    t: 0, playing: false, seekToken: 0, scope, loaded,
    edits: null, selected: null, anchor: null, drawerOpen: false,
    openFrame: null, everything: false, mode: "solver", handsOnArc: true, allCouples: true, turnAround: true, turned: false, notice: null,
    couples, layout: couples.length === 0 ? {} : initialLayout(couples, focus), spacing: SPACING.initial,
    muted: {},
  };
}

function notify(s: Session, text: string): Session["notice"] {
  return { text, n: (s.notice?.n ?? 0) + 1 };
}

/** Leaving the moment (or the timeline) the edits belong to drops them, and says so. */
function leave(s: Session, at: number, scope: string): Pick<Session, "edits" | "notice"> {
  const e = s.edits;
  if (e === null || (sameMoment(e.at, at) && e.scope === scope)) return { edits: e, notice: s.notice };
  const n = Object.keys(e.values).length;
  if (n === 0) return { edits: null, notice: s.notice };
  return { edits: null, notice: notify(s, `${String(n)} dial change${n === 1 ? "" : "s"} not kept — set a keyframe to keep them`) };
}

function withEdit(s: Session, key: DialKey, value: number | null): Edits {
  const mine = s.edits !== null && sameMoment(s.edits.at, s.t) && s.edits.scope === s.scope ? s.edits.values : {};
  return { at: s.t, scope: s.scope, values: { ...mine, [key]: value } };
}

export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case "retarget": {
      const moved = a.loaded !== s.loaded;
      return {
        ...s, ...leave(s, s.t, a.scope), scope: a.scope, loaded: a.loaded,
        // A new pairing or figure is new meshes: nothing is selected on them yet.
        ...(moved ? { selected: null, anchor: null } : {}),
        openFrame: a.scope === s.scope ? s.openFrame : null,
        layout: s.couples.length === 0 ? s.layout : refocus(s.layout, s.couples, a.focus),
      };
    }
    case "mute": {
      const k = muteKey(a.figure, a.pairing, a.t);
      const muted = { ...s.muted };
      if (a.on) muted[k] = true;
      else Reflect.deleteProperty(muted, k);
      return { ...s, muted, seekToken: s.seekToken + 1 };
    }
    case "repose":
      return { ...s, seekToken: s.seekToken + 1 };
    case "spacing": {
      const to = Math.round((s.spacing + a.by) * 100) / 100;
      return { ...s, spacing: Math.min(SPACING.max, Math.max(SPACING.min, to)) };
    }
    case "seek": {
      const to = clamp01(a.to);
      return { ...s, ...leave(s, to, s.scope), t: to, playing: false, seekToken: s.seekToken + 1 };
    }
    case "step": {
      // Snap to the tenths grid, so a keyframe set after stepping lands on a moment you can find again.
      const at = a.from * 10;
      const next = a.dir === 1 ? Math.floor(at + 1e-6) + 1 : Math.ceil(at - 1e-6) - 1;
      return reduce(s, { type: "seek", to: Math.round(next) * STEP });
    }
    case "play":
      if (s.playing) return s;
      return { ...s, ...leave(s, Number.NaN, s.scope), playing: true };
    case "pause":
      // The floor is already standing at `at`, so no seek.
      return s.playing ? { ...s, playing: false, t: clamp01(a.at) } : s;
    case "loop":
      return { ...s, t: 0, seekToken: s.seekToken + 1 };
    case "wrapped":
      return s.turnAround ? { ...s, turned: !s.turned } : s;
    case "edit":
      return { ...s, edits: withEdit(s, a.key, a.value) };
    case "nudge": {
      const cur = s.edits !== null && sameMoment(s.edits.at, s.t) && s.edits.scope === s.scope ? s.edits.values[a.key] : undefined;
      const from = cur ?? a.base;
      return { ...s, edits: withEdit(s, a.key, Math.min(a.max, Math.max(a.min, from + a.by))) };
    }
    case "kept":
      return { ...s, edits: null, openFrame: a.at };
    case "select":
      return { ...s, selected: a.selected, anchor: a.anchor ?? s.anchor };
    case "closePart":
      return { ...s, selected: null };
    case "openFrame":
      return { ...s, openFrame: a.at };
    case "toggleDrawer":
      return { ...s, drawerOpen: !s.drawerOpen };
    case "setEverything":
      return { ...s, everything: a.on };
    case "setMode":
      return { ...s, mode: a.mode };
    // A paused floor writes nothing, so the floors are asked to pose again.
    case "handsOnArc":
      return { ...s, handsOnArc: a.on, seekToken: s.seekToken + 1 };
    case "allCouples":
      return { ...s, allCouples: a.on };
    case "turnAround":
      return { ...s, turnAround: a.on, turned: a.on && s.turned };
    case "notify":
      return { ...s, notice: notify(s, a.text) };
    case "dismissNotice":
      return s.notice?.n === a.n ? { ...s, notice: null } : s;
    case "escape":
      return { ...s, selected: null, openFrame: null };
  }
}

export const muteKey = (figure: string, pairing: string, t: number) => `${figure}|${pairing}|${String(Math.round(t * 1000))}`;
export const isMuted = (s: Session, figure: string, pairing: string, t: number) => s.muted[muteKey(figure, pairing, t)] === true;

// ── Derived: what the screen shows, from the session plus the facts ───────────────────────────

/** The keyframe the playhead is on, if any — the comparison that used to be a side effect. */
export function keyframeHere<T extends { readonly keyframe: Keyframe; readonly source: string }>(
  s: Session,
  timeline: readonly T[],
): T | undefined {
  if (s.playing) return undefined;
  return timeline.find((f) => f.source !== "hidden" && sameMoment(f.keyframe.t, s.t));
}

/** The edits that apply here and now: only at their own moment, on their own timeline, paused. */
export function editsHere(s: Session): Readonly<Record<DialKey, number | null>> {
  const e = s.edits;
  return e !== null && !s.playing && sameMoment(e.at, s.t) && e.scope === s.scope ? e.values : {};
}

/**
 * What's set at this moment, as you'd keep it: the keyframe's set values with your edits over
 * them. A `null` edit un-sets a kept value.
 */
export function setHere(kept: Keyframe | undefined, edits: Readonly<Record<DialKey, number | null>>): Record<DialKey, number> {
  const out: Record<DialKey, number> = {};
  if (kept !== undefined) for (const k of kept.setKeys) {
    const v = kept.values[k];
    if (v !== undefined) out[k] = v;
  }
  for (const [k, v] of Object.entries(edits)) {
    if (v === null) Reflect.deleteProperty(out, k);
    else out[k] = v;
  }
  return out;
}

/** The keyframe "set keyframe" would write: every reading, with what's set over it. */
export function keyframeToKeep(at: number, readings: Readonly<Record<DialKey, number>>, set: Readonly<Record<DialKey, number>>): Keyframe {
  return { t: Math.round(at * 1000) / 1000, values: { ...readings, ...set }, setKeys: Object.keys(set) };
}
