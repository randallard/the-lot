# 2026-10-31 (18): the test files, batched

Ryan: *"start batching the test files."* After 10-31 (17) the tests held 236 findings across 36
files: 219 `!` and 17 others. All 36 are now at 0.

## The `!`s (219): mostly scripted

A script (in the session's scratchpad, not committed) rewrote the three shapes into
**`defined(expr, "expr")`**, using the expression's own source as the name, so a missing value
fails saying exactly which read it was:
- index reads (`x[i]!`, including chained `a[k][i]!` and spread `...t[0]!`): 155;
- names (`a!`): 43;
- calls (`m.get(k)!`, walking back over a callee's balanced brackets): 21.

It added the import to each file. The first run mangled chains like `f(x).find(…)!` (the callee
walk stopped at a `)`) and missed `...t[0]!`, so it was reverted and re-run once fixed. What it
couldn't do (12 left: index reads on call results, a trailing `.parent!`, a multi-line chain) was
done by hand, with plain names ("the first keyframe", "the torso").

## The other 17, by hand

- **`contact-move.test`'s `meetAt`** got its `c ? … : gripHeight(…)` fallback back. My
  10-31 (5) `defined()` had made the fallback dead.
- **`join-arc.test`**: two casts gone (`as Record<string, never>` and `as unknown as {grips…}`),
  since `flattenSequence` already returns `Record<string, Motion>`.
- **`baked-four.test`**: the `=== "right-and-left-thru"` guard looks always-true only because RLT
  is the only solved figure today. It's kept by comparing against a `string`-typed constant, with
  a comment.
- **`expect(spanAt([], 1))` and `keyframeHere(s, [])`**: an empty literal inferred `never`, so
  they now take an explicit element type.
- **`unbound-method`**: `vi.spyOn(el, "setPointerCapture")`. In `parse-results.test`, one
  `replaceState` mock, cleared per test and asserted on directly.
- **`expect.closeTo`** (`any`) became `toBeCloseTo` on `x` and `toBe` on `y`.
- **`fetch-pending-results.test`**: `mockFetch` is `vi.fn<(input: string, init?: RequestInit) =>
  Promise<unknown>>()`. Typing it `typeof fetch` broke the partial `Response` stubs.
- The rest: `String()` for an optional in a template, a redundant `String(CASUAL)`, a needless
  `?.`, and `Object.values` behind a `valuesOf(o): unknown[]`.

## Checked

The same results: 63 files, **1,240 pass, 29 expected fail, 3 skipped**. `tsc -b` is clean;
`pnpm lint` has 0 errors and 8 warnings; the build passes. **The strict count: 516 → 280.**

## Next

The scripts batch (`scripts/whole-move/*.ts`, untyped lint per ADR-0070), then services and
overlays, then the unnecessary-condition and unsafe groups.
