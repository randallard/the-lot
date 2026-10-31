import { describe, expect, it } from "vitest";
import { callsFrom, endingsFrom, STANDARD_APPLICATIONS, type ApplicationCallId, type FormationId } from "square-one";
import { VOICE_CALLS } from "./call-vocabulary";
import { inOrder, makeChain, nextSteps, type ChainPrompt } from "./chain";
import { matchCall, matchCalls, normalise } from "./match-call";
import { editDistance, FIXED_ENDING, hearCalls, soundKey } from "./sound-alike";
import {
  dropCarry, initialSession, perCallLatency, reduce, spread, summarise, summariseChains, type VoiceAction, type VoiceSession,
} from "./voice-test-session";

describe("the vocabulary and square-one's Standard Applications name the same calls", () => {
  it("every voice call has its formations in square-one, and nothing extra", () => {
    expect(VOICE_CALLS.map((c) => c.id).sort()).toEqual(Object.keys(STANDARD_APPLICATIONS).sort());
  });
});

describe("matchCall: a transcript names a call", () => {
  it("every call is found from what the page asks you to say", () => {
    for (const c of VOICE_CALLS) expect(matchCall(c.say)?.call.id, c.say).toBe(c.id);
  });

  it("every extra spelling names its own call, not a shorter neighbour", () => {
    for (const c of VOICE_CALLS) for (const h of c.heard) expect(matchCall(h)?.call.id, h).toBe(c.id);
  });

  it("finds the call inside a caller's whole sentence", () => {
    expect(matchCall("heads square through four")?.call.id).toBe("square-thru");
    expect(matchCall("Everybody do-si-do your partner")?.call.id).toBe("dosado");
    expect(matchCall("now allemande left with your corner")?.call.id).toBe("allemande-left");
    expect(matchCall("sides pass through")?.call.id).toBe("pass-thru");
  });

  it("the longest spelling wins", () => {
    expect(matchCall("left swing thru")?.call.id).toBe("left-swing-thru");
    expect(matchCall("double pass thru")?.call.id).toBe("double-pass-thru");
    expect(matchCall("reverse flutterwheel")?.call.id).toBe("reverse-flutterwheel");
    expect(matchCall("left turn through")?.call.id).toBe("left-turn-thru");
  });

  it("whole words only, and nothing named is null", () => {
    expect(matchCall("runway")).toBeNull();
    expect(matchCall("hello there")).toBeNull();
    expect(matchCall("")).toBeNull();
  });

  it("fractions and numbers are spelled one way", () => {
    expect(normalise("Cast off three quarters")).toBe("cast off 3/4");
    expect(normalise("sweep a quarter")).toBe("sweep a 1/4");
    expect(matchCall("touch one quarter")?.call.id).toBe("touch-a-quarter");
  });
});

const run = (s: VoiceSession, ...as: VoiceAction[]) => as.reduce(reduce, s);

describe("the voice test's session", () => {
  const start = () => run(initialSession("dosado", "web-speech"), { type: "listening", on: true });

  it("an utterance becomes one trial on its final result, timed from the end of speech", () => {
    const s = run(
      start(),
      { type: "speech-start", at: 1000 },
      { type: "heard", transcript: "do", final: false, at: 1200 },
      { type: "heard", transcript: "do sa do", final: false, at: 1450 },
      { type: "speech-end", at: 1500 },
      { type: "heard", transcript: "do sa do", final: true, at: 1900 },
    );
    expect(s.trials).toEqual([
      {
        target: "dosado", transcript: "do sa do", matched: "dosado", early: "dosado", speechStart: 1000, speechEnd: 1500, firstMatchAt: 1450, finalAt: 1900, engine: "web-speech",
        chain: null, calls: [{ id: "dosado", at: 1450, exact: true, distance: 0, from: null }], segments: [{ start: 1000, end: 1500 }], carried: 0, floor: null,
        results: [{ at: 1200, text: "do", final: false }, { at: 1450, text: "do sa do", final: false }, { at: 1900, text: "do sa do", final: true }],
      },
    ]);
    const sum = summarise(s);
    expect(sum.toFirstMatch.median).toBe(-50);
    expect(sum.toFinal.median).toBe(400);
    expect([sum.asked, sum.right, sum.rightEarly, sum.missed]).toEqual([1, 1, 1, 0]);
  });

  it("a pause mid-call keeps the first start and waits for the last end", () => {
    const s = run(start(), { type: "speech-start", at: 0 }, { type: "speech-end", at: 300 }, { type: "speech-start", at: 400 }, { type: "speech-end", at: 900 });
    expect([s.now.speechStart, s.now.speechEnd]).toEqual([0, 900]);
  });

  it("a wrong call and a miss are counted, and free mode asks for nothing", () => {
    const s = run(
      start(),
      { type: "heard", transcript: "pass thru", final: true, at: 10 },
      { type: "mode", mode: "free" },
      { type: "heard", transcript: "mumble", final: true, at: 20 },
    );
    const sum = summarise(s);
    expect([sum.trials, sum.asked, sum.right, sum.missed]).toEqual([2, 1, 0, 1]);
    expect(s.trials[1]?.target).toBeNull();
    // No speech end heard: no latency recorded rather than a made-up one.
    expect(sum.toFinal.n).toBe(0);
  });

  it("the beat is the session's rate, and a bad rate is ignored", () => {
    expect(summarise(run(start(), { type: "bpm", bpm: 120 })).beatMs).toBe(500);
    expect(run(start(), { type: "bpm", bpm: 0 }).bpm).toBe(128);
  });

  it("stopping drops the utterance in progress; clear keeps the mode and target", () => {
    const s = run(start(), { type: "speech-start", at: 5 }, { type: "listening", on: false });
    expect(s.now.speechStart).toBeNull();
    const c = run(start(), { type: "heard", transcript: "zoom", final: true, at: 1 }, { type: "clear" });
    expect([c.trials.length, c.target, c.mode]).toEqual([0, "dosado", "prompt"]);
  });
});

describe("spread", () => {
  it("median, p90 and worst by rank", () => {
    expect(spread([5, 1, 3, 2, 4, 6, 7, 8, 9, 10])).toEqual({ n: 10, median: 5, p90: 9, worst: 10 });
    expect(spread([])).toEqual({ n: 0, median: null, p90: null, worst: null });
  });
});

describe("matchCalls: every call in a transcript, in order", () => {
  const ids = (t: string) => matchCalls(t).map((m) => m.call.id);

  it("a chain said in one breath is each of its calls", () => {
    expect(ids("Heads lead right, pass through, trade by")).toEqual(["lead-right", "pass-thru", "trade-by"]);
    expect(ids("pass through trade by pass through trade by")).toEqual(["pass-thru", "trade-by", "pass-thru", "trade-by"]);
  });

  it("the longest spelling at each place, so a long call isn't split", () => {
    expect(ids("left swing thru")).toEqual(["left-swing-thru"]);
    expect(ids("right and left thru")).toEqual(["right-and-left-thru"]);
  });

  it("words that aren't calls are stepped over", () => {
    expect(ids("everybody now swing thru and boys run")).toEqual(["swing-thru", "run"]);
    expect(ids("")).toEqual([]);
  });
});

describe("carry-over: the previous final at the front of the next result", () => {
  it("is dropped, as Safari did on 10-30 (\"Star through right left through\")", () => {
    expect(dropCarry("Star through right and left through", "Star through")).toEqual({ text: "right and left thru", carried: 2 });
  });

  it("saying the same call again isn't a carry", () => {
    expect(dropCarry("Star through", "Star through")).toEqual({ text: "Star through", carried: 0 });
    // ...unless the meter hasn't heard speech yet: then it's the last final, sent again.
    expect(dropCarry("Star through", "Star through", true)).toEqual({ text: "", carried: 2 });
    expect(dropCarry("pass thru", "")).toEqual({ text: "pass thru", carried: 0 });
  });

  it("the carried call isn't named early in the next trial", () => {
    const s = run(
      initialSession("right-and-left-thru", "web-speech"),
      { type: "listening", on: true },
      { type: "heard", transcript: "Star through", final: true, at: 100 },
      { type: "heard", transcript: "Star through", final: false, at: 200 },
      { type: "speech-start", at: 300 },
      { type: "heard", transcript: "Star through right and left through", final: true, at: 900 },
    );
    expect(s.trials[1]).toMatchObject({ matched: "right-and-left-thru", early: "right-and-left-thru", firstMatchAt: 900, carried: 2 });
  });
});

describe("chain mode", () => {
  const chain: ChainPrompt = {
    start: "squared-set",
    steps: [
      { id: "lead-right", say: "heads lead right", to: "eight-chain-thru" },
      { id: "pass-thru", say: "pass thru", to: "trade-by" },
    ],
  };
  const start = () => run(initialSession(null, "web-speech"), { type: "listening", on: true }, { type: "mode", mode: "chain" }, { type: "chain", chain });

  it("records every call named, each at the moment it was first named, and a segment per pause", () => {
    const s = run(
      start(),
      { type: "speech-start", at: 0 },
      { type: "heard", transcript: "heads lead", final: false, at: 300 },
      { type: "speech-end", at: 600 },
      { type: "heard", transcript: "heads lead right", final: false, at: 700 },
      { type: "speech-start", at: 900 },
      { type: "heard", transcript: "heads lead right pass", final: false, at: 1000 },
      { type: "speech-end", at: 1300 },
      { type: "heard", transcript: "heads lead right pass thru", final: false, at: 1450 },
      { type: "heard", transcript: "Heads lead right, pass through.", final: true, at: 2500 },
    );
    const t = s.trials[0];
    expect(t).toMatchObject({
      target: null,
      chain: ["lead-right", "pass-thru"],
      calls: [{ id: "lead-right", at: 700 }, { id: "pass-thru", at: 1450 }],
      segments: [{ start: 0, end: 600 }, { start: 900, end: 1300 }],
    });
    expect(t === undefined ? null : perCallLatency(t)).toEqual([100, 150]);
    const sum = summariseChains(s);
    expect([sum.chains, sum.exact, sum.callsAsked, sum.callsInOrder, sum.segmented]).toEqual([1, 1, 2, 2, 1]);
    expect(sum.perCall.median).toBe(100);
    expect(sum.lastCall.median).toBe(150);
    // Chain trials don't count in the one-call summary.
    expect(summarise(s).trials).toBe(0);
  });

  it("a recogniser revising a call re-times it from the revision; the calls before keep their time", () => {
    const s = run(
      start(),
      { type: "heard", transcript: "lead right star thru", final: false, at: 100 },
      { type: "heard", transcript: "lead right pass thru", final: false, at: 200 },
    );
    expect(s.now.named).toEqual([
      { id: "lead-right", at: 100, exact: true, distance: 0, from: "squared-set" },
      { id: "pass-thru", at: 200, exact: true, distance: 0, from: "eight-chain-thru" },
    ]);
  });

  it("without a pause per call, there's no per-call latency, only the last call's", () => {
    const s = run(
      start(),
      { type: "speech-start", at: 0 },
      { type: "heard", transcript: "lead right pass thru", final: false, at: 900 },
      { type: "speech-end", at: 1000 },
      { type: "heard", transcript: "lead right pass thru", final: true, at: 2000 },
    );
    const sum = summariseChains(s);
    expect([sum.segmented, sum.perCall.n, sum.lastCall.median]).toEqual([0, 0, -100]);
  });

  it("a missed call costs only itself in the in-order count", () => {
    expect(inOrder(["a", "b", "c", "d"], ["a", "c", "d"])).toBe(3);
    expect(inOrder(["a", "b"], ["b", "a"])).toBe(1);
    expect(inOrder([], ["a"])).toBe(0);
  });
});

describe("chain prompts are chains a caller could call", () => {
  // A small seeded generator, so the property runs the same way every time.
  const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

  it("each call is Standard where the one before left the dancers, and ends where the step says", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const chain = makeChain(seeded(seed));
      let at: FormationId = chain.start;
      for (const step of chain.steps) {
        expect(callsFrom(at), `${step.id} from ${at}`).toContain(step.id);
        expect(endingsFrom(step.id as ApplicationCallId, at), `${step.id} from ${at}`).toContain(step.to);
        at = step.to;
      }
    }
  });

  it("what the page asks you to say is heard back as that call", () => {
    for (const at of Object.keys(STANDARD_APPLICATIONS).length > 0 ? (["squared-set", "eight-chain-thru", "facing-lines", "rh-parallel-waves", "rh-two-faced-lines", "trade-by", "double-pass-thru", "lines-facing-out"] as const) : []) {
      for (const step of nextSteps(at)) expect(matchCalls(step.say).map((m) => m.call.id), step.say).toEqual([step.id]);
    }
  });

  it("a chain is four different calls from a static square, and it moves the square", () => {
    let steps = 0;
    let moved = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const chain = makeChain(seeded(seed));
      expect(chain.start).toBe("squared-set");
      expect(chain.steps).toHaveLength(4);
      expect(new Set(chain.steps.map((st) => st.id)).size).toBe(4);
      let at: FormationId = chain.start;
      for (const st of chain.steps) {
        steps++;
        if (st.to !== at) moved++;
        at = st.to;
      }
      // Never four calls that leave the dancers where they began.
      expect(chain.steps.some((st) => st.to !== chain.start)).toBe(true);
    }
    // A call that keeps the formation is a fallback, mostly after Alamo Style: from an Alamo Ring
    // every sayable call with a known ending keeps it. 88% moved on 10-30.
    expect(moved / steps).toBeGreaterThan(0.85);
  });
});

describe("sound-alike: calls heard by how they sound, narrowed by what's legal", () => {
  const ids = (t: string, start: FormationId | null) => hearCalls(t, start).map((h) => h.call.id);

  it("spellings of one sound share a key", () => {
    expect(soundKey("passed")).toBe(soundKey("pass"));
    expect(soundKey("squared")).toBe(soundKey("square"));
    expect(editDistance(soundKey("view"), soundKey("veer"))).toBe(1);
    expect(soundKey("1/4")).toBe("1/4");
  });

  // The chain run, 10-30 (3): what Safari wrote, and the chain asked. All from a Static Square.
  const RUN: readonly [string, readonly string[]][] = [
    ["Circle right Amo style swing through left swing through", ["circle-right", "alamo-style", "swing-thru", "left-swing-thru"]],
    ["Heads lead left dive through centers passed through touch quarter", ["lead-left", "dive-thru", "pass-thru", "touch-a-quarter"]],
    ["Alma left touch a quarter left swing through swing through", ["allemande-left", "touch-a-quarter", "left-swing-thru", "swing-thru"]],
    ["Head square through four star through slide through dive through", ["square-thru", "star-thru", "slide-thru", "dive-thru"]],
    ["On a man left touch a quarter left swing through swing through", ["allemande-left", "touch-a-quarter", "left-swing-thru", "swing-thru"]],
    ["Head slide through double pass through first couple go left next go right past the ocean", ["slide-thru", "double-pass-thru", "first-couple-go-left", "pass-the-ocean"]],
    ["Head slide through centers passed through view to the left wheel and deal", ["slide-thru", "pass-thru", "veer-left", "wheel-and-deal"]],
    // Said with its last call cut off by the split (fixed separately): three of four.
    ["Head squared through four right left grand promenade", ["square-thru", "right-and-left-grand", "promenade"]],
  ];

  it("hears every chain of the 10-30 run as asked (exact matching alone heard 1 of 9)", () => {
    for (const [said, asked] of RUN) expect(ids(said, "squared-set"), said).toEqual(asked);
  });

  it("between the limits, legality decides: \"promenading\" (0.27 from Promenade)", () => {
    expect(ids("promenading", "squared-set")).toEqual(["promenade"]);
    expect(ids("promenading", "rh-two-faced-lines")).toEqual([]);
  });

  it("a close enough sound is heard anywhere, and the closest sound wins over a legal one", () => {
    // Bend the Line isn't legal from a Static Square, but "lion" sounds exactly like "line".
    expect(ids("bend the lion", "squared-set")).toEqual(["bend-the-line"]);
    // From two-faced lines Veer Right is legal (0.29) and Veer Left isn't, but "lift" is "left".
    expect(ids("veer lift", "rh-two-faced-lines")).toEqual(["veer-left"]);
    // "ferry wheel": Ferris Wheel (0.11) over Flutterwheel (0.30, legal from a Static Square).
    expect(ids("ferry wheel", "squared-set")).toEqual(["ferris-wheel"]);
    // The noisy run (10-30 (10)): a floor gone wrong doesn't make a clear sound unhearable.
    expect(ids("Through three Allaman left", "double-pass-thru")).toEqual(["allemande-left"]);
  });

  it("an exact spelling is taken anywhere: a caller may call an Extended application", () => {
    expect(ids("ferris wheel", "squared-set")).toEqual(["ferris-wheel"]);
  });

  it("a loose match gives way to a closer one a word later (\"centers passed\" isn't \"centers zoom\")", () => {
    expect(ids("centers passed through", "double-pass-thru")).toEqual(["pass-thru"]);
  });

  it("without a formation, only close sounds: the first run's misses, but not \"Dodo\"", () => {
    expect(ids("Allaman left", null)).toEqual(["allemande-left"]);
    expect(ids("Passed through", null)).toEqual(["pass-thru"]);
    expect(ids("California tour", null)).toEqual(["california-twirl"]);
    expect(ids("Dodo", null)).toEqual([]);
    expect(ids("hello there", null)).toEqual([]);
  });

  it("a sound that matches exactly is still marked as heard by sound (10-30 (5): \"starred through\")", () => {
    const [h] = hearCalls("centers starred through", null);
    expect([h?.call.id, h?.exact, h?.distance]).toEqual(["star-thru", false, 0]);
    expect(hearCalls("star thru", null)[0]?.exact).toBe(true);
  });

  it("each call heard moves the formation on, so the next is judged from there", () => {
    const heard = hearCalls("heads lead right pass thru", "squared-set");
    expect(heard.map((h) => h.from)).toEqual(["squared-set", "eight-chain-thru"]);
  });
});

describe("a chain isn't split by an early final", () => {
  const chain: ChainPrompt = {
    start: "squared-set",
    steps: [
      { id: "square-thru", say: "heads square thru four", to: "eight-chain-thru" },
      { id: "right-and-left-grand", say: "right and left grand", to: "rlg-circle" },
      { id: "promenade", say: "promenade", to: "promenade" },
      { id: "wheel-around", say: "heads wheel around", to: "facing-lines" },
    ],
  };
  const start = () => run(initialSession(null, "web-speech"), { type: "listening", on: true }, { type: "mode", mode: "chain" }, { type: "chain", chain });

  it("a final while the meter hears speech keeps the trial open; the next results add to it", () => {
    const s = run(
      start(),
      { type: "speech-start", at: 0 },
      { type: "heard", transcript: "Head squared through four right left grand promenade", final: true, at: 6489 },
      { type: "heard", transcript: "Heads wheel around", final: false, at: 7000 },
      { type: "speech-end", at: 7200 },
      { type: "heard", transcript: "Heads wheel around", final: true, at: 9000 },
    );
    expect(s.trials).toHaveLength(1);
    expect(s.trials[0]).toMatchObject({
      transcript: "Head squared through four right left grand promenade Heads wheel around",
      chain: ["square-thru", "right-and-left-grand", "promenade", "wheel-around"],
    });
    expect(s.trials[0]?.calls.map((c) => c.id)).toEqual(["square-thru", "right-and-left-grand", "promenade", "wheel-around"]);
  });

  it("once every call is heard, a final ends it even mid-speech, and the speech goes to the next", () => {
    const s = run(
      start(),
      { type: "speech-start", at: 0 },
      { type: "heard", transcript: "heads square thru four right and left grand promenade heads wheel around", final: true, at: 5000 },
    );
    expect(s.trials).toHaveLength(1);
    expect([s.now.speechStart, s.now.segments]).toEqual([0, [{ start: 0, end: null }]]);
  });

  it("outside chain mode a final still ends the trial", () => {
    const s = run(initialSession("pass-thru", "web-speech"), { type: "listening", on: true }, { type: "speech-start", at: 0 }, { type: "heard", transcript: "pass thru", final: true, at: 900 });
    expect(s.trials).toHaveLength(1);
  });
});

describe("re-sync: a call with one ending everywhere puts an unknown floor back (10-30 (10))", () => {
  it("the noisy run's calls that always end in one place qualify", () => {
    expect(FIXED_ENDING.get("allemande-left")).toBe("rlg-circle");
    expect(FIXED_ENDING.get("lead-right")).toBe("eight-chain-thru");
    expect(FIXED_ENDING.get("circle-to-a-line")).toBe("facing-lines");
    expect(FIXED_ENDING.get("ferris-wheel")).toBe("double-pass-thru");
    // Not a call that keeps the formation, or one with an ending that depends.
    expect(FIXED_ENDING.has("dosado")).toBe(false);
    expect(FIXED_ENDING.has("separate")).toBe(false);
  });

  it("after Separate the floor is unknown; Allemande Left brings it back", () => {
    const heard = hearCalls("heads separate around one to a line pass thru allemande left", "squared-set");
    expect(heard.map((h) => h.to)).toEqual([null, null, ["rlg-circle"]]);
  });

  it("a call that isn't Standard where the floor is still re-syncs, if its ending is fixed", () => {
    // Circle to a Line is Standard only from Eight Chain Thru, but it always ends in facing lines.
    expect(hearCalls("circle to a line", "rh-parallel-waves")[0]?.to).toEqual(["facing-lines"]);
  });

  it("in free mode, the floor comes back on the next utterance", () => {
    let s = run(initialSession(null, "web-speech"), { type: "listening", on: true }, { type: "mode", mode: "free" });
    s = run(s, { type: "heard", transcript: "heads separate around one to a line", final: true, at: 100 });
    expect(s.floor).toBeNull();
    s = run(s, { type: "heard", transcript: "allemande left", final: true, at: 900 });
    expect(s.floor).toEqual(["rlg-circle"]);
  });
});

describe("every recogniser result is kept on the trial (10-30 (10))", () => {
  it("interims and the final, in order, with their times", () => {
    const s = run(
      initialSession(null, "web-speech"),
      { type: "listening", on: true },
      { type: "mode", mode: "free" },
      { type: "heard", transcript: "head star", final: false, at: 100 },
      { type: "heard", transcript: "heads star thru", final: false, at: 300 },
      { type: "heard", transcript: "Heads star thru.", final: true, at: 2000 },
    );
    expect(s.trials[0]?.results.map((r) => [r.at, r.final])).toEqual([[100, false], [300, false], [2000, true]]);
  });

  it("a chain held open by an early final keeps the results from both parts", () => {
    const s = run(
      initialSession(null, "web-speech"),
      { type: "listening", on: true },
      { type: "mode", mode: "chain" },
      { type: "chain", chain: { start: "squared-set", steps: [{ id: "lead-right", say: "heads lead right", to: "eight-chain-thru" }, { id: "pass-thru", say: "pass thru", to: "trade-by" }] } },
      { type: "speech-start", at: 0 },
      { type: "heard", transcript: "heads lead right", final: true, at: 900 },
      { type: "speech-end", at: 1500 },
      { type: "heard", transcript: "pass thru", final: true, at: 2500 },
    );
    expect(s.trials).toHaveLength(1);
    expect(s.trials[0]?.results.map((r) => r.text)).toEqual(["heads lead right", "pass thru"]);
  });
});

describe("free mode is a live floor", () => {
  const free = () => run(initialSession(null, "web-speech"), { type: "listening", on: true }, { type: "mode", mode: "free" });
  const say = (s: VoiceSession, transcript: string, at: number) =>
    run(s, { type: "speech-start", at }, { type: "speech-end", at: at + 500 }, { type: "heard", transcript, final: true, at: at + 900 });

  it("starts at a static square and follows each utterance's last call into the next", () => {
    let s = free();
    expect(s.floor).toEqual(["squared-set"]);
    s = say(s, "heads lead right", 0);
    expect(s.floor).toEqual(["eight-chain-thru"]);
    // Loose, and only legal from Eight Chain Thru: heard because the floor carried over.
    s = say(s, "view to the left", 2000);
    expect(s.trials[1]?.calls).toMatchObject([{ id: "veer-left", exact: false, from: "eight-chain-thru" }]);
    expect(s.floor).toEqual(["rh-two-faced-lines"]);
    s = say(s, "ferry wheel", 4000);
    expect(s.trials[2]?.calls.map((c) => c.id)).toEqual(["ferris-wheel"]);
    expect(s.trials[2]?.floor).toEqual(["rh-two-faced-lines"]);
    expect(s.floor).toEqual(["double-pass-thru"]);
  });

  it("an utterance with no call leaves the floor where it was", () => {
    const s = say(say(free(), "heads lead right", 0), "mumble", 2000);
    expect(s.floor).toEqual(["eight-chain-thru"]);
  });

  it("a call with no known ending leaves the floor unknown until a reset; calls are then heard from nowhere", () => {
    let s = say(free(), "u turn back", 0);
    expect(s.floor).toBeNull();
    // Close enough to pass the strict limit too (0.14), but with no formation behind it.
    s = say(s, "view to the left", 2000);
    expect(s.trials[1]?.calls).toMatchObject([{ id: "veer-left", exact: false, from: null }]);
    expect(s.floor).toBeNull();
    s = run(s, { type: "floor-reset" });
    expect(s.floor).toEqual(["squared-set"]);
  });

  it("\"Dodo\" (0.33 from Dosado) isn't heard even where Dosado is legal: LOOSE is 0.30", () => {
    expect(hearCalls("Dodo", "eight-chain-thru")).toEqual([]);
  });

  it("entering free mode resets the floor", () => {
    const s = run(say(free(), "u turn back", 0), { type: "mode", mode: "prompt" }, { type: "mode", mode: "free" });
    expect(s.floor).toEqual(["squared-set"]);
  });

  it("the summary times the last call of each utterance, and counts calls heard by sound", () => {
    const s = say(say(free(), "heads lead right pass thru", 0), "traded by", 2000);
    const sum = summarise(s);
    expect([sum.freeCalls, sum.freeBySound, sum.freeLastCall.n]).toEqual([3, 1, 2]);
    expect(sum.freeLastCall.median).toBe(400);
  });
});
