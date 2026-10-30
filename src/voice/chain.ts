/**
 * 🧪 A chain of calls to say in one go, for `#voice-test`'s chain mode (2026-10-30).
 *
 * The chain is one a caller could call: it starts from a Static Square, and each call is Standard
 * from the formation the one before it ended in, by square-one's `STANDARD_APPLICATIONS`. Only
 * applications whose ending is known, so the chain can go on, and only ones that can be said as
 * the call's name, optionally with who it's directed to ("heads lead right", "centers run").
 *
 * Pure: the screen passes in its randomness.
 */

import {
  FORMATIONS,
  formationsHolding,
  STANDARD_APPLICATIONS,
  type ApplicationCallId,
  type FormationId,
  type StandardApplication,
} from "square-one";
import { VOICE_CALLS } from "./call-vocabulary";

export interface ChainStep {
  readonly id: string;
  /** What the page asks you to say for it. */
  readonly say: string;
  /** The formation it leaves the dancers in. */
  readonly to: FormationId;
}

export interface ChainPrompt {
  readonly start: FormationId;
  readonly steps: readonly ChainStep[];
}

export const CHAIN_LENGTH = 4;

/** The words to say where the vocabulary's prompt isn't what this application is called. */
const SAY: Readonly<Partial<Record<ApplicationCallId, string>>> = { "ocean-wave": "step to a wave", run: "run" };

/** The dancers a `who` can name in a spoken call; any other `who` (a variant, a fraction) is skipped. */
const DESIGNATORS = ["heads", "centers", "outsides", "leaders", "ends"] as const;

/** What to say for `id` danced as `app`, or null if this application can't be said as a plain call. */
export function phraseOf(id: ApplicationCallId, app: StandardApplication): string | null {
  const base = SAY[id] ?? VOICE_CALLS.find((c) => c.id === id)?.say;
  if (base === undefined) return null;
  if (app.who === undefined) return id === "run" ? null : base;
  const first = app.who.split(/[ ,]/)[0];
  const who = DESIGNATORS.find((d) => d === first);
  return who === undefined ? null : `${who} ${base}`;
}

/** Every way the chain can go on from `at`: a call, what to say, and where it ends. */
export function nextSteps(at: FormationId): readonly ChainStep[] {
  const out: ChainStep[] = [];
  for (const id of Object.keys(STANDARD_APPLICATIONS) as ApplicationCallId[]) {
    for (const app of STANDARD_APPLICATIONS[id].applications as readonly StandardApplication[]) {
      if (app.to === undefined || app.from === "any" || !formationsHolding(app.from).includes(at)) continue;
      const say = phraseOf(id, app);
      if (say === null || out.some((s) => s.id === id && s.say === say)) continue;
      out.push({ id, say, to: app.to === "same" ? at : app.to });
    }
  }
  return out;
}

/**
 * A chain of `length` different calls from a Static Square.
 *
 * - It **moves the square**: a call that changes the formation is tried before one that keeps it,
 *   so four zeros in a static square (box the gnat, half sashay…) only happen if nothing else can.
 * - It **looks ahead**: a step is only taken if the chain can still be finished from where it
 *   ends, because some formations have no sayable call with a known ending yet (Inverted Square,
 *   the thars, tidal lines).
 *
 * Empty if no chain that long exists.
 */
export function makeChain(rand: () => number, length = CHAIN_LENGTH): ChainPrompt {
  const start: FormationId = "squared-set";
  return { start, steps: extend(start, [], length, rand) ?? [] };
}

function extend(at: FormationId, used: readonly string[], left: number, rand: () => number): readonly ChainStep[] | null {
  if (left === 0) return [];
  const fresh = nextSteps(at).filter((s) => !used.includes(s.id));
  const ordered = [...shuffled(fresh.filter((s) => s.to !== at), rand), ...shuffled(fresh.filter((s) => s.to === at), rand)];
  for (const step of ordered) {
    const rest = extend(step.to, [...used, step.id], left - 1, rand);
    if (rest !== null) return [step, ...rest];
  }
  return null;
}

function shuffled<T>(xs: readonly T[], rand: () => number): readonly T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export const formationName = (id: FormationId): string => FORMATIONS[id].name;

/** How many of `asked` were heard, in order: the longest common subsequence of the two lists. */
export function inOrder(asked: readonly string[], heard: readonly string[]): number {
  let prev = new Array<number>(heard.length + 1).fill(0);
  for (const a of asked) {
    const cur = [0];
    heard.forEach((h, j) => cur.push(a === h ? (prev[j] ?? 0) + 1 : Math.max(prev[j + 1] ?? 0, cur[j] ?? 0)));
    prev = cur;
  }
  return prev[heard.length] ?? 0;
}
