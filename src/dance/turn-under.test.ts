import { describe, expect, it } from "vitest";
import {
  CASUAL,
  DUCK_UNDER,
  FULL_L,
  LAZY_L,
  TURN_UNDER_STYLES,
  accommodationFor,
  forcedAccommodation,
  keepsContact,
  type TurnUnderStyle,
} from "./turn-under";
import { ACCOMMODATIONS, BREAK, RESHAPE } from "./accommodation";

/**
 * The four ways a dancer takes a joined arm over their own head, from Ryan's 2026-09-21 list.
 *
 * Small surface, and the tests are here for one reason: this module's whole job is to be the
 * **single place** the four are named, so that a fifth cannot appear quietly in a switch
 * somewhere. `accommodation.ts` learned that lesson first — its `ACCOMMODATIONS` exists because
 * a report covering three of a family of four is worse than one covering none.
 */
describe("the turn-under styles", () => {
  it("names four, and the roster is all of them", () => {
    expect(TURN_UNDER_STYLES).toEqual([FULL_L, DUCK_UNDER, LAZY_L, CASUAL]);
    expect(new Set(TURN_UNDER_STYLES).size).toBe(TURN_UNDER_STYLES.length);
  });

  it("🔑 exactly one of them loses contact, and it is the lazy L", () => {
    // The one property Ryan stated outright: *"those both maintain contact"* of the first two,
    // *"sometimes they lazy L and break contact"* of the third. `CASUAL` keeps contact because
    // it keeps the hold and simply declines to make the shape — the arm is low, not let go.
    const lost = TURN_UNDER_STYLES.filter((s) => !keepsContact(s));
    expect(lost).toEqual([LAZY_L]);
  });

  it("🔴 the lazy L is ADR-0037's break, not a third outcome", () => {
    // `accommodation.ts`: a hold added later must "answer which of these two rather than
    // inventing a third silent one." Losing contact is what a break already is.
    expect(accommodationFor(LAZY_L)).toBe(BREAK);
    expect(ACCOMMODATIONS).toContain(accommodationFor(LAZY_L));
  });

  it("🔑 the two that keep the hold reshape, and never toss", () => {
    // Ryan, 2026-10-11: "lets remove the flip for the L and duck." His words for the pair were
    // "those both maintain contact", and a reshape is the accommodation that does. Until then
    // both returned `null` and took ADR-0037's coin flip, so one review address showed two
    // poses at two distances.
    expect(accommodationFor(FULL_L)).toBe(RESHAPE);
    expect(accommodationFor(DUCK_UNDER)).toBe(RESHAPE);
    for (const style of [FULL_L, DUCK_UNDER] as const) expect(keepsContact(style)).toBe(true);
  });

  it("🧪 casual still tosses — it has no pose for a fixed answer to be true of", () => {
    expect(accommodationFor(CASUAL)).toBeNull();
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

  it("🔑 one dancer's lazy L breaks the hold for both", () => {
    // A break is a property of the hold, not of a body — one person letting go breaks it for
    // two. So it does not matter which side of the pair is lazy, and there is no case where two
    // dancers disagree for a caller to reconcile.
    expect(forcedAccommodation([LAZY_L, FULL_L])).toBe(BREAK);
    expect(forcedAccommodation([FULL_L, LAZY_L])).toBe(BREAK);
    expect(forcedAccommodation([LAZY_L, LAZY_L])).toBe(BREAK);
    // And it outranks a partner's reshape whichever of them is listed first.
    expect(forcedAccommodation([DUCK_UNDER, LAZY_L])).toBe(BREAK);
    expect(forcedAccommodation([FULL_L, null])).toBe(RESHAPE);
    expect(forcedAccommodation([CASUAL, CASUAL])).toBeNull();
  });

  it("🔴 and only a pair with no opinion leaves the coin flip alone", () => {
    // `drawAccommodation()` is a flip **per mount**, so a review cell that reaches it shows a
    // different pose on a second visit. Since 2026-10-11 that is `casual` and the unstyled
    // floor only — `#dance`, where a repeated Twirl *should* vary.
    expect(forcedAccommodation([CASUAL, CASUAL])).toBeNull();
    expect(forcedAccommodation([null, null])).toBeNull();
    expect(forcedAccommodation([])).toBeNull();
    expect(forcedAccommodation(undefined)).toBeNull();
    // The two that keep the hold answer for themselves.
    expect(forcedAccommodation([FULL_L, DUCK_UNDER])).toBe(RESHAPE);
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

/** A compile-time check that the union and the roster cannot drift apart. */
const _exhaustive: readonly TurnUnderStyle[] = TURN_UNDER_STYLES;
void _exhaustive;
