/**
 * 🧪 A recogniser's transcript → the call it names (2026-10-29, `#voice-test`).
 *
 * A caller says more than the call ("heads square thru four", "everybody dosado"), and a
 * recogniser misspells it ("do sa do", "pass through"). So the transcript is normalised, every
 * spelling of every call is normalised the same way, and the **longest** spelling found as a run
 * of whole words wins. Longest, so "left swing thru" isn't read as "swing thru" and "right and left
 * thru" isn't read as "right hand star"'s neighbour. Pure, so it's tested without a microphone.
 */

import { VOICE_CALLS, type VoiceCall } from "./call-vocabulary";

/** Lower case, "through" → "thru", spelled-out numbers and fractions → digits, no punctuation. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9/ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "")
    .map((w) => WORDS[w] ?? w)
    .join(" ")
    .replace(/\b1 quarter\b|\ba quarter\b/g, "a 1/4")
    .replace(/\b3 quarters?\b/g, "3/4")
    .replace(/\b1 half\b|\ba half\b/g, "1/2")
    // A recogniser drops the "a" ("touch quarter"): a quarter left bare is still a quarter.
    .replace(/\bquarter\b/g, "1/4");
}

const WORDS: Readonly<Record<string, string>> = {
  through: "thru", threw: "thru", one: "1", two: "2", three: "3", four: "4", eight: "8",
  quarter: "quarter", quarters: "quarters", half: "half",
};

interface Spelling {
  readonly call: VoiceCall;
  readonly words: readonly string[];
}

const SPELLINGS: readonly Spelling[] = VOICE_CALLS.flatMap((call) =>
  [call.say, ...call.heard].map((s) => ({ call, words: normalise(s).split(" ") })),
).sort((a, b) => b.words.length - a.words.length);

export interface CallMatch {
  readonly call: VoiceCall;
  /** The words of the transcript that named it. */
  readonly words: string;
}

/**
 * Every call a transcript names, in the order said. Walks the words left to right: where a
 * spelling starts, the longest one there is taken and its words skipped; elsewhere, one word is.
 * So "heads lead right pass thru trade by" is three calls, and "left swing thru" is one.
 */
export function matchCalls(transcript: string): readonly CallMatch[] {
  const said = normalise(transcript).split(" ");
  const out: CallMatch[] = [];
  let i = 0;
  while (i < said.length) {
    const s = SPELLINGS.find((sp) => sp.words.every((w, j) => said[i + j] === w));
    if (s === undefined) {
      i++;
      continue;
    }
    out.push({ call: s.call, words: s.words.join(" ") });
    i += s.words.length;
  }
  return out;
}

/** The call a transcript names, or null. The longest spelling that appears as whole words wins. */
export function matchCall(transcript: string): CallMatch | null {
  const said = normalise(transcript).split(" ");
  for (const s of SPELLINGS) {
    for (let i = 0; i + s.words.length <= said.length; i++) {
      if (s.words.every((w, j) => said[i + j] === w)) return { call: s.call, words: s.words.join(" ") };
    }
  }
  return null;
}
