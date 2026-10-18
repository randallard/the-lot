import { describe, expect, it } from "vitest";
import type { Keyframe } from "./pose-events";
import {
  editsHere,
  initialSession,
  keyframeHere,
  keyframeToKeep,
  reduce,
  setHere,
  type Action,
  type Session,
} from "./review2-session";

const SCOPE = "california-twirl/player-myco";
const LOADED = "player-myco|california-twirl";
const run = (...actions: Action[]): Session => actions.reduce(reduce, initialSession(SCOPE, LOADED));
const COUPLES = ["player-myco", "ember-ember", "myco-sprout", "a-b", "c-d", "e-f", "g-h", "i-j"];
const kf = (t: number, set: Record<string, number>): Keyframe => ({ t, values: { ...set, "0.head.nod": 1 }, setKeys: Object.keys(set) });

describe("the posing session", () => {
  it("steps by tenths, snapped to the grid, and each step is a seek", () => {
    const s = run({ type: "step", dir: 1, from: 0.13 });
    expect(s.t).toBeCloseTo(0.2);
    expect(s.seekToken).toBe(1);
    expect(run({ type: "step", dir: -1, from: 0.2 }).t).toBeCloseTo(0.1);
    expect(run({ type: "step", dir: -1, from: 0 }).t).toBe(0);
    expect(run({ type: "step", dir: 1, from: 1 }).t).toBe(1);
  });

  it("pausing takes the floor's moment without telling the floor to move", () => {
    const s = run({ type: "play" }, { type: "pause", at: 0.42 });
    expect(s).toMatchObject({ playing: false, t: 0.42, seekToken: 0 });
  });

  it("🔑 edits belong to their moment: leaving drops them with a notice, staying keeps them", () => {
    const edited = run({ type: "seek", to: 0.3 }, { type: "edit", key: "0.torso.lean-fwd", value: 12 });
    expect(editsHere(edited)).toEqual({ "0.torso.lean-fwd": 12 });
    expect(editsHere(reduce(edited, { type: "seek", to: 0.3 }))).toEqual({ "0.torso.lean-fwd": 12 });
    const moved = reduce(edited, { type: "seek", to: 0.4 });
    expect(editsHere(moved)).toEqual({});
    expect(moved.notice?.text).toMatch(/1 dial change not kept/);
    expect(reduce(edited, { type: "play" }).notice?.text).toMatch(/not kept/);
  });

  it("edits on one timeline don't show on another, and switching drops them", () => {
    const edited = run({ type: "edit", key: "couple.width", value: 90 });
    const only = reduce(edited, { type: "retarget", scope: `${SCOPE}/only`, loaded: LOADED, focus: "player-myco" });
    expect(editsHere(only)).toEqual({});
    expect(only.notice).not.toBeNull();
  });

  it("a new pairing clears the selection (new meshes); a scope change on the same pairing keeps it", () => {
    const picked = run({ type: "select", selected: { dancer: 1, part: "head" } });
    expect(reduce(picked, { type: "retarget", scope: `${SCOPE}/only`, loaded: LOADED, focus: "player-myco" }).selected).not.toBeNull();
    expect(reduce(picked, { type: "retarget", scope: "dosado/ember-ember", loaded: "ember-ember|dosado", focus: "ember-ember" }).selected).toBeNull();
  });

  it("🔑 the keyframe under the playhead is derived, so keyframes that load late still match (the reload case)", () => {
    const s = run({ type: "seek", to: 0.5 });
    expect(keyframeHere(s, [])).toBeUndefined();
    const timeline = [{ keyframe: kf(0.5, { "0.torso.turn": 5 }), source: "draft" }];
    expect(keyframeHere(s, timeline)?.keyframe.t).toBe(0.5);
    expect(keyframeHere(reduce(s, { type: "play" }), timeline)).toBeUndefined();
    expect(keyframeHere(s, [{ ...timeline[0]!, source: "hidden" }])).toBeUndefined();
  });

  it("what's set here is the keyframe's values with edits over them, and a null edit un-sets one", () => {
    const kept = kf(0.5, { a: 1, b: 2 });
    expect(setHere(kept, {})).toEqual({ a: 1, b: 2 });
    expect(setHere(kept, { b: 7, c: 3 })).toEqual({ a: 1, b: 7, c: 3 });
    expect(setHere(kept, { a: null })).toEqual({ b: 2 });
    const k = keyframeToKeep(0.5004, { a: 0, z: 9 }, setHere(kept, { a: null }));
    expect(k).toEqual({ t: 0.5, values: { a: 0, z: 9, b: 2 }, setKeys: ["b"] });
  });

  it("nudging the width starts from what's shown and stays in bounds", () => {
    const s = run({ type: "nudge", key: "couple.width", by: 2, base: 99, min: 0, max: 100 });
    expect(editsHere(s)["couple.width"]).toBe(100);
    expect(editsHere(reduce(s, { type: "nudge", key: "couple.width", by: -2, base: 99, min: 0, max: 100 }))["couple.width"]).toBe(98);
  });

  it("a stale notice timer can't dismiss a newer notice", () => {
    const s = run({ type: "notify", text: "one" }, { type: "notify", text: "two" });
    expect(reduce(s, { type: "dismissNotice", n: 1 }).notice?.text).toBe("two");
    expect(reduce(s, { type: "dismissNotice", n: 2 }).notice).toBeNull();
  });

  it("the disk re-forms round the new focus on retarget, and the focus couple doesn't move", () => {
    const s0 = initialSession(SCOPE, LOADED, COUPLES, "player-myco");
    expect(s0.layout["player-myco"]).toEqual([0, 0]);
    const at = s0.layout["e-f"];
    const s1 = reduce(s0, { type: "retarget", scope: "california-twirl/e-f", loaded: "e-f|california-twirl", focus: "e-f" });
    expect(s1.layout["e-f"]).toEqual(at);
    expect(new Set(Object.values(s1.layout).map(String)).size).toBe(COUPLES.length);
  });

  it("spacing nudges in steps and stays in bounds", () => {
    const s0 = initialSession(SCOPE, LOADED, COUPLES, "player-myco");
    expect(reduce(s0, { type: "spacing", by: 0.25 }).spacing).toBe(3.25);
    let s = s0;
    for (let i = 0; i < 100; i++) s = reduce(s, { type: "spacing", by: -0.25 });
    expect(s.spacing).toBe(1.5);
  });
});
