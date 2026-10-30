# 2026-10-29 (4): Star Thru, to step 5

🧪 Exploratory, uncommitted, for Ryan's look. On square-one's **unreleased** Star Thru (its journal
31; `node_modules/square-one` is linked to the sibling checkout by `link-engine.mjs`). Needs a
square-one release and pin before it can be committed here.

Ryan, on how users will build moves: *"a list of current moves the user can choose from like blocks
and keyframes start there then the user can set more detailed keyframes from there"*, and *"build it
that way, stop at step 5"*. The flow, as agreed:

1. pick blocks (or an existing call) · 2. add holds and their class · 3. the engine draws the floor
paths · 4. a starting shape from the hold's class, solved and baked as a rough start · 5. **Ryan's
keyframes in `#review2`** · 6. re-solve on his targets and bake all 25.

Steps 1–3 are square-one's. This is step 4, and the plumbing so step 5 can happen.

## The floor learns a call that changes formation

- `floor-calls.ts`: `FloorCall = CallName | "star-thru"`. square-one keeps Star Thru out of `CALLS`
  (it starts a pair and ends a couple), so the floor, the headless paths and the review figures name
  a call by this.
- `useDancePerformance`: `call: "star-thru"` dances `applyStarThru("a", …)`, `a` the man and beau,
  sized to the couple width the floor already computes, so the keys match the couple case.
- `figurePaths("star-thru", …)`: the same, headless.
- `DanceFloor`: the couple-only bake join narrows on the sequence itself (a type fix), and Star Thru
  gets **`archPassClearance`** (`passing.ts`): the bodies' clearance, not `passingClearance`'s wider
  of bodies and hanging arms, because passing right shoulders his passing-side arm is up in the arch.
  The floor and `figurePaths` read the same function, so the bakes play on the paths they were
  solved on.
- `review-steps.ts`: a **Star Thru** figure (facing · palms join · under the arch · couple), so it's
  in `#review` and `#review2`.

## The solve: `whole-move-star-thru.ts`, `bake-star-thru.ts`

- `starThruMove`: the hold (beau's right, belle's left), **over her head** (`Move.over`) for
  t 0.5–0.9 round the crossing at 0.75, a guide arc from eye level up over her crown at 0.75 and
  down to the handhold, `meet` growth, and `stepCap` 10 cm as `solve-all`'s figures.
- 🔴 **The pair start 2.2 m apart**, more than two arms span. Held from beat 0, the first solve shoved
  the beau 77 cm. So the hands **reach** (a break's weak pull) until the held shoulders are within
  0.9 of the two arms' length (`joinAt`, t ≈ 0.5–0.7 on the cast), then hold. The engine says joined
  from beat 0; this is the floor's reading of "as the dancers move forward".
- 🔴 **Straight paths walked the bodies through each other** (centres 20 cm apart at t 0.6). That
  went back to square-one as `step-pivot`'s `bow` (journal 31). With it, ryan ×2: clip 0, hands
  1.9 cm, stretch 1.74, worst jump 26°, step 10 cm.

## All 25, rough

`bake-star-thru.ts` (best of 4; ryan → sprout again at 16, hands 25 → 3.9 cm):

- **Clean: 6.** ember × 2, ember → player, ember → ryan, ember → sprout, ryan × 2, ryan → ember.
  Clean and stretch ≤ 2, so always held: 5 (ryan → ember stretches 2.42).
- The rest reach (stretch 2.2–4.8) or clip (player → sprout, sprout → myco 1.7 cm).
- Worst jumps sit at the 45° cap on most; the growth is the twirl's `meet` (belles shrinking up to
  1.31 m against ember), as the twirl's bakes do.

This is the rough start step 4 promises. The shape is the guide's; Ryan's keyframes are what it's for.

## Tests

`tsc -b` clean; suite at the 38 known failures, 1152 passed (`review-steps.test.ts` dances Star Thru
with `applyStarThru`).

⏳ **Next (step 5):** Ryan, in `#review2`, Star Thru: set keyframes (the arch's height and offset to
his right at "palms join", her turn under it), and accept. Then step 6: re-solve the 25 on his targets
(`setKeys` → targets, as the twirl's 10-26 work) and bake. Then square-one release + pin.
