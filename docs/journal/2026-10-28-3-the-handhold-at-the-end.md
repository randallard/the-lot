# 2026-10-28 (3): the couple handhold at the end goes where the floor holds it

🧪 Exploratory, no ADR. **Uncommitted, with 10-28 (1) and (2)**; waits for Ryan's look.

Ryan: *"the belles arm at the end of the move is over lapping use a browser to take a look"*.

## What it was

Seen in Chrome at `#review2=right-and-left-thru/ryan-ryan`, beats 7.2–8: the two inside hands
tangled in front of the gent. From the bake, four Ryans at beat 8:

- The clasp was at x −16 cm, on **his** side of the couple. His right arm hung nearly straight
  down, and her left was lifted 70° sideways and reached 32 cm across, so her upper arm and elbow
  lay over his forearm.
- `clip` stayed 0 because a held pair's arms may touch (`planN`'s exemptions).
- Where it came from: through the courtesy turn her left hand is in his left, in front of him. The
  ordinary handhold (his right in her left) only has the last half beat, and nothing said *where*
  the hands should meet, so they met where her hand already was.

## The fix: aim the hold at `touchHold`'s spot

The floor already knows where a couple's handhold goes: `touchHold` (arm-pose.ts) gives its
height and how far in front (four Ryans: 47 cm high, 28 cm in front). So, in `whole-move-n.ts`:

- **`NHold.forward`**: the hands' midpoint is pulled, on the floor, to the midpoint of the two
  shoulders plus `forward` along the pair's mean facing. With `height`, that's the whole spot.
- **And the upper arms hang**: on a hold with `forward`, each elbow is pulled under its own
  shoulder, at a tenth of the hold's weight (`HANG`). That's touchHold's own derivation (Ryan,
  08-18: *"as if the upper arm is relaxed and hanging straight down"*). With the spot alone, the
  clasp went to the middle (x ±3 cm) but her elbow still swung out to x −15, past his.
- `metricsN`'s hand gap counts how far the clasp is from that spot, too.
- The gradient stays exact (`whole-move-n.test.ts`'s central-difference test passes).

`whole-move-rlt.ts`'s last hold takes `touchHold(gent, lady)`'s height and forward. Four Ryans at
beat 8 now: elbows under the shoulders (his at x −15, hers at +13), hands clasped at x ∓3 cm, 47 cm
up and 30 cm in front, the two of them side by side.

## Re-baked, all 25

Hands within 2.3 cm of the spot (sprout–myco the furthest), clip 0, jumps 18–27°, steps 9–29 cm.
**Ember ×4's 112° jump at sample 80, open since 10-28 (1), is gone (36°)**: it was this
hand-over.

Checked in Chrome, behind and to the side of both couples at beat 8: the inside hands meet low
in front between them, and no arm crosses the other's.

## Checks

`npx tsc -b` clean; eslint clean; vitest 38 failed (the known ones) | 1143 passed.

## Not done, noticed

Beat 0 has no handhold: the `facing` step's watch text says *"each in a handhold"*, but the first
hold is the pull-by. The same hold, from beat 0 until they let go to pull by, would match the end.

## Next

1. Ryan looks, then commit 10-28 (1)–(3) together.
2. The handhold at beat 0, if Ryan wants it.
3. Mixed sets: a cast picker, baked on demand or in a worker.
4. Spec facing couples and Right and Left Thru in square-one; swap the paths.
