import { describe, expect, it } from "vitest";
import {
  lockedBehind,
  fromBundle,
  makeEvent,
  pairingTimeline,
  reduce,
  reviewFlag,
  timelinesOf,
  toBundle,
  type Keyframe,
  type PoseEvent,
  type PoseEventBody,
} from "./pose-events";

const F = "california-twirl";
const P = "player-myco";
const kf = (t: number, lean = 0): Keyframe => ({ t, values: { "0.torso.lean-fwd": lean }, setKeys: lean === 0 ? [] : ["0.torso.lean-fwd"] });

/** Events one second apart, so their order is the order written. */
function log(...bodies: PoseEventBody[]): PoseEvent[] {
  return bodies.map((b, i) => makeEvent(b, new Date(Date.UTC(2026, 9, 18, 12, 0, i)), `e${String(i).padStart(3, "0")}`));
}

describe("pose timelines", () => {
  it("(retired draft model, still read) apply copies the draft into general; later draft edits wait", () => {
    const s = reduce(log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2) },
      { kind: "applied", figure: F },
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.5) },
    ));
    const f = timelinesOf(s, F);
    expect(f.general.map((k) => k.t)).toEqual([0.2]);
    expect(f.draft.map((k) => k.t)).toEqual([0.2, 0.5]);
  });

  it("a pairing's own keyframe wins over general's at the same time, and clearing it brings general back", () => {
    const base = log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2, 0) },
      { kind: "applied", figure: F },
      { kind: "keyframe-set", figure: F, scope: { pairing: P }, keyframe: kf(0.2, 9) },
    );
    expect(pairingTimeline(timelinesOf(reduce(base), F), P).map((p) => p.source)).toEqual(["own"]);
    expect(pairingTimeline(timelinesOf(reduce(base), F), "ember-ember").map((p) => p.source)).toEqual(["general"]);
    const cleared = [...base, ...log({ kind: "override-cleared", figure: F, pairing: P, t: 0.2 }).map((e) => ({ ...e, id: `z${e.id}`, at: "2026-10-18T13:00:00.000Z" }))];
    expect(pairingTimeline(timelinesOf(reduce(cleared), F), P).map((p) => p.source)).toEqual(["general"]);
  });

  it("removing general's keyframe on one pairing hides it there only", () => {
    const s = reduce(log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.4) },
      { kind: "applied", figure: F },
      { kind: "keyframe-removed", figure: F, scope: { pairing: P }, t: 0.4 },
    ));
    expect(pairingTimeline(timelinesOf(s, F), P).map((p) => p.source)).toEqual(["hidden"]);
    expect(timelinesOf(s, F).general).toHaveLength(1);
  });

  it("🔑 a pairing with its own keyframes is flagged, and stale once general is applied after them", () => {
    const tuned = log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2) },
      { kind: "applied", figure: F },
      { kind: "keyframe-set", figure: F, scope: { pairing: P }, keyframe: kf(0.3, 5) },
    );
    expect(reviewFlag(timelinesOf(reduce(tuned), F), P)).toBe("custom");
    expect(reviewFlag(timelinesOf(reduce(tuned), F), "ember-ember")).toBe("none");
    const reapplied = [...tuned, makeEvent({ kind: "applied", figure: F }, new Date(Date.UTC(2026, 9, 18, 13)), "later")];
    expect(reviewFlag(timelinesOf(reduce(reapplied), F), P)).toBe("stale");
  });

  it("is a function of the event set: shuffled and duplicated events fold the same", () => {
    const events = log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.1) },
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.1, 3) },
      { kind: "applied", figure: F },
      { kind: "keyframe-removed", figure: F, scope: "draft", t: 0.1 },
    );
    const a = reduce(events);
    const b = reduce([...events].reverse().concat(events));
    expect(timelinesOf(b, F)).toEqual(timelinesOf(a, F));
    expect(timelinesOf(a, F).general[0]?.values["0.torso.lean-fwd"]).toBe(3);
    expect(timelinesOf(a, F).draft).toHaveLength(0);
  });

  it("a saved bundle loads back as the same events, and anything else is refused", () => {
    const events = log({ kind: "applied", figure: F });
    expect(fromBundle(JSON.stringify(toBundle(events)))).toEqual({ events });
    expect(fromBundle("{")).toHaveProperty("error");
    expect(fromBundle(JSON.stringify({ format: "branching-video-events", events }))).toHaveProperty("error");
  });

  it("🔑 a locked pairing keeps its timeline through a later apply to all, and refuses edits", () => {
    const events = log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2, 1) },
      { kind: "applied", figure: F },
      { kind: "keyframe-set", figure: F, scope: { pairing: P }, keyframe: kf(0.6, 4) },
      { kind: "locked", figure: F, pairing: P },
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2, 9) },
      { kind: "applied", figure: F },
      { kind: "keyframe-set", figure: F, scope: { pairing: P }, keyframe: kf(0.8, 2) },
    );
    const f = timelinesOf(reduce(events), F);
    const mine = pairingTimeline(f, P);
    expect(mine.map((p) => [p.keyframe.t, p.source])).toEqual([[0.2, "general"], [0.6, "own"]]);
    expect(mine[0]?.keyframe.values["0.torso.lean-fwd"]).toBe(1);
    expect(pairingTimeline(f, "ember-ember")[0]?.keyframe.values["0.torso.lean-fwd"]).toBe(9);
    expect(reviewFlag(f, P)).toBe("locked");
    expect(lockedBehind(f, P)).toBe(true);
  });

  it("unlocking goes back to the live timeline, which may have moved on", () => {
    const events = log(
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2, 1) },
      { kind: "applied", figure: F },
      { kind: "locked", figure: F, pairing: P },
      { kind: "keyframe-set", figure: F, scope: "draft", keyframe: kf(0.2, 9) },
      { kind: "applied", figure: F },
      { kind: "unlocked", figure: F, pairing: P },
    );
    const f = timelinesOf(reduce(events), F);
    expect(pairingTimeline(f, P)[0]?.keyframe.values["0.torso.lean-fwd"]).toBe(9);
    expect(reviewFlag(f, P)).toBe("none");
  });

  it("🔑 with nothing highlighted, an edit reaches every couple at once, except a locked one", () => {
    const events = log(
      { kind: "keyframe-set", figure: F, scope: "all", keyframe: kf(0.3, 1) },
      { kind: "locked", figure: F, pairing: P },
      { kind: "keyframe-set", figure: F, scope: "all", keyframe: kf(0.3, 7) },
      { kind: "keyframe-set", figure: F, scope: "all", keyframe: kf(0.9, 2) },
      { kind: "keyframe-removed", figure: F, scope: "all", t: 0.9 },
    );
    const f = timelinesOf(reduce(events), F);
    expect(pairingTimeline(f, "ember-ember").map((p) => p.keyframe.values["0.torso.lean-fwd"])).toEqual([7]);
    expect(pairingTimeline(f, P).map((p) => p.keyframe.values["0.torso.lean-fwd"])).toEqual([1]);
    expect(lockedBehind(f, P)).toBe(true);
  });

  it("a couple's own tuning goes stale when an all-couples edit lands after it", () => {
    const events = log(
      { kind: "keyframe-set", figure: F, scope: { pairing: P }, keyframe: kf(0.4, 3) },
      { kind: "keyframe-set", figure: F, scope: "all", keyframe: kf(0.1, 1) },
    );
    expect(reviewFlag(timelinesOf(reduce(events), F), P)).toBe("stale");
  });
});
