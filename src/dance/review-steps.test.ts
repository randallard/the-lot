import { describe, expect, it } from "vitest";
import { applyCallToPair, danceCoupleSequence, flattenSequence, partnerUp } from "square-one";
import { REVIEW_FIGURES } from "./review-steps";

/** The motions a figure's steps are beats *of*, built the way `useDancePerformance` builds them. */
function motionsOf(figure: (typeof REVIEW_FIGURES)[number]) {
  if (figure.sequence !== undefined) {
    return flattenSequence(danceCoupleSequence(figure.sequence, partnerUp("a", "b")));
  }
  const { a, b } = applyCallToPair(figure.call);
  return { a, b };
}

describe("the review step catalog", () => {
  it("names every step uniquely within its figure", () => {
    for (const figure of REVIEW_FIGURES) {
      const ids = figure.steps.map((s) => s.id);
      expect(new Set(ids).size, figure.id).toBe(ids.length);
    }
  });

  it("🔴 asks for beats the figure actually has", () => {
    // The defect this rules out: a step written against one call's length, left behind on a
    // shorter one, silently clamping to its end — two different steps rating the same pose
    // while the panel claims they are different moments.
    for (const figure of REVIEW_FIGURES) {
      for (const step of figure.steps) {
        if (step.pose.kind !== "beat") continue;
        expect(step.pose.beat, `${figure.id}/${step.id}`).toBeGreaterThanOrEqual(0);
        expect(step.pose.beat, `${figure.id}/${step.id}`).toBeLessThanOrEqual(figure.beats);
      }
    }
  });

  it("agrees with square-one about how long each figure is", () => {
    // `beats` is quoted in the panel and used to clamp a seek, so it is a claim about the
    // engine and has to be checked against it rather than maintained by hand.
    for (const figure of REVIEW_FIGURES) {
      const motions = motionsOf(figure);
      const beats = Math.max(...Object.values(motions).map((m) => m.beats));
      expect(beats, figure.id).toBe(figure.beats);
    }
  });

  it("visits distinct moments — no figure rates the same beat twice", () => {
    for (const figure of REVIEW_FIGURES) {
      const beats = figure.steps
        .filter((s) => s.pose.kind === "beat")
        .map((s) => (s.pose.kind === "beat" ? s.pose.beat : -1));
      expect(new Set(beats).size, figure.id).toBe(beats.length);
    }
  });

  it("🔑 asks the California Twirl for the standing couple *and* the raised arch", () => {
    // The two poses `go home` and a seek-to-0 produce, and the reason the two passes are
    // distinct in `DanceFloor`: square-one declares the arch from beat 0, so beat 0 is
    // already inside it and the couple standing underneath is only reachable as a home
    // pass. Both are wanted, in that order.
    const twirl = REVIEW_FIGURES.find((f) => f.id === "california-twirl");
    expect(twirl?.steps[0]?.pose).toEqual({ kind: "stand" });
    expect(twirl?.steps[1]?.pose).toEqual({ kind: "beat", beat: 0 });
  });

  it("🔴 puts a step on the belle's pass under the arch", () => {
    // The open defect from 2026-08-23 is centred here, and the whole review exists to be
    // able to say which pairings it shows up on.
    const twirl = REVIEW_FIGURES.find((f) => f.id === "california-twirl");
    const under = twirl?.steps.find((s) => s.id === "under-arch");
    expect(under?.pose).toEqual({ kind: "beat", beat: 2 });
    // Beat 2 of a 4-beat exchange is the midpoint of the belle's diameter — where square-one
    // puts her at (0, 0), directly under the joined hands. To 5 places, which is the
    // engine's own `round` precision: its waypoints land on 1e-6, not on exact zero.
    const motions = motionsOf(twirl!);
    const belle = motions.b!;
    const midpoint = belle.waypoints.find((w) => w.beat === 2);
    expect(midpoint?.x).toBeCloseTo(0, 5);
    expect(midpoint?.y).toBeCloseTo(0, 5);
    // And she is facing back down the line she came along.
    expect(midpoint?.facing).toBeCloseTo(180, 5);
  });

  it("keeps the arch held across every Twirl step that is inside the call", () => {
    // A step that names a beat outside the grip span would be rated as an arch pose and
    // drawn as a free-handed one — so every step that is *about* the arch has to be inside
    // it. `end` is the deliberate exception and gets its own test below.
    const twirl = REVIEW_FIGURES.find((f) => f.id === "california-twirl")!;
    const motions = motionsOf(twirl);
    const span = motions.b!.grips.find((g) => g.grip === "arch");
    expect(span).toBeDefined();
    for (const step of twirl.steps) {
      if (step.pose.kind !== "beat" || step.id === "end") continue;
      expect(step.pose.beat, step.id).toBeGreaterThanOrEqual(span!.from);
      expect(step.pose.beat, step.id).toBeLessThanOrEqual(span!.to);
    }
  });

  it("🔑 puts the Twirl's ending position AFTER the arch, hands back down", () => {
    // Ryan, 2026-09-12: *"the ending position is always hands back down in a normal
    // handhold."* square-one releases the arch `HOLD_RELEASE_BEATS` before the call ends, so
    // the `end` step is outside the span on purpose — and this asserts the two agree. If the
    // engine ever went back to gripping to the last beat, the step would silently start
    // showing a raised arch again and the chart would rate the wrong pose.
    //
    // 🔴 Outside the span is NOT hands free. `DanceFloor` targets arch blend 0 here, which is
    // the standing hold — hands joined, low and forward (ADR-0027) — so the couple finish
    // joined the ordinary way. `momentum.lastHand` is what still names the hand.
    const twirl = REVIEW_FIGURES.find((f) => f.id === "california-twirl")!;
    const motions = motionsOf(twirl);
    const span = motions.b!.grips.find((g) => g.grip === "arch");
    const end = twirl.steps.find((s) => s.id === "end");
    expect(end?.pose.kind).toBe("beat");
    expect(end?.pose.kind === "beat" ? end.pose.beat : NaN).toBeGreaterThan(span!.to);
    expect(motions.b!.momentum.lastHand).not.toBe("none");
  });

  it("🔑 gives the Partner Trade a control step for every Twirl step", () => {
    // The two calls walk identical paths and differ only in the hold (square-one ADR-0017),
    // so a Trade cell is the control for its Twirl counterpart: any difference between them
    // is the hold and nothing else. That only works if the two step lists line up.
    const twirl = REVIEW_FIGURES.find((f) => f.id === "california-twirl")!;
    const trade = REVIEW_FIGURES.find((f) => f.id === "partner-trade")!;
    expect(trade.steps).toHaveLength(twirl.steps.length);
    expect(trade.steps.map((s) => s.pose)).toEqual(twirl.steps.map((s) => s.pose));
  });

  it("says what every step is asking", () => {
    // The panel shows this above the rating buttons: a rating given without the question in
    // view is a rating of the general vibe.
    for (const figure of REVIEW_FIGURES) {
      for (const step of figure.steps) {
        expect(step.watch.length, `${figure.id}/${step.id}`).toBeGreaterThan(20);
      }
    }
  });
});
