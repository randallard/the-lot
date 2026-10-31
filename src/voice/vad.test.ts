import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MIN_SEGMENT_MS, VAD_START, vadStep, type VadEvent } from "./vad";

const DT = 10;
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

/** Level samples every 10 ms: room noise (± 30 %), plus whatever `extra` adds at time t. */
function signal(ms: number, noise: number, extra: (t: number) => number = () => 0, seed = 7): number[] {
  const rand = seeded(seed);
  return Array.from({ length: ms / DT }, (_, i) => {
    const t = i * DT;
    const n = noise * (0.7 + 0.6 * rand());
    return Math.max(n, extra(t));
  });
}

function segments(levels: readonly number[]): { start: number; end: number | null }[] {
  let s = VAD_START;
  const events: VadEvent[] = [];
  levels.forEach((level, i) => {
    const r = vadStep(s, level, i * DT);
    s = r.state;
    events.push(...r.events);
  });
  const out: { start: number; end: number | null }[] = [];
  for (const e of events) {
    if (e.type === "speech-start") out.push({ start: e.at, end: null });
    else { const last = out[out.length - 1]; if (last !== undefined) last.end = e.at; }
  }
  return out;
}

const burst = (from: number, to: number, level: number) => (t: number) => (t >= from && t < to ? level : 0);

describe("🧪 vad: where speech starts and ends, in noise (10-30 (12))", () => {
  it("a steady room, quiet or noisy, is never speech", () => {
    expect(segments(signal(10000, 0.01))).toEqual([]);
    expect(segments(signal(10000, 0.05))).toEqual([]);
  });

  it("speech in noise is one segment, its edges within a sample or two", () => {
    const [seg, ...rest] = segments(signal(5000, 0.02, burst(2000, 3000, 0.12)));
    expect(rest).toEqual([]);
    expect(seg?.start).toBeGreaterThanOrEqual(2000);
    expect(seg?.start).toBeLessThanOrEqual(2020);
    expect(seg?.end).toBeGreaterThanOrEqual(2980);
    expect(seg?.end).toBeLessThanOrEqual(3000);
  });

  it("clicks and bumps (10–40 ms spikes) don't open a segment: the old meter's zero-length ones", () => {
    const clicks = (t: number) => (t % 700 < 10 ? 0.3 : t % 1900 < 40 ? 0.2 : 0);
    expect(segments(signal(10000, 0.02, clicks))).toEqual([]);
  });

  it("a soft voice, 3.3× the room, is heard", () => {
    expect(segments(signal(4000, 0.015, burst(1000, 2000, 0.05)))).toHaveLength(1);
  });

  it("dips between syllables don't split a call; a real pause between calls does", () => {
    // 150 ms dips to the room's level inside a second of speech.
    const syllables = (t: number) => (t >= 1000 && t < 2000 && t % 400 >= 150 ? 0.1 : 0);
    expect(segments(signal(4000, 0.02, syllables))).toHaveLength(1);
    const twoCalls = (t: number) => ((t >= 1000 && t < 1800) || (t >= 2400 && t < 3200) ? 0.1 : 0);
    expect(segments(signal(5000, 0.02, twoCalls))).toHaveLength(2);
  });

  it("twenty seconds of calls with short gaps stays heard, and ends when it stops", () => {
    const calling = (t: number) => (t >= 1000 && t < 21000 && t % 1000 < 800 ? 0.1 : 0);
    const segs = segments(signal(25000, 0.02, calling));
    // The 200 ms gaps are inside the hangover: one segment, and it ends near 20.8 s.
    expect(segs).toHaveLength(1);
    expect(segs[0]?.end).toBeGreaterThanOrEqual(20700);
    expect(segs[0]?.end).toBeLessThanOrEqual(20800);
  });

  it("a room that gets louder for good is caught up with, not heard as speech forever", () => {
    const louder = (t: number) => (t >= 5000 ? 0.06 : 0);
    const segs = segments(signal(90000, 0.01, louder));
    expect(segs.length).toBeLessThanOrEqual(1);
    for (const s of segs) expect(s.end).not.toBeNull();
    // And speech in the louder room is still heard.
    const after = signal(95000, 0.01, (t) => Math.max(louder(t), burst(92000, 93000, 0.3)(t)));
    expect(segments(after).some((s) => s.start >= 92000 && s.start <= 92100)).toBe(true);
  });

  it("over any levels, events alternate start/end, each segment lasts the minimum, and times move forward", () => {
    fc.assert(fc.property(fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { maxLength: 400 }), (levels) => {
      let s = VAD_START;
      const events: VadEvent[] = [];
      levels.forEach((level, i) => { const r = vadStep(s, level, i * DT); s = r.state; events.push(...r.events); });
      events.forEach((e, k) => {
        expect(e.type).toBe(k % 2 === 0 ? "speech-start" : "speech-end");
        if (e.type === "speech-end") expect(e.at - (events[k - 1]?.at ?? 0)).toBeGreaterThanOrEqual(MIN_SEGMENT_MS);
        if (k > 0) expect(e.at).toBeGreaterThanOrEqual(events[k - 1]?.at ?? 0);
      });
    }));
  });
});
