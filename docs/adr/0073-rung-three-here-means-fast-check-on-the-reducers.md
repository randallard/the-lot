# ADR-0073: Rung 3 here means `fast-check` on the screen reducers; the solver keeps its seeded tests
- Status: Accepted
- Date: 2026-11-01
- Deciders: Ryan ("write both ADRs", 2026-11-01)

## Context
The README claims provable-lite ([ADR-1002](1002-provable-is-a-four-rung-ladder.md)). Rung 3 in
`project-conventions` is "`proptest` / `fast-check` on the pure core". The second 11-01
[compliance review](../compliance/2026-11-01-2.md) found `fast-check` in only three test files: the
`review2-session` and `voice-test-session` reducers, and `vad`.

The rest of the core, the solver and pose modules, is also tested over generated inputs, but by hand:
`whole-move.test.ts:123`, `whole-move-n.test.ts:14` and `arch.test.ts:737` each run a small seeded
generator. Those run in CI, and a failure repeats. They don't shrink a failure to a small case, and
they don't state what they cover as a property the way `fast-check` does. So the claim needs either a
narrower meaning or more work.

## Decision
In this repo, rung 3 means `fast-check` properties over the screen reducers. The solver and pose
modules keep their seeded generated-input tests, and the tier claim doesn't rest on them being
`fast-check`. The README says so next to the claim.

This is a recorded deviation from the inherited wording (ADR-1000), not a change to it.

## Alternatives considered
- **Add `fast-check` to the solver and pose modules now.** This is the stronger position, and the
  seeded tests are a natural start. It's real work that competes with the dance work, for tests that
  already catch failures repeatably.
- **Withdraw the claim until that's done.** This is the strictest reading of ADR-1002. It would drop a
  tier whose other parts CI does enforce, to protect a word the README already qualifies.

## Consequences
- The tier name still implies more than a reader may assume, so the qualification has to stay beside
  it in the README.
- A solver failure found by a seeded test isn't shrunk, so it can be harder to read.
- 29 `it.fails` findings remain in the suite. They're known failures, and the tier doesn't say the
  solver is right.
- **Promotion condition:** add `fast-check` to a solver or pose module the first time a seeded test's
  failure is hard to diagnose for lack of shrinking, or a defect ships that a generated input would
  have caught. If that covers the core, this ADR is superseded and the README's qualification goes.
