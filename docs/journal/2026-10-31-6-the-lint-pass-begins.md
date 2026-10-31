# 2026-10-31 (6): the strict lint pass begins

Ryan: *"start on the lint pass."* This is the last of the three steps before provable-lite
(ADR-1011).

## Measured, and two choices

`strictTypeChecked` plus ADR-1011's three rules, measured after the tsconfig flags: **1,756
findings in 161 files**. 536 of them came from two rules, and neither was a defect: 367 React
handlers in arrow shorthand (`no-confusing-void-expression`), and 133 numbers in template strings
(`restrict-template-expressions`). Ryan chose to allow both (*"Allow arrow shorthand"*, *"Allow
numbers"*), recorded in
[ADR-0070](../adr/0070-strict-lint-with-two-react-shaped-options.md).

🔴 A trap worth remembering: setting `{ allowNumber: true }` alone replaces the strict preset's
options with the rule's loose defaults, which allow `any`, booleans and nullish values too. The
count dropped to zero for that rule, which gave it away. The config states every other `allow*`
as `false`.

## The tooling

- `eslint.strict.config.js` is the target config. It extends `eslint.config.js`, and `pnpm
  lint:strict` measures it. `pnpm lint` and CI are unchanged. When the count reaches zero it
  becomes `eslint.config.js`. Fixes land in batches valid under both configs, so CI stays green.
- `scripts/whole-move/*.ts` is in no tsconfig, so it's linted without types (ADR-0070). Giving it
  a tsconfig found one real issue for Ryan: **`solve-all.ts` types `Job.call` as `CallName`, but
  the review figures include Star Thru, which reaches `figureMove` (typed for the five original
  calls) and runs its generic path.** How that tool should treat Star Thru decides whether
  `scripts/` gets typed linting.

## First batch: 88 autofixes

`no-unnecessary-type-assertion` and `no-unnecessary-template-expression`. Removing a type
assertion can't change runtime behaviour, since TypeScript erases them. In 5 files
(`FistBumpDriver`, `whole-move.ts`, `ContactMovePreview`, `emotes.ts`, `sound-alike.ts`) the fix
removed casts that steered inference (object literals as `RoleResolution`, strings as `Easing`)
and broke the typecheck, so those files were reverted and left for hand fixes. That leaves 26
files changed. `tsc -b --force` is clean, `pnpm lint` has 0 errors and the same 25 warnings, and
the tests pass (1,240).

## Where it stands: 1,180

| Rule | Count |
|---|---|
| `no-non-null-assertion` | 901 (about 390 in `whole-move.ts` and `whole-move-n.ts`; 23 in `scripts/`) |
| `no-unnecessary-condition` | 70 (some are 10-31 (5)'s "can't happen" guards) |
| `no-unsafe-*` (from `any`) | about 110 |
| `restrict-template-expressions` | 25 (`any`, unions, `undefined`) |
| `react-hooks/exhaustive-deps` | 25 warnings, which must reach zero too |
| other | about 45 |

## Next

1. The `!` assertions, file by file, starting with `whole-move.ts` and `whole-move-n.ts`. Prefer
   tuples and narrowing over guards; the `defined()` helper is for tests.
2. The `no-unsafe-*` group: type the `any` at its source.
3. ADR-0067's `eslint-plugin-jsx-a11y`: install it and measure.
4. At zero: swap the configs, add `--max-warnings 0`, run ADR-0066's cast-registry pass, then
   claim provable-lite.
