import { describe, expect, it } from "vitest";
import { REVIEW_FIGURES } from "./review-steps";
import { reviewPairings } from "./review-route";
import { review2Hash, review2Target } from "./review2-route";

describe("the posing screen's address", () => {
  it("round-trips every figure and pairing", () => {
    for (const figure of REVIEW_FIGURES) {
      for (const pairing of reviewPairings()) {
        for (const only of [false, true]) {
          expect(review2Target(review2Hash({ figure, pairing, only }))).toEqual({ figure, pairing, only });
        }
      }
    }
  });

  it("falls back to the first target rather than erroring", () => {
    const first = review2Target("#review2");
    expect(first).not.toBeNull();
    expect(review2Target("#review2=nope/nobody-nobody")).toEqual(first);
  });

  it("🔴 does not claim the old review's hashes, nor they its", () => {
    expect(review2Target("#review")).toBeNull();
    expect(review2Target("#review=california-twirl/stand/player-myco")).toBeNull();
    expect(review2Target("")).toBeNull();
  });
});
