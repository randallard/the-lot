# 2026-10-31 (8): whole-move-n.ts, and the shared-helper trap

Ryan: *"start on whole-move-n.ts."* It had 189 findings, all `!`, and the same kernels as
`whole-move.ts`, now for N dancers.

## The trap, measured

I made 10-31 (7)'s `rd` generic and exported it for `whole-move-n` to import. The output was
byte-identical, but a four-dancer bake (`bake-four.ts <beau> <belle>`, which writes into the
committed `src/dance/baked-four/`, so a re-bake can be compared byte for byte) went from **5.3 s to
26.5 s**. Two causes:

1. **One generic for every array kind.** `rd` read Float64Arrays, a number tuple and arrays of
   objects (`m.bodies`, `m.frames`, plans), so its `a[i]` stopped being optimised. Splitting it
   into **`rd(a: Float64Array, i)`** and **`nth<T>(a: readonly T[], i)`** brought the two-dancer
   solve back to about +2%, but the bake still took ~20 s.
2. **Importing it.** Under vite-node, which the bakes run on, an imported call is a property read
   through the module namespace, and V8 can't inline it in a hot loop. Giving `whole-move-n.ts`
   **its own copies** of `rd` and `nth` brought the bake to **5.8–6.0 s**. The production Rollup
   build binds imports directly, but the bakes are where the solver does its heavy work.

So both files declare `rd` and `nth` locally, unexported, with a comment saying why. This
corrects 10-31 (7)'s single `rd`, whose numeric uses are unchanged.

## Result

- `whole-move-n.ts`: 189 → **0**. 146 reads use `rd`, 43 use `nth`.
- `whole-move.ts` still at 0. Its four `SHAPE_PTS` reads moved to `nth`.
- Four-dancer bakes (ember ×4, myco/player, ryan ×4): **byte-identical**, ~10% slower
  (5.3 → ~5.9 s).
- Two-dancer twirl solve: **byte-identical**, ~2–6% slower.
- `tsc -b` clean; `pnpm lint` 0 errors and the same 25 warnings; 1,240 tests pass; build passes.
- **The strict count: 983 → 794.**

## A rule for the rest of the pass

In a hot loop, a checked read needs one array kind per helper, and the helper must be local to
the module. Everywhere else, a guard or a better type is fine.

## Next

The remaining `!`s by file (`App.tsx`, `EmoteBuilderModal.tsx`, `chain-join.ts` and its test,
`arm-pose.ts`, …). Then `no-unsafe-*`, `no-unnecessary-condition` and the 25 warnings.
