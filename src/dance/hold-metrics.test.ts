import { describe, expect, it } from "vitest";
import { FLAT_ENOUGH, holdMetrics } from "./hold-metrics";
import { getBodyShape } from "../services/body-shapes";
import { reviewPairings } from "./review-route";

const every = () => reviewPairings().map((p) => ({
  p,
  m: holdMetrics(getBodyShape(p.beau), getBodyShape(p.belle)),
}));

describe("the standing couple's handhold, measured", () => {
  it("✅ stacks the beau's hand under the belle's on every pairing", () => {
    // Ryan's rule, and the authored hold: "beau right palm up and belle's left palm down".
    // This half is right everywhere and has been since ADR-0027 — worth pinning precisely
    // because the interesting failure below is *not* this one, and a reader who saw only the
    // defect might assume the whole hold was wrong.
    for (const { p, m } of every()) {
      expect(m.stacked, `${p.beau}→${p.belle}`).toBe(true);
    }
  });

  it("puts each dancer's own palm surface on the contact plane", () => {
    // Tangency is by construction — `touchLift` settles each hand until its own surface lands
    // on `hold.height` — so this is a check that the construction is what it says, not a
    // measurement of luck. The centres are one half-rise either side, so the gap is the sum.
    for (const { p, m } of every()) {
      const rise = (m.hold.height - m.beau.centreY) + (m.belle.centreY - m.hold.height);
      expect(rise, `${p.beau}→${p.belle}`).toBeCloseTo(m.gap, 9);
      expect(m.gap).toBeGreaterThan(0);
    }
  });

  it("✅ THE DEFECT IS FIXED: the palms now meet face to face", () => {
    // This was written on 2026-09-07 to fail when ADR-0052 landed, and it has. Before the
    // wrist: 2 of 40 palms face on, six exactly on the rim, median flatness 0.86. After it,
    // every pairing is inside the target on both hands.
    const failing = every().filter(
      ({ m }) => m.beau.flatness > FLAT_ENOUGH || m.belle.flatness > FLAT_ENOUGH,
    );
    expect(failing.map(({ p }) => `${p.beau}/${p.belle}`)).toEqual([]);
  });

  it("✅ closes the gap to something a handhold could have", () => {
    // Centre-to-centre against the flat-palm ideal — the sum of the two half-thicknesses.
    // It ran 3.0× to 6.5× of that; a flat palm has nothing left to spend on it.
    for (const { p, m } of every()) {
      expect(m.gap / m.idealGap, `${p.beau}→${p.belle}`).toBeLessThan(1.35);
    }
  });

  it("🔑 leaves the hardest hands a hair proud, and it is Sprout every time", () => {
    // `you/sprout` and `sprout/you` are the orderings whose forearms hang nearest vertical,
    // and they are the two that sit on ADR-0052's flexion limit. They come out at a couple of
    // degrees off level rather than the 77°–88° the pre-fix arithmetic predicted, because the
    // hold is a fixed point: as a palm flattens its centre moves, which lets the forearm come
    // off vertical, which leaves the wrist less to do. **That is why the stagger ADR-0051
    // proposed is not needed** — measured, not assumed.
    const worst = every()
      .map(({ p, m }) => ({ p, f: Math.max(m.beau.flatness, m.belle.flatness) }))
      .sort((a, b) => b.f - a.f);
    // Far inside the target — 0.005 of the way to the rim, not the 0.98 it was — but not
    // exactly zero, which is the clamp leaving its mark and the only trace of it.
    expect(worst[0]?.f).toBeLessThan(0.05);
    expect(worst[0]?.f).toBeGreaterThan(0);
    // And the residue is Sprout's, which is the discriminator the pre-fix numbers already
    // pointed at: the child's arm is the one that ends up nearest vertical at a grown
    // partner's hold, so hers is the wrist with the most left to do.
    for (const w of [worst[0], worst[1]]) {
      expect([w?.p.beau, w?.p.belle], `${w?.p.beau}/${w?.p.belle}`).toContain("sprout");
    }
  });

  it("reports flatness on a scale that compares across hand sizes", () => {
    // 0 = the palm lies in the contact plane, 1 = it stands on its rim. Normalised by each
    // hand's own thickness and radius, so Sprout's small hand and Myco's large one are
    // answering the same question.
    for (const { p, m } of every()) {
      for (const h of [m.beau, m.belle]) {
        expect(h.flatness, `${p.beau}→${p.belle}`).toBeGreaterThanOrEqual(-1e-9);
        expect(h.flatness, `${p.beau}→${p.belle}`).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
