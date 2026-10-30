# ADR-0067: Accessibility lint (jsx-a11y) for the HTML overlays
- Status: Proposed
- Date: 2026-10-30
- Deciders: Ryan (proposed by Claude, from the 2026-10-30 compliance review)

## Context
[ADR-1012](1012-strictness-extras-offered-at-project-start.md) asks whether a project adopts
jsx-a11y. the-lot is mostly a 3D canvas, which jsx-a11y can't check, but 41 files in `src/` render
HTML controls (`<button>`, `<input>`, `<select>`): the menus, the review screens' panels, the
voice test. Those are used on a phone as well as a desktop (`#voice-test`, 2026-10-30).

## Decision
Adopt `eslint-plugin-jsx-a11y` (its `recommended` rules) for the `.tsx` files, turned on with the
strict lint pass, so the fallout is fixed once.

## Alternatives considered
- **No a11y lint, as square-one** (its ADR-0028). That reason, no UI, doesn't hold here.
- **Turn it on now, alone.** Possible, but the overlays will change again in the lint pass.

## Consequences
- One more dev dependency (exact-pinned, minimumReleaseAge applies).
- The canvas itself stays unchecked; that's a design question, not a lint one.
- Promotion: if it proves noisy for game overlays, narrow the rule set in a new ADR.
