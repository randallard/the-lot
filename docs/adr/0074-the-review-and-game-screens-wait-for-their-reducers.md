# ADR-0074: `#review` and `App.tsx` wait for their reducers until the work next reaches them
- Status: Accepted
- Date: 2026-11-01
- Deciders: Ryan ("write both ADRs", 2026-11-01)

## Context
[ADR-1017](1017-state-is-managed-facts-managed-position-derived-values.md) and
[ADR-0065](0065-state-is-managed-facts-managed-position-and-derived-values.md) say a screen's
transitions go through one pure, property-tested reducer. `#review2` and the voice test have one.
`DanceReviewScene.tsx` (`#review`) and `App.tsx` have 31 `useState`s each and no reducer.

ADR-0065 gave `App.tsx` a path ("planned next", with ADR-0004 standing until it lands), but no date.
`#review` has no recorded answer: ADR-0065 only cites its count. The second 11-01
[compliance review](../compliance/2026-11-01-2.md) flagged both, and earlier reviews had marked the
row as met on the two reducers alone.

## Decision
Neither screen gets a reducer now. Each gets one when the work next reaches it, under the condition
below. This is a recorded deviation from ADR-1017 (ADR-1000) for these two screens only: a new screen
still follows the rule. ADR-0065's rule stands, and this replaces only its "planned next" timing for
`App.tsx`. ADR-0004 keeps standing until that work lands.

## Alternatives considered
- **Write both reducers now.** That is what the standard asks for, and it's a large change to two
  screens with 62 `useState`s between them, competing with the dance work for no reported defect.
- **Leave it unrecorded.** The compliance review would keep flagging it, and rightly: nobody would be
  able to tell a decision from an oversight.

## Consequences
- Both screens can still hold contradictory state, and their transitions have no property tests.
- Each new `useState` on either screen adds to the eventual move.
- **Promotion condition:** a screen gets its reducer, in that piece of work, the first time one of
  these happens to it: a defect is traced to its state contradicting itself, a change adds several new
  managed values, or its flow is restructured. When both have one, this ADR is superseded.
