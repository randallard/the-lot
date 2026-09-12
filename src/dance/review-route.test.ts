import { describe, expect, it } from "vitest";
import { castRoster } from "../config/npcs";
import { REVIEW_FIGURES } from "./review-steps";
import {
  cellId,
  findCell,
  reviewCells,
  reviewPairings,
  reviewSceneCell,
  reviewSceneHash,
} from "./review-route";

describe("the review matrix", () => {
  it("pairs every character with every other, in both orders", () => {
    const pairings = reviewPairings();
    // 🔴 Ordered, and this is the assertion that says so. ADR-0046 exists because the hold
    // was aimed at a *role* rather than a body, which read correctly on the one pairing
    // where the belle happens to be the taller dancer and was wrong on its mirror. A
    // matrix that folded the two into one cell could not have found it.
    for (const p of pairings) {
      expect(pairings).toContainEqual({ beau: p.belle, belle: p.beau });
    }
    // Five characters — four NPCs and the player — is 5 × 5.
    expect(pairings).toHaveLength(25);
  });

  it("🔑 stands every dancer up with themselves — the control row", () => {
    // Two bodies of identical build, which is a pose the geometry owes an answer for and
    // which no mixed cell can isolate: off the diagonal a bad pose is either the figure or
    // the fit, and on it there is no fit left to blame.
    const pairings = reviewPairings();
    const ids = castRoster().map((c) => c.id);
    for (const id of ids) {
      expect(pairings).toContainEqual({ beau: id, belle: id });
    }
    expect(pairings.filter((p) => p.beau === p.belle)).toHaveLength(ids.length);
  });

  it("walks figure, then step, then pairing", () => {
    // The order is the point: holding one moment still while the bodies change under it is
    // how a bad *moment* is told from a bad *pairing*.
    const cells = reviewCells();
    const pairings = reviewPairings();
    const first = REVIEW_FIGURES[0]!;
    expect(cells[0]?.id).toBe(cellId(first, first.steps[0]!, pairings[0]!));
    expect(cells[1]?.id).toBe(cellId(first, first.steps[0]!, pairings[1]!));
    expect(cells[pairings.length]?.id).toBe(cellId(first, first.steps[1]!, pairings[0]!));
  });

  it("gives every cell a distinct address", () => {
    const cells = reviewCells();
    expect(new Set(cells.map((c) => c.id)).size).toBe(cells.length);
  });

  it("covers every step of every figure on every pairing", () => {
    const steps = REVIEW_FIGURES.reduce((n, f) => n + f.steps.length, 0);
    expect(reviewCells()).toHaveLength(steps * reviewPairings().length);
  });
});

describe("the review's hash", () => {
  it("is not the review at all on any other hash", () => {
    expect(reviewSceneCell("")).toBeNull();
    expect(reviewSceneCell("#dance")).toBeNull();
    expect(reviewSceneCell("#dance=two-twirls")).toBeNull();
    expect(reviewSceneCell("#reviewing")).toBeNull();
  });

  it("stands the first cell up on a bare #review", () => {
    const first = reviewCells()[0]!;
    expect(reviewSceneCell("#review")?.id).toBe(first.id);
    expect(reviewSceneCell("#review=")?.id).toBe(first.id);
  });

  it("falls back to the first cell rather than erroring on a stale address", () => {
    // A link kept in a note outlives the step it names. Opening the review is a better
    // answer than a blank page.
    expect(reviewSceneCell("#review=nonsense/at/all")?.id).toBe(reviewCells()[0]!.id);
  });

  it("🔴 round-trips every cell, so a pose can be linked to and reopened", () => {
    // The same defect `dance-route` had: the scene wrote one namespace and the loader read
    // another, so every couple watch was unreloadable and a link to one showed the wrong
    // dance. 650 cells is far past where that gets noticed by hand.
    for (const cell of reviewCells()) {
      expect(reviewSceneCell(reviewSceneHash(cell))?.id).toBe(cell.id);
    }
  });

  it("finds a cell by the address a human would type", () => {
    const cell = findCell("california-twirl/under-arch/myco-sprout");
    expect(cell?.figure.label).toBe("California Twirl");
    expect(cell?.step.label).toBe("belle under the arch");
    expect(cell?.pairing).toEqual({ beau: "myco", belle: "sprout" });
  });
});
