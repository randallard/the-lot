import { describe, expect, it } from "vitest";
import {
  CASUAL,
  DUCK_UNDER,
  GABLE,
  TURN_UNDER_STYLES,
  ARCH_CYCLE_BEATS,
  accommodationFor,
  archLift,
  forcedAccommodation,
  keepsContact,
  type TurnUnderStyle,
} from "./turn-under";
import { ACCOMMODATIONS, BREAK, RESHAPE } from "./accommodation";

/**
 * The three ways a dancer takes a joined arm over their own head — Ryan's 2026-09-21 list of four,
 * less the one he folded on 2026-10-12.
 *
 * Small surface, and the tests are here for one reason: this module's whole job is to be the
 * **single place** they are named, so that another cannot appear quietly in a switch
 * somewhere. `accommodation.ts` learned that lesson first — its `ACCOMMODATIONS` exists because
 * a report covering three of a family of four is worse than one covering none.
 */
describe("the turn-under styles", () => {
  it("names three, and the roster is all of them", () => {
    expect(TURN_UNDER_STYLES).toEqual([GABLE, DUCK_UNDER, CASUAL]);
    expect(new Set(TURN_UNDER_STYLES).size).toBe(TURN_UNDER_STYLES.length);
  });

  it("🔑 one of them loses contact: casual", () => {
    // Ryan stated it of the first three: *"those both maintain contact"*, *"sometimes they lazy
    // L and break contact"*. That third is `CASUAL` now — he folded the old casual into it and
    // kept the kinder name: *"replace all lazy with casual."*
    const lost = TURN_UNDER_STYLES.filter((s) => !keepsContact(s));
    expect(lost).toEqual([CASUAL]);
  });

  it("🔴 casual is ADR-0037's break, not a third outcome", () => {
    // `accommodation.ts`: a hold added later must "answer which of these two rather than
    // inventing a third silent one." Losing contact is what a break already is. What makes it
    // *"a different energy"* from a break reached by the coin is the pose, not the outcome.
    expect(accommodationFor(CASUAL)).toBe(BREAK);
    expect(ACCOMMODATIONS).toContain(accommodationFor(CASUAL));
    expect(CASUAL).not.toContain("lazy");
  });

  it("🔑 the two that keep the hold reshape, and never toss", () => {
    // Ryan, 2026-10-11: "lets remove the flip for the L and duck." His words for the pair were
    // "those both maintain contact", and a reshape is the accommodation that does. Until then
    // both returned `null` and took ADR-0037's coin flip, so one review address showed two
    // poses at two distances.
    expect(accommodationFor(GABLE)).toBe(RESHAPE);
    expect(accommodationFor(DUCK_UNDER)).toBe(RESHAPE);
    for (const style of [GABLE, DUCK_UNDER] as const) expect(keepsContact(style)).toBe(true);
  });

  it("answers for every style, so a new one cannot be added silently", () => {
    // The guard the family exists for: both functions are total over the roster. A fifth style
    // added to the type without a case here fails to compile; added to the roster without a
    // case, it fails this.
    for (const style of TURN_UNDER_STYLES) {
      expect(typeof keepsContact(style), style).toBe("boolean");
      const a = accommodationFor(style);
      expect(a === null || ACCOMMODATIONS.includes(a), style).toBe(true);
    }
  });

  it("🔑 one dancer going casual breaks the hold for both", () => {
    // A break is a property of the hold, not of a body — one person letting go breaks it for
    // two. So it does not matter which side of the pair is casual, and there is no case where two
    // dancers disagree for a caller to reconcile.
    expect(forcedAccommodation([CASUAL, GABLE])).toBe(BREAK);
    expect(forcedAccommodation([GABLE, CASUAL])).toBe(BREAK);
    // And it outranks a partner's reshape whichever of them is listed first.
    expect(forcedAccommodation([DUCK_UNDER, CASUAL])).toBe(BREAK);
    expect(forcedAccommodation([GABLE, null])).toBe(RESHAPE);
  });

  it("🔴 and only a pair with no opinion leaves the coin flip alone", () => {
    // `drawAccommodation()` is a flip **per mount**, so a review cell that reaches it shows a
    // different pose on a second visit. Since 2026-10-12 that is the unstyled floor only —
    // `#dance`, where a repeated Twirl *should* vary.
    expect(forcedAccommodation([null, null])).toBeNull();
    expect(forcedAccommodation([])).toBeNull();
    expect(forcedAccommodation(undefined)).toBeNull();
    // The two that keep the hold answer for themselves.
    expect(forcedAccommodation([GABLE, DUCK_UNDER])).toBe(RESHAPE);
  });

  it("keeps the ids url-safe, because they are half of a review address", () => {
    // Every style ends up in a `#review=california-twirl/<step>-<style>/<beau>-<belle>` hash,
    // which `reviewSceneHash` round-trips through `decodeURIComponent`.
    for (const style of TURN_UNDER_STYLES) {
      expect(style, style).toMatch(/^[a-z][a-z-]*[a-z]$/);
      expect(encodeURIComponent(style), style).toBe(style);
    }
  });

});

describe("archLift", () => {
  // Ryan's twirl2 stills: handhold at beat 0, the full arch at beat 2, the handhold again at 4.
  it("is the handhold at the start and end of a turn-under and the full arch half way", () => {
    expect(archLift(0, 0)).toBe(0);
    expect(archLift(-1, 0)).toBe(0);
    expect(archLift(ARCH_CYCLE_BEATS / 2, 0)).toBeCloseTo(1, 12);
    expect(archLift(ARCH_CYCLE_BEATS, 0)).toBeCloseTo(0, 12);
  });

  it("keeps rising until the peak, not stopping at beat 1", () => {
    expect(archLift(1, 0)).toBeCloseTo(0.5, 12);
    expect(archLift(1.5, 0)).toBeGreaterThan(archLift(1, 0));
    expect(archLift(2, 0)).toBeGreaterThan(archLift(1.5, 0));
    expect(archLift(3, 0)).toBeCloseTo(0.5, 12);
  });

  it("lifts and lowers once per call across a span merged over two calls", () => {
    expect(archLift(6, 0)).toBeCloseTo(1, 12);
    expect(archLift(4.5, 4)).toBeCloseTo(archLift(0.5, 0), 12);
  });
});

/** A compile-time check that the union and the roster cannot drift apart. */
TURN_UNDER_STYLES satisfies readonly TurnUnderStyle[];
