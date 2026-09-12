import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCell,
  exportJson,
  isRating,
  loadReviews,
  noteCell,
  rateCell,
  ratedBefore,
  replaceReviews,
} from "./review-store";
import { reviewChartMarkdown } from "./review-chart";
import { reviewCells } from "./review-route";

const KEY = "townage-dance-review";

beforeEach(() => {
  localStorage.clear();
});

describe("the review store", () => {
  it("keeps a score and a note independently, because they are given independently", () => {
    // A score is one keystroke and a note is a sentence. Making the fast half wait for the
    // slow one is how a 650-cell sweep stops getting done.
    let r = rateCell({}, "a/b/c", 3);
    expect(r["a/b/c"]?.rating).toBe(3);
    r = noteCell(r, "a/b/c", "the down arm swaps sides");
    expect(r["a/b/c"]).toMatchObject({ rating: 3, note: "the down arm swaps sides" });
    r = rateCell(r, "a/b/c", 1);
    expect(r["a/b/c"]).toMatchObject({ rating: 1, note: "the down arm swaps sides" });
  });

  it("🔑 lands a note with no score on 2 — can't tell", () => {
    // Somebody who typed a sentence and no number has said something about the pose without
    // saying whether it is right, which is exactly what 2 means.
    const r = noteCell({}, "a/b/c", "odd from the side");
    expect(r["a/b/c"]?.rating).toBe(2);
  });

  it("survives a reload", () => {
    rateCell({}, "a/b/c", 4);
    expect(loadReviews()["a/b/c"]?.rating).toBe(4);
  });

  it("clears one cell without touching the rest", () => {
    let r = rateCell({}, "one", 0);
    r = rateCell(r, "two", 4);
    r = clearCell(r, "one");
    expect(r.one).toBeUndefined();
    expect(r.two?.rating).toBe(4);
    expect(loadReviews().one).toBeUndefined();
  });

  it("🔴 drops a bad row rather than the whole store", () => {
    // This store is hand-edited and hand-imported by design, so one bad row should cost one
    // row. Losing a finished sweep to a typo in an import is the failure worth ruling out.
    localStorage.setItem(
      KEY,
      JSON.stringify({
        good: { rating: 3, note: "fine", at: 5 },
        outOfRange: { rating: 9, note: "", at: 5 },
        notANumber: { rating: "4", note: "", at: 5 },
        missingNote: { rating: 2 },
      }),
    );
    const r = loadReviews();
    expect(r.good?.rating).toBe(3);
    expect(r.outOfRange).toBeUndefined();
    expect(r.notANumber).toBeUndefined();
    // A missing note is a note that was never written, not a broken row.
    expect(r.missingNote).toMatchObject({ rating: 2, note: "" });
  });

  it("reads an absent or corrupt store as empty", () => {
    expect(loadReviews()).toEqual({});
    localStorage.setItem(KEY, "{not json");
    expect(loadReviews()).toEqual({});
    localStorage.setItem(KEY, "null");
    expect(loadReviews()).toEqual({});
  });

  it("names the ratings that predate a fix", () => {
    // A rating is a judgement of the geometry as it was that day, and this code changes
    // underneath it — three ADRs landed in the eight days before this was written.
    const r = replaceReviews({
      old: { rating: 4, note: "", at: 1000 },
      fresh: { rating: 4, note: "", at: 3000 },
    });
    expect(ratedBefore(r, 2000)).toEqual(["old"]);
  });

  it("validates the scale's ends", () => {
    expect([0, 1, 2, 3, 4].every(isRating)).toBe(true);
    expect([-1, 5, 1.5, NaN].some(isRating)).toBe(false);
  });

  it("exports json that reads back", () => {
    const r = rateCell({}, "a/b/c", 2);
    expect(JSON.parse(exportJson(r))).toEqual(r);
  });
});

describe("the chart", () => {
  it("marks unrated cells as unrated rather than blank", () => {
    // A half-finished sweep must read as "not yet looked at" rather than as a table with
    // holes in it — and "unrated" and "rated 2 (can't tell)" must never look the same.
    const md = reviewChartMarkdown({});
    expect(md).toContain("| ·");
    expect(md).toContain("0 of");
  });

  it("puts a cell's score in its own row and column", () => {
    const cell = reviewCells().find(
      (c) => c.id === "california-twirl/under-arch/myco-sprout",
    )!;
    const md = reviewChartMarkdown({
      [cell.id]: { rating: 0, note: "arm through the hand", at: 1 },
    });
    const row = md.split("\n").find((l) => l.startsWith("| Myco → Sprout |"));
    expect(row).toBeDefined();
    // `under-arch` is the fourth step of the Twirl, so the fourth score column.
    expect(row!.split("|").map((s) => s.trim())[5]).toBe("0");
    expect(md).toContain("1 of");
  });

  it("carries every note through to the export, beside its score", () => {
    // The note is the finding — the last four ADRs each came from one sentence about one
    // pose on one pairing. A chart that dropped them would keep the sortable half and lose
    // the useful one.
    const md = reviewChartMarkdown({
      "california-twirl/under-arch/myco-sprout": {
        rating: 0,
        note: "the down arm appears on the other side",
        at: 1,
      },
    });
    expect(md).toContain("the down arm appears on the other side");
    expect(md).toContain("california-twirl/under-arch/myco-sprout");
  });

  it("gives every figure a table and every step a column", () => {
    const md = reviewChartMarkdown({});
    for (const figure of new Set(reviewCells().map((c) => c.figure))) {
      expect(md).toContain(`## ${figure.label}`);
      for (const step of figure.steps) expect(md).toContain(step.label);
    }
  });
});
