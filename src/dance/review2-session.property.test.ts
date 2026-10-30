/**
 * Properties of `#review2`'s reducer over arbitrary action sequences (ADR-1017; the-lot ADR-0065).
 * The example tests in `review2-session.test.ts` pin particular stories; these say what holds after
 * any sequence of the screen's actions.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { PartId } from "./pose-dials";
import { PANEL_OPACITY_MIN, reduce, initialSession, sameMoment, SPACING, type Action, type Session } from "./review2-session";

const COUPLES = ["ember-ember", "ember-myco", "player-ryan", "myco-player"] as const;
const PARTS: readonly PartId[] = ["torso", "head", "upper-arm-left", "upper-arm-right", "forearm-left", "forearm-right", "hand-left", "hand-right"];
const SCOPES = ["twirl/ember-ember", "twirl/ember-myco", "star-thru/player-ryan", "twirl/ember-ember/only"] as const;
const DIALS = ["head.yaw", "torso.lean", "arm.left.lift", "arm.right.lift"] as const;

/** Any number the screen might pass: ordinary, out of range, and the awkward ones. */
const num = fc.oneof(fc.double({ min: -2, max: 3, noNaN: true }), fc.constantFrom(0, 1, Infinity, -Infinity));

const action: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ scope: fc.constantFrom(...SCOPES), loaded: fc.constantFrom("twirl|ee", "twirl|em", "star|pr"), focus: fc.constantFrom(...COUPLES) }).map((r): Action => ({ type: "retarget", ...r })),
  num.map((by): Action => ({ type: "spacing", by })),
  fc.record({ figure: fc.constantFrom("twirl", "star-thru"), pairing: fc.constantFrom(...COUPLES), t: fc.double({ min: 0, max: 1, noNaN: true }), on: fc.boolean() }).map((r): Action => ({ type: "mute", ...r })),
  fc.constantFrom<Action>({ type: "repose" }, { type: "play" }, { type: "loop" }, { type: "wrapped" }, { type: "closePart" }, { type: "toggleDrawer" }, { type: "toggleTop" }, { type: "escape" }),
  num.map((to): Action => ({ type: "seek", to })),
  fc.record({ dir: fc.constantFrom<1 | -1>(1, -1), from: fc.double({ min: 0, max: 1, noNaN: true }) }).map((r): Action => ({ type: "step", ...r })),
  num.map((at): Action => ({ type: "pause", at })),
  fc.record({ key: fc.constantFrom(...DIALS), value: fc.option(fc.double({ min: -3, max: 3, noNaN: true }), { nil: null }) }).map((r): Action => ({ type: "edit", ...r })),
  fc.record({ key: fc.constantFrom(...DIALS), by: fc.double({ min: -1, max: 1, noNaN: true }), base: fc.double({ min: -1, max: 1, noNaN: true }) }).map((r): Action => ({ type: "nudge", ...r, min: -1, max: 1 })),
  fc.double({ min: 0, max: 1, noNaN: true }).map((at): Action => ({ type: "kept", at })),
  fc.record({ dancer: fc.integer({ min: 0, max: 1 }), part: fc.constantFrom(...PARTS) }).map((selected): Action => ({ type: "select", selected })),
  fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }).map((at): Action => ({ type: "openFrame", at })),
  num.map((value): Action => ({ type: "panelOpacity", value })),
  fc.boolean().map((on): Action => ({ type: "setEverything", on })),
  fc.constantFrom("solver", "keyframes").map((mode): Action => ({ type: "setMode", mode })),
  fc.boolean().map((on): Action => ({ type: "handsOnArc", on })),
  fc.constantFrom("coin", "reshape", "break").map((to): Action => ({ type: "accommodation", to })),
  fc.boolean().map((on): Action => ({ type: "baked", on })),
  fc.boolean().map((on): Action => ({ type: "allCouples", on })),
  fc.boolean().map((on): Action => ({ type: "turnAround", on })),
  fc.string({ maxLength: 10 }).map((text): Action => ({ type: "notify", text })),
  fc.integer({ min: 0, max: 5 }).map((n): Action => ({ type: "dismissNotice", n })),
);

const runs = fc.array(action, { maxLength: 60 }).map((actions) => {
  const states: Session[] = [initialSession(SCOPES[0], "twirl|ee", COUPLES, COUPLES[0])];
  for (const a of actions) states.push(reduce(states[states.length - 1] ?? states[0] as Session, a));
  return { states, actions };
});

describe("#review2's reducer, over arbitrary action sequences", () => {
  it("the moment, the spacing and the card's opacity stay in range", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      for (const s of states) {
        expect(s.t >= 0 && s.t <= 1).toBe(true);
        expect(s.spacing >= SPACING.min && s.spacing <= SPACING.max).toBe(true);
        expect(s.panelOpacity >= PANEL_OPACITY_MIN && s.panelOpacity <= 1).toBe(true);
      }
    }));
  });

  it("the floor is never told to stand somewhere older: the seek token never goes down", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      states.forEach((s, i) => { if (i > 0) expect(s.seekToken).toBeGreaterThanOrEqual(states[i - 1]?.seekToken ?? 0); });
    }));
  });

  it("unkept edits are never carried while playing, or into another timeline", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      for (const s of states) {
        if (s.edits === null) continue;
        expect(s.playing).toBe(false);
        expect(s.edits.scope).toBe(s.scope);
      }
    }));
  });

  it("unkept edits belong to the moment the playhead is on", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      for (const s of states) if (s.edits !== null) expect(sameMoment(s.edits.at, s.t)).toBe(true);
    }));
  });

  it("only the turned loop's own switch turns a loop round", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      for (const s of states) if (s.turned) expect(s.turnAround).toBe(true);
    }));
  });

  it("every couple on the floor has a place, and a notice's counter only goes up", () => {
    fc.assert(fc.property(runs, ({ states }) => {
      let n = 0;
      for (const s of states) {
        for (const c of s.couples) expect(s.layout[c]).toBeDefined();
        if (s.notice !== null) {
          expect(s.notice.n).toBeGreaterThanOrEqual(n);
          n = s.notice.n;
        }
      }
    }));
  });
});
