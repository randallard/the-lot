/**
 * 🧪 Hearing calls by how they sound, narrowed by what's legal next (2026-10-30, `#voice-test`).
 *
 * The chain run (journal 10-30 (3)) missed 10 calls, every one a spelling the vocabulary lacked:
 * "passed through", "Alma left", "squared through four", "touch quarter", "view to the left". Ryan
 * didn't want a spelling list kept up per caller. Two things replace it:
 *
 * - **Sound.** Each word becomes a rough phonetic key ({@link soundKey}: "passed" and "pass" are
 *   both `pas`, "squared" and "square" `skwar`), filler words a recogniser adds or drops ("a",
 *   "the", "to", "and") are left out, and a call is matched by edit distance between keys.
 * - **What's legal.** A loose match is only allowed for a call that is Standard from the formation
 *   the dancers are in (square-one's `callsFrom`), and each call heard moves the formation on
 *   (`endingsFrom`). So "view to the left" can be Veer Left from Eight Chain Thru, where there are
 *   18–33 candidates instead of 75. An exact spelling is still taken anywhere: a caller may call an
 *   Extended application.
 *
 * Where the formation isn't known (no start, or a call with no known ending), every call is a
 * candidate, but only within the stricter {@link STRICT}: "Allaman left", "California tour" and
 * "passed through" are close enough. "Dodo" (0.33 from Dosado) isn't heard anywhere: it's past
 * {@link LOOSE} too, and a two-syllable guess is the riskiest kind.
 *
 * Pure, so it's tested on the runs' own transcripts.
 */

import { callsFrom, endingsFrom, type ApplicationCallId, type FormationId } from "square-one";
import { VOICE_CALLS, type VoiceCall } from "./call-vocabulary";
import { normalise } from "./match-call";

/** Words a recogniser adds or drops around a call; never part of a key. */
const FILLER = new Set(["a", "an", "the", "to", "and", "of", "your", "you", "with"]);

/** How far a legal candidate's key may be from what was heard, as a fraction of the longer key. The
 *  10-30 runs' real loose matches were all 0.22 or under ("Amo style"); 0.30 leaves room for more. */
export const LOOSE = 0.3;
/** The same, when the formation isn't known and every call is a candidate. */
export const STRICT = 0.25;

/**
 * A word's rough sound: common spellings of one sound made one letter, silent endings dropped,
 * doubled letters made single, and every run of vowels made one `a`. Digits are kept as they are.
 */
export function soundKey(word: string): string {
  if (/^[0-9/]+$/.test(word)) return word;
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  w = w
    .replace(/ph/g, "f")
    .replace(/gh/g, "")
    .replace(/ck/g, "k")
    .replace(/qu/g, "kw")
    .replace(/x/g, "ks")
    .replace(/z/g, "s")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/dg/g, "j")
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/th/g, "t")
    .replace(/(.)\1+/g, "$1")
    .replace(/[aeiouy]+/g, "a");
  return w;
}

/** The words of a phrase that count: normalised, without filler. */
const wordsOf = (text: string): readonly string[] => normalise(text).split(" ").filter((w) => w !== "" && !FILLER.has(w));
const keyOf = (words: readonly string[]): string => words.map(soundKey).join("");

interface Spelling {
  readonly call: VoiceCall;
  readonly words: readonly string[];
  readonly key: string;
}

const SPELLINGS: readonly Spelling[] = VOICE_CALLS.flatMap((call) =>
  [call.say, ...call.heard].map((s) => {
    const words = wordsOf(s);
    return { call, words, key: keyOf(words) };
  }),
);

export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

export interface HeardCall {
  readonly call: VoiceCall;
  /** The transcript's words it was heard in (filler left out). */
  readonly words: string;
  /** The words were a spelling of the call, not just a sound like one. */
  readonly exact: boolean;
  /** 0 for an exact spelling; otherwise the edit distance as a fraction of the longer key (0 when
   *  only the sound matched: "passed" for "pass"). */
  readonly distance: number;
  /** The formation the dancers are in when it's called, if known (the first, if it could be several). */
  readonly from: FormationId | null;
  /** Where it leaves them: every formation it can end in from there; null if that isn't known. */
  readonly to: readonly FormationId[] | null;
}

/** The calls a loose match may be, from where the dancers are: all of them if that isn't known. */
function candidates(at: readonly FormationId[] | null): ReadonlySet<string> | null {
  if (at === null || at.length === 0) return null;
  return new Set(at.flatMap((f) => callsFrom(f)));
}

interface Best {
  readonly s: Spelling;
  readonly n: number;
  readonly d: number;
  readonly exact: boolean;
}

/** The best match starting at word `i`: an exact spelling of any call, else the closest allowed key. */
function bestAt(said: readonly string[], i: number, legal: ReadonlySet<string> | null): Best | null {
  const limit = legal === null ? STRICT : LOOSE;
  let best: Best | null = null;
  for (const s of SPELLINGS) {
    for (let n = Math.max(1, s.words.length - 1); n <= s.words.length + 1 && i + n <= said.length; n++) {
      const window = said.slice(i, i + n);
      const exact = n === s.words.length && window.every((w, j) => w === s.words[j]);
      if (!exact && legal !== null && !legal.has(s.call.id)) continue;
      const key = keyOf(window);
      const d = exact ? 0 : editDistance(key, s.key) / Math.max(key.length, s.key.length, 1);
      if (d > limit) continue;
      // An exact spelling beats a sound at the same distance ("passed" vs "pass" are both 0).
      const better = best === null || d < best.d || (d === best.d && exact && !best.exact) || (d === best.d && exact === best.exact && n > best.n);
      if (better) best = { s, n, d, exact };
    }
  }
  return best;
}

/**
 * Every call in a transcript, in order, heard by sound. Walks the words left to right; at each,
 * the best match starting there wins: an exact spelling of any call first, then the closest key
 * among the calls legal where the dancers are (within {@link LOOSE}; {@link STRICT} when that isn't
 * known), longer before shorter on a tie. A loose match is passed over when the next word starts
 * a closer one: "centers passed through" is Pass Thru from "passed", not a near-Zoom ("centers
 * zoom") from "centers". `start` is the formation the transcript begins in, or the formations it
 * could be (a live floor after a call with several endings); null when unknown.
 */
export function hearCalls(transcript: string, start: FormationId | readonly FormationId[] | null): readonly HeardCall[] {
  const said = wordsOf(transcript);
  const out: HeardCall[] = [];
  const begin = start === null ? null : typeof start === "string" ? [start] : start;
  let at: readonly FormationId[] | null = begin === null || begin.length === 0 ? null : begin;
  let i = 0;
  while (i < said.length) {
    const legal = candidates(at);
    const best = bestAt(said, i, legal);
    const later = best !== null && !best.exact ? bestAt(said, i + 1, legal) : null;
    if (best === null || (later !== null && (later.d < best.d || (later.d === best.d && later.exact)))) {
      i++;
      continue;
    }
    const call = best.s.call.id as ApplicationCallId;
    const next: FormationId[] | null = at === null ? null : [...new Set(at.flatMap((f) => endingsFrom(call, f)))];
    const to = next === null || next.length === 0 ? null : next;
    out.push({ call: best.s.call, words: said.slice(i, i + best.n).join(" "), exact: best.exact, distance: best.d, from: at?.[0] ?? null, to });
    i += best.n;
    at = to;
  }
  return out;
}
