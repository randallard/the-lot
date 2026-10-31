/**
 * Properties of the voice test's reducer over arbitrary action sequences (ADR-1017; the-lot
 * ADR-0065). Times only move forward, as `performance.now()` does; everything else is arbitrary:
 * modes, chains, floor resets, clears, and results built from call names, sound-alikes and noise.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FORMATIONS } from "square-one";
import { VOICE_CALLS } from "./call-vocabulary";
import { makeChain } from "./chain";
import { initialSession, reduce, summarise, summariseChains, type VoiceAction, type VoiceSession } from "./voice-test-session";

const IDS = new Set(VOICE_CALLS.map((c) => c.id));
const FORMATION_IDS = new Set(Object.keys(FORMATIONS));

const word = fc.oneof(
  fc.constantFrom(...VOICE_CALLS.map((c) => c.say)),
  fc.constantFrom("heads", "everybody", "passed through", "Alma left", "view to the left", "Dodo", "traded by", "star roof", "um", ""),
  fc.string({ maxLength: 8 }),
);
const transcript = fc.array(word, { maxLength: 5 }).map((ws) => ws.join(" ").trim());

/** One step: what happens and how long after the last. Times are filled in cumulatively. */
type Step =
  | { readonly kind: "listening"; readonly on: boolean }
  | { readonly kind: "speech-start" | "speech-end" | "clear" | "floor-reset" }
  | { readonly kind: "heard"; readonly transcript: string; readonly final: boolean }
  | { readonly kind: "mode"; readonly mode: "prompt" | "free" | "chain" }
  | { readonly kind: "chain"; readonly seed: number }
  | { readonly kind: "target"; readonly id: string | null }
  | { readonly kind: "bpm"; readonly bpm: number };

const step: fc.Arbitrary<Step> = fc.oneof(
  { weight: 1, arbitrary: fc.boolean().map((on): Step => ({ kind: "listening", on })) },
  { weight: 3, arbitrary: fc.constantFrom<Step>({ kind: "speech-start" }, { kind: "speech-end" }) },
  { weight: 6, arbitrary: fc.record({ transcript, final: fc.boolean() }).map((h): Step => ({ kind: "heard", ...h })) },
  { weight: 1, arbitrary: fc.constantFrom("prompt", "free", "chain").map((mode): Step => ({ kind: "mode", mode })) },
  { weight: 1, arbitrary: fc.integer({ min: 1, max: 1000 }).map((seed): Step => ({ kind: "chain", seed })) },
  { weight: 1, arbitrary: fc.option(fc.constantFrom(...IDS), { nil: null }).map((id): Step => ({ kind: "target", id })) },
  { weight: 1, arbitrary: fc.oneof(fc.integer({ min: 60, max: 200 }), fc.constant(0), fc.constant(Number.NaN)).map((bpm): Step => ({ kind: "bpm", bpm })) },
  { weight: 1, arbitrary: fc.constantFrom<Step>({ kind: "clear" }, { kind: "floor-reset" }) },
);

const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

function toAction(s: Step, at: number): VoiceAction {
  switch (s.kind) {
    case "listening": return { type: "listening", on: s.on };
    case "speech-start": return { type: "speech-start", at };
    case "speech-end": return { type: "speech-end", at };
    case "heard": return { type: "heard", transcript: s.transcript, final: s.final, at };
    case "mode": return { type: "mode", mode: s.mode };
    case "chain": return { type: "chain", chain: makeChain(seeded(s.seed)) };
    case "target": return { type: "target", id: s.id };
    case "bpm": return { type: "bpm", bpm: s.bpm };
    case "clear": return { type: "clear" };
    case "floor-reset": return { type: "floor-reset" };
  }
}

const sessions = fc.array(fc.tuple(step, fc.integer({ min: 0, max: 2000 })), { maxLength: 60 }).map((steps) => {
  let at = 0;
  const states: VoiceSession[] = [initialSession("pass-thru", "web-speech")];
  const actions: VoiceAction[] = [];
  for (const [s, dt] of steps) {
    at += dt;
    const a = toAction(s, at);
    actions.push(a);
    states.push(reduce(states[states.length - 1] ?? initialSession(null, "x"), a));
  }
  return { states, actions };
});

/** An object's values, as `unknown` (`Object.values` on an interface gives `any`). */
const valuesOf = (o: object): unknown[] => Object.values(o);

describe("the voice test's reducer, over arbitrary action sequences", () => {
  it("every call it names is a known call, named no later than the latest result", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      for (const s of states) {
        const latest = s.now.results[s.now.results.length - 1]?.at ?? Infinity;
        for (const n of s.now.named) {
          expect(IDS.has(n.id)).toBe(true);
          expect(n.at).toBeLessThanOrEqual(latest);
        }
        for (const t of s.trials) {
          for (const n of t.calls) {
            expect(IDS.has(n.id)).toBe(true);
            expect(n.at).toBeLessThanOrEqual(t.finalAt);
            expect(n.at).toBeGreaterThanOrEqual(t.results[0]?.at ?? -Infinity);
          }
        }
      }
    }));
  });

  it("a result that only adds calls never moves one already named", () => {
    fc.assert(fc.property(sessions, ({ states, actions }) => {
      actions.forEach((a, i) => {
        const before = states[i]?.now.named ?? [];
        const after = states[i + 1];
        if (a.type !== "heard" || after === undefined || after.now.results.length === 0) return;
        const now = after.now.named;
        // When the old list is a prefix of the new one, every old call keeps its time.
        if (before.length <= now.length && before.every((b, k) => now[k]?.id === b.id)) {
          before.forEach((b, k) => { expect(now[k]?.at).toBe(b.at); });
        }
      });
    }));
  });

  it("the floor is always null or a non-empty set of known formations", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      for (const s of states) {
        if (s.floor === null) continue;
        expect(s.floor.length).toBeGreaterThan(0);
        for (const f of s.floor) expect(FORMATION_IDS.has(f)).toBe(true);
      }
    }));
  });

  it("only free mode moves the floor, and only on a final result", () => {
    fc.assert(fc.property(sessions, ({ states, actions }) => {
      actions.forEach((a, i) => {
        const before = states[i];
        const after = states[i + 1];
        if (before === undefined || after === undefined || after.floor === before.floor) return;
        const resetting = a.type === "floor-reset" || (a.type === "mode" && a.mode === "free");
        expect(resetting || (a.type === "heard" && a.final && before.mode === "free")).toBe(true);
      });
    }));
  });

  it("trials are only ever added one at a time, and only clear removes them", () => {
    fc.assert(fc.property(sessions, ({ states, actions }) => {
      actions.forEach((a, i) => {
        const n0 = states[i]?.trials.length ?? 0;
        const n1 = states[i + 1]?.trials.length ?? 0;
        if (a.type === "clear") expect(n1).toBe(0);
        else expect(n1 === n0 || n1 === n0 + 1).toBe(true);
        if (n1 === n0 + 1) expect(a.type === "heard" && a.final).toBe(true);
      });
    }));
  });

  it("a trial is a chain trial exactly when it was said in chain mode with a chain shown", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      states.forEach((s, i) => {
        const before = states[i - 1];
        if (before === undefined || s.trials.length !== before.trials.length + 1) return;
        const t = s.trials[s.trials.length - 1];
        const chained = before.mode === "chain" && before.chain !== null;
        expect(t?.chain === null).toBe(!chained);
        if (chained) expect(t?.chain).toEqual(before.chain.steps.map((c) => c.id));
      });
    }));
  });

  it("every trial keeps its results, in time order, ending with the final that closed it", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      for (const s of states) {
        for (const t of s.trials) {
          expect(t.results.length).toBeGreaterThan(0);
          expect(t.results[t.results.length - 1]?.final).toBe(true);
          for (let k = 1; k < t.results.length; k++) expect((t.results[k]?.at ?? 0) >= (t.results[k - 1]?.at ?? 0)).toBe(true);
        }
      }
    }));
  });

  it("segments are well formed: each ends after it starts, and only the last can be open", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      for (const s of states) {
        for (const segs of [s.now.segments, ...s.trials.map((t) => t.segments)]) {
          segs.forEach((g, k) => {
            if (g.end !== null) expect(g.end).toBeGreaterThanOrEqual(g.start);
            else expect(k).toBe(segs.length - 1);
          });
        }
      }
    }));
  });

  it("the beat rate stays a positive number, and the summaries never produce NaN", () => {
    fc.assert(fc.property(sessions, ({ states }) => {
      for (const s of states) {
        expect(Number.isFinite(s.bpm) && s.bpm > 0).toBe(true);
        const nums = [...valuesOf(summarise(s)), ...valuesOf(summariseChains(s))].flatMap((v) =>
          typeof v === "number" ? [v] : v !== null && typeof v === "object" ? valuesOf(v).filter((x): x is number => typeof x === "number") : [],
        );
        for (const x of nums) expect(Number.isNaN(x)).toBe(false);
      }
    }));
  });
});
