/**
 * What the review has been told about each pose: a score, a note, and when.
 *
 * Stored in localStorage under "townage-dance-review".
 *
 * ## The scale, and why 2 is not "average"
 *
 * 0 terrible · 1 bad · 2 **can't tell** · 3 good · 4 perfect. Ryan's scale, and the
 * middle of it is the abstention rather than the mediocre. That matters more than it
 * looks: most of the last month's defects were found by a pose being *unreadable* from
 * the angle it was shot at, not by it being obviously wrong, and a scale with no way to
 * say "I can't see it from here" pushes that into a 1 or a 3 and loses it. A matrix full
 * of 2s at one step is a camera problem or a missing readout; a matrix of 0s is a
 * geometry problem. Those want different work, so they get different scores.
 *
 * ## Why a note per cell rather than one per figure
 *
 * Because that is where the last four ADRs came from. *"the arms are through the hand"*,
 * *"ember is fine as belle but no others"*, *"belle is doing 540 degree turn cw"* — each
 * of those is one sentence about one pose on one pairing, and each one named the defect
 * more precisely than any number could. The score sorts the matrix; the note is the
 * finding. Both are kept, and the export puts the note next to its score.
 *
 * ## What a rating is worth later
 *
 * Every record carries the time it was given, because a rating is a judgement of the
 * geometry **as it was that day** and this code changes underneath it. Three ADRs landed
 * in the eight days before this was written. `ratedBefore` is how a sweep asks which
 * ratings predate a fix and are therefore owed a re-look — the alternative is trusting a
 * green matrix that was scored against code nobody runs any more.
 */

const STORAGE_KEY = "townage-dance-review";

/** 0 terrible · 1 bad · 2 can't tell · 3 good · 4 perfect. */
export type Rating = 0 | 1 | 2 | 3 | 4;

export const RATING_LABELS: Readonly<Record<Rating, string>> = {
  0: "terrible",
  1: "bad",
  2: "can't tell",
  3: "good",
  4: "perfect",
};

export function isRating(n: number): n is Rating {
  return Number.isInteger(n) && n >= 0 && n <= 4;
}

export interface ReviewRecord {
  readonly rating: Rating;
  /** Free text — the finding. Empty string when none was written. */
  readonly note: string;
  /** When this record was last written, epoch ms. */
  readonly at: number;
}

export type ReviewRecords = Readonly<Record<string, ReviewRecord>>;

export function loadReviews(): ReviewRecords {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data === null) return {};
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return {};
    // Filtered on the way in rather than trusted: this store is hand-edited and
    // hand-imported by design, and one bad row should cost one row.
    const out: Record<string, ReviewRecord> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const r = value as Partial<ReviewRecord>;
      if (typeof r?.rating !== "number" || !isRating(r.rating)) continue;
      out[id] = {
        rating: r.rating,
        note: typeof r.note === "string" ? r.note : "",
        at: typeof r.at === "number" ? r.at : 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function saveReviews(records: ReviewRecords): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // A full or blocked store loses the write, not the session. The panel keeps its own
    // React state, so the ratings on screen stay correct either way.
  }
}

/**
 * Score a cell, keeping whatever note it already had.
 *
 * The two halves are written separately because they are given separately: a score is one
 * keystroke and a note is a sentence, and making the fast half wait for the slow one is
 * how a 650-cell sweep stops getting done.
 */
export function rateCell(records: ReviewRecords, id: string, rating: Rating): ReviewRecords {
  const next = { ...records, [id]: { rating, note: records[id]?.note ?? "", at: Date.now() } };
  saveReviews(next);
  return next;
}

/**
 * Write a cell's note, keeping its score.
 *
 * A note on an unrated cell is kept and lands at **2 — "can't tell"**, which is the honest
 * default: somebody who typed a sentence and no number has said something about the pose
 * without saying whether it is right, and that is exactly what 2 means.
 */
export function noteCell(records: ReviewRecords, id: string, note: string): ReviewRecords {
  const existing = records[id];
  const next = {
    ...records,
    [id]: { rating: existing?.rating ?? 2, note, at: Date.now() },
  };
  saveReviews(next);
  return next;
}

/** Drop a cell's record entirely — the undo for a mis-keyed score. */
export function clearCell(records: ReviewRecords, id: string): ReviewRecords {
  const next = { ...records };
  delete next[id];
  saveReviews(next);
  return next;
}

/** Replace the whole store — the import side of {@link exportJson}. */
export function replaceReviews(records: ReviewRecords): ReviewRecords {
  saveReviews(records);
  return records;
}

/**
 * The ids rated before a moment — which ratings predate a fix, and are owed a re-look.
 *
 * Takes epoch ms, so a caller can pass the time of a commit and get back the cells whose
 * scores were given against code that no longer exists.
 */
export function ratedBefore(records: ReviewRecords, when: number): readonly string[] {
  return Object.entries(records)
    .filter(([, r]) => r.at < when)
    .map(([id]) => id);
}

export function exportJson(records: ReviewRecords): string {
  return JSON.stringify(records, null, 2);
}
