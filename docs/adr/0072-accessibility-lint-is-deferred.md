# ADR-0072: Accessibility lint is deferred until it supports ESLint 10
- Status: Accepted
- Date: 2026-11-01
- Deciders: Ryan ("2: defer it", 2026-11-01)

## Context
[ADR-0067](0067-accessibility-lint-for-the-html-overlays.md) adopted `eslint-plugin-jsx-a11y`
(recommended) "with the strict lint pass". When that pass landed (2026-11-01), a trial install of
the latest release, **6.10.2**, gave **96 findings in 28 files**: 48
`no-static-element-interactions`, 47 `click-events-have-key-events` (clickable `div`s) and 1
`no-autofocus` ([journal 11-01 (2)](../journal/2026-11-01-2-the-lint-pass-reaches-zero.md)).

Two things changed since 0067:

- 6.10.2 was published in October 2024, and its peer range stops at ESLint 9
  (`^3 || … || ^9`). Adopting it would pin the-lot to ESLint 9.
- The [2026-11-01 stance review](../reviews/2026-11-01-stance-review.md) found that ESLint 10 is
  how the minimatch advisory ignore (GHSA-g3hv-75wg-m249) can be retired: ESLint 9 is the only
  source of minimatch 3.

## Decision
Don't adopt jsx-a11y now. Revisit when a jsx-a11y release supports ESLint 10, or when the
overlays' keyboard and screen-reader use becomes a requirement, whichever comes first.

## Alternatives considered
- **Adopt it on ESLint 9 now** (ADR-0067 as written). This blocks the ESLint 10 move, and its 95
  clickable-`div` fixes change UI behaviour with no UI tests to catch a regression.
- **Fix the 96 by hand without the plugin.** That isn't enforced, so it drifts.

## Consequences
- Supersedes ADR-0067. The compliance review records the ADR-1012 a11y answer as "deferred, with
  a trigger" (✅ by ADR).
- The overlays stay unchecked for accessibility. They're used on a phone as well as a desktop
  (0067's context), so the trigger is worth watching.
- The stance review checks `npm view eslint-plugin-jsx-a11y peerDependencies.eslint` for `^10`.
