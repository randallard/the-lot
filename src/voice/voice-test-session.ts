/**
 * 🧪 `#voice-test`'s state: one pure reducer (the-lot ADR-0065), 2026-10-29.
 *
 * - **Facts**: the finished trials. Each trial is one utterance: what was asked, what the
 *   recogniser wrote, the call it named, and when things happened.
 * - **Managed position**: the mode, the call being asked for, the beat rate, whether the
 *   microphone is listening, and the utterance in progress.
 * - **Derived**: the summary (accuracy, latency in ms and in beats), by {@link summarise}.
 *
 * Times are `performance.now()` milliseconds, passed in on each action, so the reducer never
 * reads a clock. The target is chosen by the screen (it holds the randomness) and passed in.
 *
 * **Latency is measured from the end of speech**, found by the screen's level meter on the
 * microphone, because that's the moment a caller has finished calling and is waiting for the
 * floor. Two numbers per trial: the first interim result that already names a call (the earliest
 * the floor could act), and the final result.
 *
 * **Chain mode** (2026-10-30): the page shows a chain of calls (`chain.ts`) to say in one go. Every
 * call the transcript names is kept in order with the moment it was first named, and the level
 * meter's pauses split the utterance into segments. When there's one segment per call (a pause
 * between calls), each call gets its own latency from the end of its segment.
 *
 * **Carry-over.** Safari's continuous recognition can start a result with the previous final's
 * text ("Star through right left through" after "Star through"), or send that text again on its
 * own before the next utterance starts, which named a call before it was spoken. A transcript that
 * starts with the previous final is matched without it, and so is one that *is* the previous final
 * while the meter has heard no speech yet. (So a repeated call the meter misses is dropped too.)
 *
 * **A chain isn't split by an early final** (10-30 (3)): Safari can finalise mid-chain while the
 * caller is still talking. In chain mode a final while the meter hears speech doesn't end the
 * trial; its text is kept and the next results add to it, until a final comes after speech ends
 * or every call in the chain has been heard. A trial that does end mid-speech hands its open
 * segment to the next utterance, so that one still has a start.
 *
 * **Every result is kept** (10-30 (10)): each interim and final, with its time and text, on the
 * trial. The noisy run named nearly every call only when the final arrived, 10–20 s late, and
 * without the interims there was no telling whether Safari stopped sending them or a revision of
 * an early word re-timed everything after it.
 *
 * **Calls are heard by sound** (`sound-alike.ts`), narrowed in chain mode by what's legal from the
 * chain's start and each call heard since.
 *
 * **Free mode is a live floor** (10-30 (6)): the session keeps where the dancers are (`floor`),
 * from a Static Square, moved on by the last call of each utterance and carried into the next, so
 * free calling is narrowed by what's legal too. A call with no known ending leaves it unknown
 * (`null`) until a reset. It's managed position: the screen can reset it, nothing derives it.
 */

import type { FormationId } from "square-one";
import { normalise } from "./match-call";
import { inOrder, type ChainPrompt } from "./chain";
import { hearCalls } from "./sound-alike";

export type Mode = "prompt" | "free" | "chain";

/** A call named during an utterance, and when it was first named. */
export interface Named {
  readonly id: string;
  readonly at: number;
  /** The words were a spelling of the call; false when it was heard by sound (`sound-alike.ts`). */
  readonly exact: boolean;
  /** The formation the dancers were in when it was called, if known. */
  readonly from: FormationId | null;
  /** 0 for an exact spelling; otherwise how far its sound was. */
  readonly distance: number;
}

/** One result from the recogniser, as it came. */
export interface Result {
  readonly at: number;
  readonly text: string;
  readonly final: boolean;
}

/** A stretch of speech between pauses, by the level meter. `end` is null while still speaking. */
export interface Segment {
  readonly start: number;
  readonly end: number | null;
}

export interface Trial {
  /** The call asked for, in prompt mode. */
  readonly target: string | null;
  readonly transcript: string;
  /** The call the final transcript names. */
  readonly matched: string | null;
  /** The call the first naming interim result named, which may differ from the final's. */
  readonly early: string | null;
  readonly speechStart: number | null;
  readonly speechEnd: number | null;
  /** The first interim (or final) result that named a call. */
  readonly firstMatchAt: number | null;
  readonly finalAt: number;
  readonly engine: string;
  /** Chain mode: the calls asked for, in order. Null outside chain mode. */
  readonly chain: readonly string[] | null;
  /** Every call the transcript named, in order, each with when it was first named. */
  readonly calls: readonly Named[];
  readonly segments: readonly Segment[];
  /** Words dropped from the front as the previous utterance carried over. */
  readonly carried: number;
  /** Free mode: where the floor was when the utterance began (null: unknown, or not free mode). */
  readonly floor: readonly FormationId[] | null;
  /** Every result the recogniser sent for this utterance, interim and final, in order. */
  readonly results: readonly Result[];
}

interface Utterance {
  readonly speechStart: number | null;
  readonly speechEnd: number | null;
  readonly firstMatchAt: number | null;
  readonly early: string | null;
  readonly interim: string;
  readonly named: readonly Named[];
  readonly segments: readonly Segment[];
  /** Chain mode: finals already heard in this trial, for matching (carry-over dropped) and as said. */
  readonly done: string;
  readonly said: string;
  readonly results: readonly Result[];
}

export interface VoiceSession {
  readonly trials: readonly Trial[];
  readonly mode: Mode;
  readonly target: string | null;
  /** Chain mode's prompt, chosen by the screen. */
  readonly chain: ChainPrompt | null;
  /** Free mode: the formations the dancers can be in now; null when that isn't known. */
  readonly floor: readonly FormationId[] | null;
  readonly bpm: number;
  readonly listening: boolean;
  readonly engine: string;
  readonly now: Utterance;
  /** The last final transcript, to recognise it carried over into the next result. */
  readonly lastFinal: string;
  readonly notice: string | null;
}

const SQUARE: readonly FormationId[] = ["squared-set"];

const QUIET: Utterance = { speechStart: null, speechEnd: null, firstMatchAt: null, early: null, interim: "", named: [], segments: [], done: "", said: "", results: [] };

export const initialSession = (target: string | null, engine: string): VoiceSession => ({
  trials: [],
  mode: "prompt",
  target,
  chain: null,
  floor: SQUARE,
  bpm: 128,
  listening: false,
  engine,
  now: QUIET,
  lastFinal: "",
  notice: null,
});

/**
 * The transcript without the previous final carried over at its front, and how many words that
 * was. A strict prefix counts; the whole transcript counts only when `beforeSpeech` (the meter has
 * heard nothing yet), because otherwise it's the same call said again.
 */
export function dropCarry(transcript: string, lastFinal: string, beforeSpeech = false): { readonly text: string; readonly carried: number } {
  const words = normalise(transcript).split(" ");
  const prev = normalise(lastFinal).split(" ").filter((w) => w !== "");
  const longer = words.length > prev.length || (beforeSpeech && words.length === prev.length);
  const carried = prev.length > 0 && longer && prev.every((w, i) => words[i] === w);
  return carried ? { text: words.slice(prev.length).join(" "), carried: prev.length } : { text: transcript, carried: 0 };
}

/**
 * The calls named so far. The new list is lined up against the old (their longest common
 * subsequence of ids): a call still there keeps the time it was first named; a new or changed one
 * takes `at`. Until 10-30 (11) it re-timed everything after the first change, and a final that
 * rewrote one early word ("lead left view right" → "the right") pushed every later call to the
 * end of a 15 s utterance, though each had been named seconds before.
 */
function rename(before: readonly Named[], heard: readonly Omit<Named, "at">[], at: number): readonly Named[] {
  const n = before.length;
  const m = heard.length;
  // lcs[i][j]: the longest common run of ids in before[i..] and heard[j..].
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = lcs[i] ?? [];
      row[j] = before[i]?.id === heard[j]?.id ? (lcs[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(lcs[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const out: Named[] = [];
  let i = 0;
  for (let j = 0; j < m; j++) {
    const h = heard[j];
    if (h === undefined) continue;
    // Skip old calls that the alignment drops, then keep this one's time if it's the match.
    while (i < n && before[i]?.id !== h.id && (lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) i++;
    const kept = i < n && before[i]?.id === h.id && (lcs[i]?.[j] ?? 0) === (lcs[i + 1]?.[j + 1] ?? 0) + 1;
    out.push({ ...h, at: kept ? (before[i]?.at ?? at) : at });
    if (kept) i++;
  }
  return out;
}

const join = (...parts: readonly string[]) => parts.filter((p) => p !== "").join(" ");

export type VoiceAction =
  | { readonly type: "listening"; readonly on: boolean }
  | { readonly type: "speech-start"; readonly at: number }
  | { readonly type: "speech-end"; readonly at: number }
  | { readonly type: "heard"; readonly transcript: string; readonly final: boolean; readonly at: number }
  | { readonly type: "target"; readonly id: string | null }
  | { readonly type: "chain"; readonly chain: ChainPrompt | null }
  /** Back to a Static Square. */
  | { readonly type: "floor-reset" }
  | { readonly type: "mode"; readonly mode: Mode }
  | { readonly type: "bpm"; readonly bpm: number }
  | { readonly type: "engine"; readonly engine: string }
  | { readonly type: "notice"; readonly text: string | null }
  | { readonly type: "clear" };

export function reduce(s: VoiceSession, a: VoiceAction): VoiceSession {
  switch (a.type) {
    case "listening":
      return { ...s, listening: a.on, now: QUIET, lastFinal: "", notice: a.on ? null : s.notice };
    case "speech-start": {
      // A new start after an end with no result yet is the same utterance resuming (a pause
      // mid-call, or between calls in a chain): keep the first start, drop the end, open a segment.
      const open = s.now.segments[s.now.segments.length - 1]?.end === null;
      const segments = open ? s.now.segments : [...s.now.segments, { start: a.at, end: null }];
      return { ...s, now: { ...s.now, speechStart: s.now.speechStart ?? a.at, speechEnd: null, segments } };
    }
    case "speech-end": {
      const segments = s.now.segments.map((g, i) => (i === s.now.segments.length - 1 && g.end === null ? { ...g, end: a.at } : g));
      return { ...s, now: { ...s.now, speechEnd: a.at, segments } };
    }
    case "heard": {
      const { text, carried } = dropCarry(a.transcript, s.lastFinal, s.now.speechStart === null);
      const chain = s.mode === "chain" ? s.chain : null;
      const floor = s.mode === "free" ? s.floor : null;
      const heard = hearCalls(join(s.now.done, text), chain?.start ?? floor);
      const m = heard[0];
      const first = s.now.firstMatchAt === null && m !== undefined;
      const now: Utterance = {
        ...s.now,
        interim: a.final ? "" : a.transcript,
        firstMatchAt: first ? a.at : s.now.firstMatchAt,
        early: first ? m.call.id : s.now.early,
        named: rename(s.now.named, heard.map((h) => ({ id: h.call.id, exact: h.exact, distance: h.distance, from: h.from })), a.at),
        results: [...s.now.results, { at: a.at, text: a.transcript, final: a.final }],
      };
      if (!a.final) return { ...s, now };
      const open = now.segments[now.segments.length - 1]?.end === null;
      const asked = chain?.steps.map((c) => c.id) ?? [];
      const complete = inOrder(asked, now.named.map((n) => n.id)) === asked.length;
      // Chain mode: a final while still speaking is a pause in the recogniser, not the chain's end.
      if (chain !== null && open && !complete) {
        return { ...s, now: { ...now, done: join(s.now.done, text), said: join(s.now.said, a.transcript) }, lastFinal: a.transcript };
      }
      const openSegment = open ? now.segments[now.segments.length - 1] : undefined;
      const trial: Trial = {
        target: s.mode === "prompt" ? s.target : null,
        transcript: join(s.now.said, a.transcript),
        matched: m?.call.id ?? null,
        early: now.early,
        speechStart: now.speechStart,
        speechEnd: now.speechEnd,
        firstMatchAt: now.firstMatchAt,
        finalAt: a.at,
        engine: s.engine,
        chain: chain === null ? null : asked,
        calls: now.named,
        segments: now.segments,
        carried,
        floor,
        results: now.results,
      };
      // The floor moves on with the utterance's last call; one that heard nothing leaves it.
      const last = heard[heard.length - 1];
      const nextFloor = s.mode !== "free" || last === undefined ? s.floor : last.to;
      // Speech still going when the trial ends belongs to the next utterance.
      const next: Utterance = openSegment === undefined ? QUIET : { ...QUIET, speechStart: openSegment.start, segments: [openSegment] };
      return { ...s, trials: [...s.trials, trial], now: next, lastFinal: a.transcript, floor: nextFloor };
    }
    case "target":
      return { ...s, target: a.id };
    case "chain":
      return { ...s, chain: a.chain };
    case "floor-reset":
      return { ...s, floor: SQUARE };
    case "mode":
      return { ...s, mode: a.mode, floor: a.mode === "free" ? SQUARE : s.floor };
    case "bpm":
      return Number.isFinite(a.bpm) && a.bpm > 0 ? { ...s, bpm: a.bpm } : s;
    case "engine":
      return { ...s, engine: a.engine };
    case "notice":
      return { ...s, notice: a.text };
    case "clear":
      return { ...s, trials: [], now: QUIET, lastFinal: "" };
  }
}

// ── Derived ─────────────────────────────────────────────────────────────────────────────────

export interface Spread {
  readonly n: number;
  readonly median: number | null;
  readonly p90: number | null;
  readonly worst: number | null;
}

export interface Summary {
  readonly trials: number;
  /** Prompt-mode trials only. */
  readonly asked: number;
  readonly right: number;
  /** Prompt-mode trials whose first naming result was already the right call. */
  readonly rightEarly: number;
  /** Trials that named no call at all. */
  readonly missed: number;
  /** ms from the end of speech to the first result naming a call. Negative: named while speaking. */
  readonly toFirstMatch: Spread;
  /** ms from the end of speech to the final result. */
  readonly toFinal: Spread;
  /** Free mode, several calls an utterance: ms from the end of speech to the last call's naming. */
  readonly freeLastCall: Spread;
  /** Free mode: calls heard, and how many of them by sound rather than spelling. */
  readonly freeCalls: number;
  readonly freeBySound: number;
  /** One beat at the session's rate, ms. */
  readonly beatMs: number;
}

export function spread(xs: readonly number[]): Spread {
  if (xs.length === 0) return { n: 0, median: null, p90: null, worst: null };
  const s = [...xs].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] ?? null;
  return { n: s.length, median: at(0.5), p90: at(0.9), worst: s[s.length - 1] ?? null };
}

const sinceEnd = (at: number | null, t: Trial) => (at === null || t.speechEnd === null ? null : at - t.speechEnd);
const nums = (xs: readonly (number | null)[]) => xs.filter((x): x is number => x !== null);

/** One-call trials only (prompt and free); chain trials are {@link summariseChains}'. */
export function summarise(s: VoiceSession): Summary {
  const single = s.trials.filter((t) => t.chain === null);
  const asked = single.filter((t) => t.target !== null);
  const free = single.filter((t) => t.target === null);
  return {
    trials: single.length,
    asked: asked.length,
    right: asked.filter((t) => t.matched === t.target).length,
    rightEarly: asked.filter((t) => t.early === t.target).length,
    missed: single.filter((t) => t.matched === null).length,
    toFirstMatch: spread(nums(single.map((t) => sinceEnd(t.firstMatchAt, t)))),
    toFinal: spread(nums(single.map((t) => sinceEnd(t.finalAt, t)))),
    freeLastCall: spread(nums(free.map((t) => sinceEnd(t.calls[t.calls.length - 1]?.at ?? null, t)))),
    freeCalls: free.reduce((n, t) => n + t.calls.length, 0),
    freeBySound: free.reduce((n, t) => n + t.calls.filter((c) => !c.exact).length, 0),
    beatMs: 60000 / s.bpm,
  };
}

export interface ChainSummary {
  readonly chains: number;
  /** Chains heard exactly: every call, in order, nothing extra. */
  readonly exact: number;
  readonly callsAsked: number;
  /** Calls heard in the order asked (the longest common subsequence, per chain). */
  readonly callsInOrder: number;
  /**
   * ms from the end of a call's own segment to its first naming, for chains said with a pause
   * between calls (one segment per call), and only calls named right in their place.
   */
  readonly perCall: Spread;
  /** Chains with one segment per call, so {@link perCall} could be measured. */
  readonly segmented: number;
  /** ms from the end of speech to the first naming of the chain's last call, when it was the last named. */
  readonly lastCall: Spread;
  readonly toFinal: Spread;
}

/** How the call at each place in a segmented chain was timed, or null where it can't be. */
export function perCallLatency(t: Trial): readonly (number | null)[] | null {
  if (t.chain === null || t.segments.length !== t.chain.length || t.segments.some((g) => g.end === null)) return null;
  return t.chain.map((id, k) => {
    const named = t.calls[k];
    const end = t.segments[k]?.end ?? null;
    return named?.id === id && end !== null ? named.at - end : null;
  });
}

export function summariseChains(s: VoiceSession): ChainSummary {
  const chains = s.trials.filter((t): t is Trial & { readonly chain: readonly string[] } => t.chain !== null);
  const heard = (t: Trial) => t.calls.map((c) => c.id);
  const per = chains.map(perCallLatency);
  const lastCall = chains.map((t) => {
    const last = t.calls[t.calls.length - 1];
    return last !== undefined && last.id === t.chain[t.chain.length - 1] ? sinceEnd(last.at, t) : null;
  });
  return {
    chains: chains.length,
    exact: chains.filter((t) => heard(t).join(" ") === t.chain.join(" ")).length,
    callsAsked: chains.reduce((n, t) => n + t.chain.length, 0),
    callsInOrder: chains.reduce((n, t) => n + inOrder(t.chain, heard(t)), 0),
    perCall: spread(nums(per.flatMap((p) => p ?? []))),
    segmented: per.filter((p) => p !== null).length,
    lastCall: spread(nums(lastCall)),
    toFinal: spread(nums(chains.map((t) => sinceEnd(t.finalAt, t)))),
  };
}
