# 2026-11-01 (5): the second compliance review's gaps

Ryan, on the [second 11-01 review](../compliance/2026-11-01-2.md)'s 5 gaps: *"fix 3-5, write both ADRs,
commit and push"*.

## The three fixes

- **`osv-scanner.toml`:** the local command now names v2.7.0. It still said v2.3.8 while claiming to
  match CI, and v2.3.8 reads only part of a pnpm 12 lockfile.
- **PROGRESS's pick-up block:** it now leads with what's actually open.
- **`contact-move.ts`:** `makeConstraint` and `makeContactMove` take `random`, defaulting to
  `Math.random`, as `drawAccommodation` does. Ids keep their format, and no caller changes. A new test
  checks the injected source reaches both ids. The module-level `seq` counter stays, so these two
  functions still aren't strictly pure: the same call gives a different id each time.

## The two ADRs

- [ADR-0073](../adr/0073-rung-three-here-means-fast-check-on-the-reducers.md): rung 3 here means
  `fast-check` on the screen reducers, and the solver keeps its seeded tests. The README says so next
  to the tier claim.
- [ADR-0074](../adr/0074-the-review-and-game-screens-wait-for-their-reducers.md): `#review` and
  `App.tsx` wait for their reducers, each until a stated condition. It replaces only ADR-0065's
  "planned next" timing, so 0065 stays Accepted, and its text is unchanged.

Both narrow what the standard asks of this repo rather than meet it. They make the position honest
and reviewable. Neither adds any test coverage.

## Next

The playtest lists in journals 11-01 (2) and (3), then PROGRESS's pick-up block.
