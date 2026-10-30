/**
 * 🧪 The calls a two-dancer floor can dance (2026-10-29): square-one's two-dancer catalog
 * (`CallName`, which starts and ends in one formation) plus **Star Thru**, which starts as a facing
 * pair and ends as a couple, so square-one keeps it out of `CALLS` and gives it its own entry point
 * (`applyStarThru`). Bakes, review figures and the floor name a call by this.
 */

import type { CallName } from "square-one";

export type FloorCall = CallName | "star-thru";

/** A call that starts as a facing pair and finishes as a couple. */
export const FORMS_A_COUPLE = (call: FloorCall): call is "star-thru" => call === "star-thru";
