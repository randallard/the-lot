import { describe, expect, it } from "vitest";
import { defined } from "../test/defined";
import { getBodyShape } from "../services/body-shapes";
import { bodyPrint } from "./baked-tracks";
import { decodeRows, dialsAt, encodeRows, FIELDS, fourFileName, type FourBake } from "./baked-four";
import { reviewPairings } from "./review-route";
import { isSolved, REVIEW2_FIGURES } from "./review2-figures";

// Typed `string`: Right and Left Thru is the only solved figure today, which makes the comparison
// look constant to the type checker; it stops being so when a second one is solved.
const RLT: string = "right-and-left-thru";
const RLT_BEATS = REVIEW2_FIGURES.find((f) => isSolved(f) && f.solved === RLT)?.beats ?? 0;
import { rightAndLeftThru } from "./whole-move-rlt";

const files = import.meta.glob("./baked-four/*.json", { eager: true, import: "default" });

describe("four-dancer bakes (2026-10-28)", () => {
  it("round-trips a move's frames to a tenth of a millimetre", () => {
    const shapes = ["ryan", "sprout", "myco", "ember"].map((id) => getBodyShape(id));
    const frames = rightAndLeftThru(shapes, { perBeat: 2 }).frames;
    const rows = encodeRows(frames);
    expect(rows[0]).toHaveLength(4 * FIELDS);
    const back = decodeRows(rows);
    frames.forEach((f, i) => f.forEach((d, k) => {
      const e = defined(defined(back[i], "back[i]")[k], "k");
      expect(Math.abs(e.x - d.x)).toBeLessThan(6e-5);
      expect(Math.abs(e.yaw - d.yaw)).toBeLessThan(6e-5);
      expect(Math.abs(e.arms[1].flen - d.arms[1].flen)).toBeLessThan(6e-5);
    }));
    // Every dancer's floor spot, in cm, for `applyToRigs`.
    expect(dialsAt(back, 2, 0)["3.torso.x"]).toBeCloseTo(defined(defined(frames[0], "frames[0]")[3], "3").x * 100, 1);
  });

  it("🔴 has a bake for every review pairing, solved on today's bodies", () => {
    // `#review2` solves a set with no bake when it's drawn, ≈3.5 s on the main thread each, so a
    // body reshaped without re-baking (`bake-four.ts`) freezes the screen once per set it touches.
    for (const p of reviewPairings()) {
      const cast = [p.beau, p.belle, p.beau, p.belle];
      const file = fourFileName("right-and-left-thru", cast);
      const bake = files[`./baked-four/${file}`] as FourBake | undefined;
      expect(bake, file).toBeDefined();
      if (bake === undefined) continue;
      expect(bake.bodies, file).toEqual(cast.map((id) => bodyPrint(getBodyShape(id))));
      // As long as the figure that plays it (the engine's 6 beats since 10-28; it was 8).
      expect(bake.rows).toHaveLength(RLT_BEATS * bake.perBeat + 1);
    }
  });
});
