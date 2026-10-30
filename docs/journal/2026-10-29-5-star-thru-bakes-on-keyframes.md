# 2026-10-29 (5): Star Thru bakes on keyframes (step 6's plumbing)

🧪 Exploratory, uncommitted, still on square-one's **unreleased** Star Thru (linked checkout).
Follows [10-29 (4)](2026-10-29-4-star-thru-to-step-5.md).

## Where the flow is

The custom-move flow from (4): 1 blocks · 2 holds · 3 engine paths · 4 rough solve and bake ·
**5 Ryan's keyframes in `#review2`** · 6 re-solve on them, bake 25. Steps 1–4 are done. Step 5 is
Ryan's. This entry gets step 6 ready, so it can run as soon as there are keyframes.

## How Ryan wants to go through it

Ryan asked: *"can we do a keyframe one couple, bake, apply, review, keyframe another couple, bake, …
repeat?"* Then: *"let's move forward with the plan we're on"*. The plan, using `#review2`'s layered
timelines (`pose-events.ts`):

1. **General keyframes first, on ryan × 2** with no couple highlighted (scope `all`, so they reach
   every couple that isn't locked). ryan × 2 is the pair the rough solve was tuned on, and it's
   clean (clip 0, hands 1.9 cm, jump 26°). Set the arch's height and how far it sits to his right
   at "palms join", and her turn under it.
2. **Bake all 25** on that export (below). Review them on the floor and in `#review2`.
3. **Then one couple at a time, worst first:** highlight the couple and add keyframes for it alone,
   re-bake that pairing, review it, and lock it once it's right. Then the next couple. Worst in the
   rough bake: player → sprout and sprout → myco (clip), then the couples that reach (stretch
   2.2–4.8). A locked couple's keyframes pull 10×.

This is the per-couple loop Ryan asked for, run only on the couples that need it after the
general pass.

## `bake-star-thru.ts --targets`

- `--targets=<bundle>`: a `#review2` 📂 export. The `star-thru` figure's timeline for the pairing
  is folded as `#review2` folds it (general, then the pairing's overrides). Each dial he **set**
  becomes a pull (`targetsFromKeyframes`), passed to `starThruMove`, which already took targets.
  Locked or locked-behind pairings pull 10×, as in `solve.ts`. `--target-weight` scales the pull.
- The bake's `note` records how many keyframes it was steered by. Dials that aren't solver variables
  (head, torso, hands) are listed as left out.
- The usage comment has the all-25 loop.

Checked: a scratch bundle with one general keyframe (beau's upper-arm raise 150° at t 0.75, plus a
head nod) baked ryan × 2. The keyframe was read, the nod was reported as left out, and the solve
came back clean (clip 0, hands 1.9 cm, jump 26°). The original bake was restored afterwards, so the
25 on disk are still the rough ones from (4). The scripts aren't covered by `tsc -b`, so running it
is the check.

## Open: can users solve?

Ryan asked whether the solver is available to users. **Not today.** Solving and baking are dev
scripts that write JSON into `src/dance/baked/`, and the game ships those. The solver is plain
TypeScript with a browser worker (`whole-move.worker.ts` / `whole-move-client.ts`, 10-26), but
nothing in the app calls it. `#review2` is a dev screen. For users to build moves through this flow,
the game would need an in-app solve wired to that worker and somewhere to keep each user's bakes
besides the repo. Browser solve time hasn't been measured. Ryan hasn't decided this. It should be
settled before step 6's shape hardens into scripts only.

⏳ **Next:** Ryan, step 5 in `#review2`: general Star Thru keyframes on ryan × 2, then 📂 export.
Then bake all 25 with `--targets`, review, and fix couples one at a time, worst first. Then
square-one release + pin, commit.
