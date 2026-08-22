import { describe, expect, it } from "vitest";
import { bodyMeshScale } from "./dancer-mesh";
import {
  MYCO_DEFAULTS,
  SPROUT_DEFAULTS,
  computePositions,
  NPC_BODY_CENTER_Y,
} from "../services/body-shapes";
import { growBody, standingLift } from "./accommodation";
import { EMBER_DEFAULTS } from "../services/body-shapes";

/** Where the drawn capsule's top ends up, given the scale applied to the built geometry. */
function meshTop(built: typeof MYCO_DEFAULTS, worn: typeof MYCO_DEFAULTS): number {
  const { height } = bodyMeshScale(built, worn);
  const halfBuilt = built.body.height / 2 + built.body.radius;
  return NPC_BODY_CENTER_Y + halfBuilt * height;
}

describe("bodyMeshScale — the torso stretches with the dancer wearing it", () => {
  it("is the identity when nothing has changed", () => {
    const s = bodyMeshScale(MYCO_DEFAULTS, MYCO_DEFAULTS);
    expect(s.radial).toBeCloseTo(1, 12);
    expect(s.height).toBeCloseTo(1, 12);
  });

  it("🔴 actually stretches when a reshape grows the body", () => {
    // The defect. `DanceFloor` divided the resolved height by the *reshaped* height — the same
    // number — so this came out 1 for the whole of every reshape, and the head and shoulders
    // (which follow model heights, and were right) lifted off a torso that never moved. Ryan,
    // watching Sprout grow: *"his head just pops up with his shoulders, leaving his body the
    // same on the ground."*
    const grown = growBody(SPROUT_DEFAULTS, 0.735);
    expect(bodyMeshScale(SPROUT_DEFAULTS, grown).height).toBeGreaterThan(1.5);
  });

  it("🔴 puts the drawn top exactly where the shoulders are, caps and all", () => {
    // A capsule is not a box: scaling Y by `h'/h` stretches the two hemispherical caps too, so
    // the mesh top would land at `(h/2 + r)·h'/h` while `computePositions` puts the shoulders at
    // `h'/2 + r` with the radius unscaled. On Sprout grown by 0.735 that is 0.245 of torso
    // standing proud of the arms hanging off it.
    for (const shape of [SPROUT_DEFAULTS, MYCO_DEFAULTS]) {
      for (const delta of [0, 0.2, 0.735, -0.15]) {
        const worn = growBody(shape, delta);
        const shoulders = computePositions(worn, NPC_BODY_CENTER_Y).shoulderY;
        expect(meshTop(shape, worn), `${String(delta)}`).toBeCloseTo(shoulders, 9);
      }
    }
  });

  it("shrinks as readily as it grows", () => {
    expect(bodyMeshScale(MYCO_DEFAULTS, growBody(MYCO_DEFAULTS, -0.15)).height).toBeLessThan(1);
  });
});

describe("standingLift — a body grows from where it stands", () => {
  // ADR-0043. Ryan: *"I really want the bottom to stay where it starts when the rest grows taller
  // — same with all the characters, Ember's body when it shrinks should still start below the
  // floor."*
  //
  // `computePositions` centres a body on `bodyCenterY`, so a height change of `d` splits itself
  // between the top and the **bottom**. Lifting the whole rig by half of it puts all of `d` into
  // the top and leaves the bottom alone.

  /** World Y of the underside of the drawn capsule, rig lift included. */
  const bottom = (built: typeof MYCO_DEFAULTS, delta: number): number => {
    const worn = growBody(built, delta);
    return standingLift(built, worn) + NPC_BODY_CENTER_Y - worn.body.height / 2 - worn.body.radius;
  };

  /** World Y of the top — which is where the shoulders are, by `computePositions`. */
  const top = (built: typeof MYCO_DEFAULTS, delta: number): number => {
    const worn = growBody(built, delta);
    return standingLift(built, worn) + computePositions(worn, NPC_BODY_CENTER_Y).shoulderY;
  };

  it("🔴 leaves the bottom exactly where it started, whatever the change", () => {
    for (const shape of [MYCO_DEFAULTS, SPROUT_DEFAULTS, EMBER_DEFAULTS]) {
      const rest = bottom(shape, 0);
      for (const delta of [0.05, 0.3, 0.735, 1.2, -0.1, -0.2]) {
        expect(bottom(shape, delta), `${String(delta)}`).toBeCloseTo(rest, 9);
      }
    }
  });

  it("🔴 and Ember still starts below the floor when she shrinks", () => {
    // Named because it is the case Ryan asked for by name, and because it is the one that says
    // this is *not* "put everybody's feet on the ground". Each character keeps their own
    // starting underside, wherever it happens to be.
    const rest = bottom(EMBER_DEFAULTS, 0);
    expect(rest).toBeLessThan(0);
    expect(bottom(EMBER_DEFAULTS, -0.5)).toBeCloseTo(rest, 9);
  });

  it("puts the whole change into the top, which is where the shoulders are", () => {
    for (const delta of [0.2, 0.735, -0.15]) {
      expect(top(MYCO_DEFAULTS, delta) - top(MYCO_DEFAULTS, 0)).toBeCloseTo(delta, 9);
    }
  });

  it("🔴 lifts by what the body TOOK, not by what was asked for", () => {
    // `growBody` clamps to the editor's bounds. Ember at 1.41 asked 0.735 takes 0.59, and a rig
    // lifted by half of 0.735 would float her off her own feet by 0.0725. Taking both shapes is
    // what makes that unwritable.
    const asked = 0.735;
    const worn = growBody(EMBER_DEFAULTS, asked);
    expect(worn.body.height).toBeLessThan(EMBER_DEFAULTS.body.height + asked);
    expect(standingLift(EMBER_DEFAULTS, worn)).toBeCloseTo(
      (worn.body.height - EMBER_DEFAULTS.body.height) / 2, 12,
    );
    expect(bottom(EMBER_DEFAULTS, asked)).toBeCloseTo(bottom(EMBER_DEFAULTS, 0), 9);
  });
});
