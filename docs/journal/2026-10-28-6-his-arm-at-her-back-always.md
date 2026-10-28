# 2026-10-28 (6): his arm at her back, always

🧪 Exploratory, no ADR. **Uncommitted, with (5)**. It waits on square-one 0.7.0.

Ryan, watching (5): *"there should be a beaus arm at the lady s back right? I don't think that
came through"*, then *"put it in position even if it doesn't reach is what I want"*.

## What it was

(5) put his right hand on her back only **while he could reach it**: his shoulder within 95% of
his arm from the small of her back, over the longest such stretch of beats 2.5–5.5. That was
meant for ember–sprout. Measured over all 25 sets, it left **18 with no hand at her back at
all**, including ember ×4, sprout ×4, myco ×4 and player ×4. The 95% test was far too cautious:
solved, those hands sit 5–11 cm from the point, which is a hand's radius, so touching.

## Now

Two holds on his right hand:
- **A reach for the whole turn** (beats 2.5–5.5) at a fifth of a hold's weight (`BACK_REACH_WEIGHT`).
  It puts the arm round her back in every set, without forcing it where the arm is short.
- **The full hold** where he can reach, as (5).

Measured at beats 3, 4 and 5, hand to her back: four Ryans 11 cm, ember ×4 7, sprout ×4 5, myco
×4 9, player ×4 9, ryan–myco 11. Ember–sprout gets 22 / 10 / 22: the one pairing where her back
is at the edge of his arm (1.40 m shoulder, 0.52 m back, 0.94 m arm). In Chrome both ember gents'
right arms angle down round sprout's back.

## Re-baked, all 25

Clip 0, hands within 2.5 cm, steps 6–36 cm, and jumps 16–26° except **ember–sprout's 64°**. That
one isn't a visible snap. His forearm passes through hanging straight down (pitch −95° at beat
4.4), where a vertical forearm's heading is undefined and spins without the arm moving much. The
jump score counts the spin. Still worth a look in `#review2=right-and-left-thru/ember-sprout`.

`whole-move-n.test.ts`'s hold list has the back hold twice. `npx tsc -b` clean; vitest 38 failed
(known) | 1143 passed.
