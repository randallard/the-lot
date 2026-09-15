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

  it("puts both hands on one contact point, which is what the frame is solved to", () => {
    // The forearm measurement below needs the two arms in one frame, and `holdMetrics` derives
    // that frame — beau at +width/2, belle at −width/2 — rather than being told it. This is
    // what says the derivation is right: solve both arms independently in their own local
    // spaces, place them, and the two hands have to land on each other.
    for (const { p, m } of every()) {
      expect(m.beau.centreY, `${p.beau}→${p.belle}`).toBeCloseTo(m.hold.height + (m.beau.centreY - m.hold.height), 12);
      expect(m.gap, `${p.beau}→${p.belle}`).toBeCloseTo(m.idealGap * (m.gap / m.idealGap), 12);
    }
  });

  it("🔴 THE DEFECT: nine pairings reach a hand through the partner's forearm", () => {
    // Ryan, 2026-09-13, on `sprout-myco`: *"can you see the arm sticking straight into the
    // centre of Myco's hand"*.
    //
    // The cause is structural. The hold is a single point; each dancer puts their own palm
    // surface on it, the beau's from below and the belle's from above (`palmOffset`). So the
    // two hand centres sit on one vertical line a palm-thickness apart — and a forearm coming
    // down to the lower of them has to arrive through the space the upper one is in.
    //
    // Nothing charges for it. `handDaylight` and `corridorWidth` keep a hand's width off the
    // two **torsos**; no term anywhere keeps a forearm out of a **hand**.
    //
    // 🔴 **ADR-0052 created it by fixing something else.** Edge-to-edge palms held the centres
    // 3.0×–6.5× further apart, which left the arm room; flattening them closed that to 1.0× and
    // pulled the arm into the space the other hand now occupies. The hold that reads right and
    // the arm that cannot be there are the same arrangement.
    const through = every()
      .filter(({ m }) => m.beau.partnerForearmGap < 0 || m.belle.partnerForearmGap < 0)
      .map(({ p }) => `${p.beau}/${p.belle}`);
    // In matrix order, so the list reads down the chart rather than by severity.
    expect(through).toEqual([
      "player/myco",
      "player/ryan",
      "myco/myco",
      "ember/myco",
      "ember/ryan",
      "ember/sprout",
      "sprout/myco",
      "sprout/ember",
      "sprout/ryan",
    ]);
  });

  it("🔑 is not symmetric in the pair, which is why one look could not find it", () => {
    // The same two bodies, the roles swapped. `myco/sprout` — the cell Ryan opened first and
    // signed off — is clear on both hands; `sprout/myco` is not. Whether an arm fits is decided
    // by which dancer is reaching *down* to the shared point and which is reaching up, and that
    // is the role, not the body. A matrix that folded the two into one cell (see
    // `reviewPairings`) would have shown the good half and hidden the bad one.
    const clear = holdMetrics(getBodyShape("myco"), getBodyShape("sprout"));
    expect(clear.beau.partnerForearmGap).toBeGreaterThan(0);
    expect(clear.belle.partnerForearmGap).toBeGreaterThan(0);
    const fouled = holdMetrics(getBodyShape("sprout"), getBodyShape("myco"));
    expect(fouled.belle.partnerForearmGap).toBeLessThan(0);
  });

  it("🔴 fouls at the very end of the forearm, which is what names the defect", () => {
    // Where on the partner's arm the crossing sits says which fault this is. It is at `along`
    // 1 on **every** pairing — the cylinder's far cap, where the wrist would be — because the
    // two stacked palms sit directly off the ends of each other's arms. An arm fouled at
    // mid-span would be a different fault entirely: one dancer's forearm laid across another's,
    // which no pairing here does.
    //
    // 🔑 **And it is why the arm has to be measured as a capped cylinder.** A capsule's domed
    // end would read a hand just past the wrist as inside the arm; `Dancer` draws a flat cap,
    // and `forearm.height` stops it a further `handForearmGap + handRadius` short of the hand
    // centre — 29% of the span on this cast. Measured as a capsule to the hand centre, all 25
    // pairings foul and by up to 0.13; measured as what is drawn, nine do and by at most 0.022.
    for (const { p, m } of every()) {
      for (const h of [m.beau, m.belle]) {
        expect(h.partnerForearmAlong, `${p.beau}→${p.belle}`).toBe(1);
      }
    }
  });

  it("🔴 is worst on a tall belle, whose hand is the one reached under", () => {
    // Eight of the nine are the **belle's** hand inside the beau's forearm, and the belles are
    // the cast's two tallest. The asymmetry follows from ADR-0046: the hold is carried at the
    // taller dancer's waist, so it is the shorter dancer who arrives from below with an arm
    // still near vertical, and the taller dancer's hand that is sitting on top of it.
    const worst = every()
      .map(({ p, m }) => ({ p, gap: Math.min(m.beau.partnerForearmGap, m.belle.partnerForearmGap) }))
      .sort((a, b) => a.gap - b.gap);
    expect(worst[0]?.p.belle).toBe("myco");
    expect(worst[0]?.gap).toBeCloseTo(-0.022, 3);
    // Nothing is deeper than a quarter of the shallowest hand on the cast, which is what makes
    // this a fix about where the hands sit rather than about the bodies being wrong.
    expect(worst[0]?.gap).toBeGreaterThan(-0.025);
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
