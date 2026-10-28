# 2026-10-28 (4): the couple handhold at beat 0 too

🧪 Exploratory, no ADR. **Uncommitted, with 10-28 (1)–(3)**; waits for Ryan's look.

Ryan: *"add the handhold at beat 0 too"* (noticed in (3): the `facing` step says *"each in a
handhold"*, but the first hold was the pull-by).

## What it is

`whole-move-rlt.ts`: the same hold as the end (his right in her left, at `touchHold`'s height and
forward, upper arms hanging), from an ease before beat 0, so it's at full weight on the beat.

His right hand is wanted for the pull-by too, so the handhold has to let go first. Each way was
tried:

| let go | result |
|---|---|
| as the pull-by eases on (four Ryans: beat 1.2) | sprout–myco's gent stepped **41 cm** off his path at beat 1.0, four Ryans' 25 cm: from beat 0 each couple widens for the ladies to pass, and the held hands fought it |
| by half a beat | steps back to (3)'s, but **ember ×4 jumped 86°** at beat 1.2: its pull-by starts at 0.7, and a 0.2-beat gap between the two holds set it off |
| **by half a beat, or straight into the pull-by if that comes within 0.3 beat after** | kept |

That's what you do on the floor: let go of your partner as you step forward.

## Re-baked, all 25

Clip 0, hands within 2.3 cm, jumps 18–27° (ember ×4 37°), steps 11–33 cm. Mostly as (3); ember–sprout
(21 → 33 cm) and player–ryan (15 → 23 cm) step a little further. `whole-move-n.test.ts`'s hold
list has the handhold twice now.

Checked in Chrome at `#review2=right-and-left-thru/ryan-ryan`, beat 0: both couples' inside
hands clasped in the middle, low in front.

`npx tsc -b` clean; eslint clean; vitest 38 failed (the known ones) | 1143 passed.

## Next

1. Ryan looks, then commit 10-28 (1)–(4) together.
2. Mixed sets: a cast picker, baked on demand or in a worker.
3. Spec facing couples and Right and Left Thru in square-one; swap the paths.
