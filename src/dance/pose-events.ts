/**
 * 🧪 The posing screen's keyframes, as an append-only event log. (2026-10-18, `#review2`)
 *
 * Modelled on branching-video's store (its ADR-0007/0008, the template's storage default): every
 * change is an immutable event, a pure reducer folds the event **set** into timelines, and loading
 * a saved bundle is a union by event id. Two machines' keyframes merge rather than one overwriting
 * the other, and every edit stays in the log as an example for carry-over.
 *
 * ## Layered timelines
 *
 * Per figure:
 *
 * - **general**: every couple's timeline. With no couple highlighted, an edit lands here
 *   **straight away** (scope `all`) and reaches every couple that isn't locked (Ryan, 2026-10-18:
 *   *"should apply to all (except locked) if no couple is highlighted"*).
 * - **per pairing**: overrides on top of general. A pairing's own keyframe at a time replaces
 *   general's there, and a pairing can hide one of general's keyframes. Clearing an override
 *   brings general's back.
 *
 * A pairing with any override is flagged for review. It is flagged **stale** when general changed
 * after its newest override, because its tuning was made against a general timeline that has
 * since moved.
 *
 * (`draft` and `applied` are the first model from earlier the same day: a draft committed by an
 * "apply to all" button. They're still folded so logs written then still read, but nothing writes
 * them now.)
 *
 * **Accepted and locked** (Ryan, 2026-10-18): a pairing can be locked at its timeline as it stands.
 * The lock freezes a copy, so later edits to every couple pass it by and edits to it are refused
 * until it's unlocked. Unlocking goes back to the live general timeline plus its own keyframes,
 * which may have moved on in the meantime. That's what `lockedBehind` reports.
 *
 * Exploratory and unrecorded in an ADR on purpose: the model is being played with.
 */

import { isRecord } from "../services/json-guards";

/** `<dancer>.<part>.<aspect>`, e.g. `1.hand-left.bend` — the key every dial value is stored under. */
export type DialKey = string;

export interface Keyframe {
  /** Fraction of the move, 0–1, rounded to 1/1000. */
  readonly t: number;
  /** Every value the dancers had at this moment, user-set or read off the rig. */
  readonly values: Readonly<Record<DialKey, number>>;
  /** Which of `values` the user set; the rest were what the figure showed. */
  readonly setKeys: readonly DialKey[];
}

/** `all` (general, every unlocked couple), one pairing's overrides (`beau-belle`), or the retired `draft`. */
export type Scope = "all" | "draft" | { readonly pairing: string };

interface EventBase {
  readonly id: string;
  readonly at: string;
  readonly v: 1;
}

export type PoseEventBody =
  | { readonly kind: "keyframe-set"; readonly figure: string; readonly scope: Scope; readonly keyframe: Keyframe }
  /** In `all` or the draft: deletes. On a pairing: deletes its own, or hides general's at that time. */
  | { readonly kind: "keyframe-removed"; readonly figure: string; readonly scope: Scope; readonly t: number }
  /** A pairing goes back to general at this time — its own keyframe or its hiding of general's, gone. */
  | { readonly kind: "override-cleared"; readonly figure: string; readonly pairing: string; readonly t: number }
  /** Retired: "apply to all" from the draft model. General becomes a copy of the draft. */
  | { readonly kind: "applied"; readonly figure: string }
  /** Accept a pairing at its timeline as it stands now, and keep it there. */
  | { readonly kind: "locked"; readonly figure: string; readonly pairing: string }
  | { readonly kind: "unlocked"; readonly figure: string; readonly pairing: string };

export type PoseEvent = EventBase & PoseEventBody;

export function makeEvent(body: PoseEventBody, now: Date = new Date(), id: string = crypto.randomUUID()): PoseEvent {
  return { id, at: now.toISOString(), v: 1, ...body };
}

export function isPoseEvent(x: unknown): x is PoseEvent {
  if (!isRecord(x)) return false;
  const e = x;
  return typeof e["id"] === "string" && typeof e["at"] === "string" && e["v"] === 1 && typeof e["kind"] === "string";
}

function compare(a: PoseEvent, b: PoseEvent): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const tKey = (t: number) => Math.round(t * 1000);

/** A pairing's own entry at a time: its keyframe, or `null` for "general's is hidden here". */
type Override = Keyframe | null;

export interface FigureTimelines {
  readonly draft: readonly Keyframe[];
  readonly general: readonly Keyframe[];
  /** When general last changed, by an `all` edit or (retired) an apply. */
  readonly generalChangedAt: string | null;
  readonly overrides: ReadonlyMap<string, { readonly at: ReadonlyMap<number, Override>; readonly lastAt: string }>;
  /** Accepted pairings, and the timeline each was locked at. */
  readonly locked: ReadonlyMap<string, { readonly at: string; readonly timeline: readonly PlacedKeyframe[] }>;
}

export type PoseState = ReadonlyMap<string, FigureTimelines>;

interface Mutable {
  draft: Map<number, Keyframe>;
  general: Map<number, Keyframe>;
  generalChangedAt: string | null;
  overrides: Map<string, { at: Map<number, Override>; lastAt: string }>;
  locked: Map<string, { at: string; timeline: readonly PlacedKeyframe[] }>;
}

const sorted = (m: ReadonlyMap<number, Keyframe>) => [...m.values()].sort((a, b) => a.t - b.t);

/** Fold the event set into timelines. A function of the set: any order, any duplicates, same answer. */
export function reduce(events: readonly PoseEvent[]): PoseState {
  const unique = [...new Map(events.map((e) => [e.id, e])).values()].sort(compare);
  const figures = new Map<string, Mutable>();
  const fig = (id: string): Mutable => {
    let f = figures.get(id);
    if (f === undefined) {
      f = { draft: new Map(), general: new Map(), generalChangedAt: null, overrides: new Map(), locked: new Map() };
      figures.set(id, f);
    }
    return f;
  };
  const pair = (f: Mutable, p: string, at: string) => {
    let o = f.overrides.get(p);
    if (o === undefined) {
      o = { at: new Map(), lastAt: at };
      f.overrides.set(p, o);
    }
    o.lastAt = at;
    return o;
  };

  // A locked pairing's own keyframes can't change; an edit that reaches the log anyway (another
  // device, an old bundle) is skipped rather than quietly changing what was accepted.
  const isLocked = (f: Mutable, scope: Extract<Scope, object> | string) =>
    typeof scope === "object" ? f.locked.has(scope.pairing) : scope !== "draft" && scope !== "all" && f.locked.has(scope);

  for (const e of unique) {
    switch (e.kind) {
      case "keyframe-set": {
        const f = fig(e.figure);
        if (isLocked(f, e.scope)) break;
        if (e.scope === "all") {
          f.general.set(tKey(e.keyframe.t), e.keyframe);
          f.generalChangedAt = e.at;
        } else if (e.scope === "draft") f.draft.set(tKey(e.keyframe.t), e.keyframe);
        else pair(f, e.scope.pairing, e.at).at.set(tKey(e.keyframe.t), e.keyframe);
        break;
      }
      case "keyframe-removed": {
        const f = fig(e.figure);
        if (isLocked(f, e.scope)) break;
        if (e.scope === "all") {
          f.general.delete(tKey(e.t));
          f.generalChangedAt = e.at;
        } else if (e.scope === "draft") f.draft.delete(tKey(e.t));
        else {
          const o = pair(f, e.scope.pairing, e.at);
          // Its own keyframe goes; if general has one here, hide that too.
          if (f.general.has(tKey(e.t))) o.at.set(tKey(e.t), null);
          else o.at.delete(tKey(e.t));
        }
        break;
      }
      case "override-cleared": {
        if (isLocked(fig(e.figure), e.pairing)) break;
        const o = fig(e.figure).overrides.get(e.pairing);
        if (o !== undefined) {
          o.at.delete(tKey(e.t));
          o.lastAt = e.at;
        }
        break;
      }
      case "applied": {
        const f = fig(e.figure);
        f.general = new Map(f.draft);
        f.generalChangedAt = e.at;
        break;
      }
      case "locked": {
        const f = fig(e.figure);
        if (!f.locked.has(e.pairing)) f.locked.set(e.pairing, { at: e.at, timeline: livePairingTimeline(sorted(f.general), f.overrides.get(e.pairing)?.at) });
        break;
      }
      case "unlocked":
        fig(e.figure).locked.delete(e.pairing);
        break;
      default:
        // An unknown kind is from a newer build; skipped, never an error.
        break;
    }
  }

  const out = new Map<string, FigureTimelines>();
  for (const [id, f] of figures) {
    const overrides = new Map<string, { at: ReadonlyMap<number, Override>; lastAt: string }>();
    for (const [p, o] of f.overrides) if (o.at.size > 0) overrides.set(p, o);
    out.set(id, { draft: sorted(f.draft), general: sorted(f.general), generalChangedAt: f.generalChangedAt, overrides, locked: new Map(f.locked) });
  }
  return out;
}

const EMPTY: FigureTimelines = { draft: [], general: [], generalChangedAt: null, overrides: new Map(), locked: new Map() };
export const timelinesOf = (s: PoseState, figure: string): FigureTimelines => s.get(figure) ?? EMPTY;

/** Where a keyframe on a pairing's timeline came from. */
export type Source = "general" | "own" | "hidden";

export interface PlacedKeyframe {
  readonly keyframe: Keyframe;
  readonly source: Source;
}

/**
 * A pairing's timeline: general, with its own keyframes over it and the ones it hides marked
 * `hidden` (still shown, so a hidden keyframe can be brought back).
 */
export function pairingTimeline(f: FigureTimelines, pairing: string): readonly PlacedKeyframe[] {
  return f.locked.get(pairing)?.timeline ?? livePairingTimeline(f.general, f.overrides.get(pairing)?.at);
}

function livePairingTimeline(general: readonly Keyframe[], ownAt: ReadonlyMap<number, Override> | undefined): readonly PlacedKeyframe[] {
  const own = ownAt ?? new Map<number, Override>();
  const out = new Map<number, PlacedKeyframe>();
  for (const k of general) out.set(tKey(k.t), { keyframe: k, source: "general" });
  for (const [t, o] of own) {
    const g = out.get(t);
    if (o === null) {
      if (g !== undefined) out.set(t, { keyframe: g.keyframe, source: "hidden" });
    } else out.set(t, { keyframe: o, source: "own" });
  }
  return [...out.values()].sort((a, b) => a.keyframe.t - b.keyframe.t);
}

export type ReviewFlag = "none" | "custom" | "stale" | "locked";

/**
 * `locked` if accepted; otherwise `custom` if the pairing has its own keyframes, and `stale` if
 * general changed after it last did.
 */
export function reviewFlag(f: FigureTimelines, pairing: string): ReviewFlag {
  if (f.locked.has(pairing)) return "locked";
  const o = f.overrides.get(pairing);
  if (o === undefined) return "none";
  return f.generalChangedAt !== null && f.generalChangedAt > o.lastAt ? "stale" : "custom";
}

/** A locked pairing whose general timeline has changed since it was locked. */
export function lockedBehind(f: FigureTimelines, pairing: string): boolean {
  const l = f.locked.get(pairing);
  return l !== undefined && f.generalChangedAt !== null && f.generalChangedAt > l.at;
}

// ── The bundle: what Save writes and Load reads ───────────────────────────────────────────────

export const BUNDLE_FORMAT = "townage-pose-events";

export interface PoseBundle {
  readonly format: typeof BUNDLE_FORMAT;
  readonly bundleVersion: 1;
  readonly exportedAt: string;
  readonly events: readonly PoseEvent[];
}

export function toBundle(events: readonly PoseEvent[], now: Date = new Date()): PoseBundle {
  return { format: BUNDLE_FORMAT, bundleVersion: 1, exportedAt: now.toISOString(), events };
}

/** The events in a saved bundle, or an error saying why it isn't one. */
export function fromBundle(text: string): { events: readonly PoseEvent[] } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "not JSON" };
  }
  if (!isRecord(raw) || raw["format"] !== BUNDLE_FORMAT) {
    return { error: `not a ${BUNDLE_FORMAT} file` };
  }
  const events = raw["events"];
  if (!Array.isArray(events)) return { error: "no events in it" };
  return { events: events.filter(isPoseEvent) };
}
