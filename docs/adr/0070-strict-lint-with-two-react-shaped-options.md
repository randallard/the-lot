# ADR-0070: The strict lint pass runs `strictTypeChecked` with two options relaxed for React, and lints `scripts/` without types
- Status: Accepted
- Date: 2026-10-31
- Deciders: Ryan (options chosen from Claude's measurement, 2026-10-31)

## Context
ADR-1011 (inherited) sets the lint bar: `tseslint.configs.strictTypeChecked`, plus
`no-non-null-assertion`, `switch-exhaustiveness-check` and `no-floating-promises` at error, and
zero warnings. square-one, a library with no UI, meets it without options.

Measured on the-lot after the tsconfig flags (`a328375`), that bar gave **1,756 findings in 161
files**. Two rules accounted for 536 of them, and neither finding was a defect:

- **`no-confusing-void-expression`: 367** were React handlers in arrow shorthand,
  `onClick={() => setX(1)}`. The autofix wraps each one in braces. That's the idiomatic React
  form, and the rule's purpose (catching a void value used *as* a value) isn't at stake in a
  handler, which returns nothing either way.
- **`restrict-template-expressions`: 133** were numbers in template strings, mostly
  `` `${px}px` `` in inline styles and `` `${n}` `` labels. A number stringifies one way.

Separately, the 17 TypeScript files in `scripts/whole-move/` (bake and solve tools, run with
`npx vite-node`) are in no tsconfig, so typed linting can't parse them. Giving them a tsconfig
found one real issue that isn't a lint fix: `solve-all.ts` types `Job.call` as square-one's
`CallName`, but the review figures now include Star Thru (`FloorCall`), and `figureMove` (typed
for the five original calls) gets it anyway. How that tool should treat Star Thru is a dance
tooling question.

## Decision
The-lot's strict lint is `strictTypeChecked` plus ADR-1011's three rules, with two options set:

- `@typescript-eslint/no-confusing-void-expression`: `{ ignoreArrowShorthand: true }`.
- `@typescript-eslint/restrict-template-expressions`: `{ allowNumber: true }`, with every other
  `allow*` option stated as `false`. Setting one option replaces the preset's options with the
  rule's defaults, and those allow `any`, booleans and nullish values. Unstated, `allowNumber`
  alone would have silently allowed all of those too.

`scripts/**/*.ts` is linted with `tseslint.configs.disableTypeChecked`, so it gets the untyped
rules (including `no-non-null-assertion`) and not the typed ones.

Everything else in ADR-1011 holds: the three rules at error, zero warnings, the preset otherwise
unchanged. `eslint.config.js` switches to this config when the count reaches zero. Until then the
fixes land in batches that are valid under the current config, so CI stays green throughout.

## Alternatives considered
- **Autofix the 367 handlers and wrap the 133 numbers in `String()`.** No behaviour change, but
  about 500 edits across ~60 files that make React code less idiomatic and catch nothing.
- **Give `scripts/` a tsconfig now.** It works apart from the one `solve-all.ts` mismatch, which
  needs a decision about the tool, not a cast. Revisit when that's decided.
- **Turn the strict config on now and fix behind a red CI.** It would hide the next real failure
  for as long as the pass takes.

## Consequences
- The pass is 1,180 findings, not 1,756. The bulk is 901 non-null assertions (about 390 in
  `whole-move.ts` and `whole-move-n.ts`), 70 unnecessary conditions, about 110 `no-unsafe-*`
  findings from `any`, and the 25 `exhaustive-deps` warnings, which must reach zero too.
- A handler that *returns* a value through shorthand isn't flagged. That's the accepted cost.
- Numbers in template strings aren't checked for `NaN` or `Infinity`, which they weren't before
  either.
- The scripts don't get typed lint rules until they have a tsconfig.
- **Promotion conditions:**
  - If a handler's shorthand return turns out to hide a bug, drop `ignoreArrowShorthand` in a new
    ADR.
  - When `solve-all.ts`'s Star Thru question is settled, give `scripts/` a tsconfig (strict flags,
    `vite/client` and `node` types), lint it with types, and supersede the third part of this
    decision.
