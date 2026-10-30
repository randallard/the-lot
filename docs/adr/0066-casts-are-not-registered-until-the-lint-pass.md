# ADR-0066: No `any` registry until the strict lint pass has run
- Status: Proposed
- Date: 2026-10-30
- Deciders: Ryan (proposed by Claude, from the 2026-10-30 compliance review)

## Context
[ADR-1012](1012-strictness-extras-offered-at-project-start.md) asks every project to record
whether it adopts the `any` registry: every `any` and `as` justified inline and listed in
`docs/any-registry.md`. square-one adopted it (its ADR-0027) with one cast to register. the-lot
has about 160 `as` casts in `src/` (`grep '\bas [A-Z]'`), and the strict lint
(`strictTypeChecked`, ADR-1011) would flag 837 of its type assertions as unnecessary (a dry run on
2026-10-30). Most casts disappear in that pass; registering them first would be writing reasons
for code about to be deleted.

## Decision
Don't adopt the registry yet. Adopt it in the same change that turns on `strictTypeChecked`, when
the casts left are the ones the type system can't see past.

## Alternatives considered
- **Adopt now.** Lost: ~160 entries, most made moot by the lint pass.
- **Never.** Lost: the-lot is a UI-heavy app whose pose and solver code relies on casts at its
  edges, which is the case ADR-1012 says the registry is for.

## Consequences
- Until the lint pass, a cast needs no inline reason. The compliance review keeps the item open.
- Promotion: the lint pass lands, then a new ADR adopts the registry, superseding this one.
