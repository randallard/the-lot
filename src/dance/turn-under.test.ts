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

  it("🔑 and the other three leave the reach draw alone", () => {
    // Not a detail. Whether a pair reshape or break to *reach* each other is a different
    // question from how one of them gets an arm over their own head, and returning a default
    // here instead of `null` would silently pin one of ADR-0037's two styles off for three of
    // the four — turning a coin flip into a fixed answer without anybody deciding to.
    for (const style of TURN_UNDER_STYLES.filter((s) => s !== LAZY_L)) {
      expect(accommodationFor(style), style).toBeNull();
    }
    expect(accommodationFor(FULL_L)).not.toBe(RESHAPE);
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
  });

  it("🔴 and every other combination leaves the coin flip alone", () => {
    // The gap this closes is that `drawAccommodation()` is a flip **per mount**, so a review
    // cell showed a different pose on a second visit. Forcing it is what makes an address
    // reproducible — but forcing it for styles that have no business deciding it would pin
    // ADR-0037's two off for everybody, which is the opposite mistake.
    expect(forcedAccommodation([FULL_L, DUCK_UNDER])).toBeNull();
    expect(forcedAccommodation([CASUAL, CASUAL])).toBeNull();
    expect(forcedAccommodation([null, null])).toBeNull();
    expect(forcedAccommodation([])).toBeNull();
    expect(forcedAccommodation(undefined)).toBeNull();
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
