# 2026-10-31 (7): whole-move.ts's reads are checked

Ryan: *"start on whole-move.ts."* It was the biggest file in the strict lint pass, with 197
findings, 182 of them `!`.

## The kernels, and Ryan's choice

The `!`s weren't scattered. 181 of them read the solver's flat buffers (`PTS`, `GPT`, `JAC`,
`grad`, `v`, `P`, `SHAPE_PTS`, `SEG_N`, `SHAPE_R`) at computed indices that are in range by
construction. I measured three replacements on a seeded solve (`solve.ts
ryan-ryan-twirl.paths.json --seed=1`, deterministic apart from ids and timestamps), interleaved
3 rounds:

| Form | Time | Out-of-range index |
|---|---|---|
| `X[i]!` (before) | 4.20–4.26 s | `NaN` flows on |
| `(X[i] ?? NaN)` | 4.24–4.26 s | `NaN` flows on, the same as before |
| `rd(X, i)` | 4.42–4.50 s (~6%) | throws a `RangeError` naming the index |

All three give a byte-identical solve. Ryan: **`rd()`**, so an arithmetic bug fails where it
happens. `rd` sits beside `clamp01` in `whole-move.ts`, and `whole-move-n.ts` will use the same
form.

## The rest of the file

- `heldArms`' `arm` takes `side: 0 | 1`, since that's what a hold's `beau` and `belle` are.
- The head lookup throws if `shapesOf()` ever gives no head, which it always does.
- A dial key's `{ dancer, side }` is `as const`, not two `as 0 | 1`. Plain removal (the autofix's
  attempt in 10-31 (6)) widened them to `number`.
- `toDials` iterates `[0, 1] as const`, so `SIDES[side]` is never `undefined`.

**whole-move.ts: 0 findings.** Checked:
- `tsc -b` is clean, and `pnpm lint` has 0 errors and the same 25 warnings.
- The tests pass (1,240).
- The seeded solve is byte-identical to the baseline.

**The strict count: 1,180 → 983.**

## Next

`whole-move-n.ts` (about 190 findings, the same kernels: use `rd`), then the rest of the `!`s,
file by file.
