# 2026-10-28 (2): the pull-by's hands join across; the top bar folds; the part card fades

🧪 Exploratory, no ADR. **Uncommitted, with 10-28 (1)**; waits for Ryan's look.

Ryan, on 10-28 (1): *"it's a start but the arms should be connecting across for the rt pull by -
try to fix that but also can you give me an opacity setting for the panel that dials in arm / body
positions - also make the top panel retractinle so I can close open it like adrawer"*.

## 🔴 The pull-by's "hands 0.1 cm" was two hanging hands

Correcting 10-28 (1)'s table: the scores were true and meant nothing. Read from the bake, four
Ryans' right arms stayed down the whole pull-by (raise ≈ 5°, forearm straight down, hand at 26 cm
off the floor). The right shoulders pass **17 cm** apart, so two hanging hands touch at the hip as
they go by, and the hold, the middle half of the window, was only 1.57–1.93 beats long. The
solver's `gravity` term on a held arm pulls it down, and nothing said where the hands should be.

**Fix (`whole-move-n.ts`):** `NHold.height`, how high the clasped hands are held. It's a cost at
the hold's weight on each hand's height, and it counts in `metricsN`'s hold gap. `startN` reaches
for it.

**And the window (`whole-move-rlt.ts`):** the right hands join at chest height (the lower shoulder
less 10% of the two upper arms; 88 cm for four Ryans) from when the shoulders come within 80% of
the two arms' reach (capped at 1.2 m), until 0.1 beat before the right shoulders draw level. It's
held at least half a beat. Each was tried:

| change | four Ryans |
|---|---|
| held to 0.3 beat after level | hands up, but both couples hang back **50 cm** at beat 2.0 (10-27's trouble again: held past the crossing, the hands trail) |
| let go at level | 26 cm |
| let go 0.1 beat before | **18 cm** (16 before the fix) |
| no 1.2 m cap | ember ×4 took hands at beat 0.3, 2.3 m apart |
| no half-beat minimum | sprout ×4 held for 0.1 beat (short arms, 30 cm each) |

`scripts/whole-move/try-pullby.ts <beau> <belle> [pullReach] [pullAfter]` solves one set and
prints the hands' gap and height every 0.2 beat, and where each dancer steps furthest off the
path. Four Ryans now: hands clasped (13 cm, two hand radii) at 88–89 cm from beat 1.4 to 1.6, coming
up from 0.8 and down by 2.4.

### Re-baked, all 25

Every set has hands within 1.4 cm and no clipping beyond 0.1 cm. Jumps are 18–29° and steps
9–29 cm. Better than 10-28 (1) nearly everywhere:

| set | 10-28 (1) | now |
|---|---|---|
| player ×4 | jump 78°, step 27 cm | 21°, 12 cm |
| ryan–player | jump 42°, step 24 cm | 20°, 16 cm |
| ember ×4 | hands 7.6 cm, jump 112°, step 62 cm | hands 2.1 cm, **jump 112°**, step 27 cm |
| four Ryans | jump 13°, step 16 cm | 21°, 18 cm (the arms move now) |

**Ember ×4's 112° isn't the pull-by:** it's sample 80, the end of the courtesy turn, the lady's left
arm (`toward`) as the left-in-left hold hands over to the ordinary handhold. It's the one set
still wrong. Its 2.1 cm gap is at sample 78, in the same place.

Seen in Chrome at `#review2=right-and-left-thru/ryan-ryan`, beat 1.6: both pairs' right arms up and
clasped across in front, at chest height.

## The top bar folds; the part card fades

- **Top bar:** a ▴ at its left folds it into a tab at the top edge (*▾ review2 · figure · pairing*).
  Click the tab to open it again. `Session.topOpen`, action `toggleTop`.
- **The body-part card:** a 👁 slider in its header sets its opacity, 15–100%, so you can see the
  dancer behind it. `Session.panelOpacity`, action `panelOpacity` (clamped in the reducer).
- Both are remembered per browser in `localStorage` (`townage-review2-view`), wrapped in
  try/catch. It's a view preference, not the work, so it isn't in the pose store or the save file.
  Reducer test added.

Checked in Chrome: the bar folds and opens, and the card fades and comes back. Both were put back
to open and 100% afterwards.

## Checks

`npx tsc -b` clean; eslint clean on the touched files; vitest 38 failed (the known ones) | 1143
passed.

## Next

1. Ryan looks at `#review2=right-and-left-thru/<pairing>`, then commit 10-28 (1) and (2) together.
2. Ember ×4: the courtesy turn's hand-over at sample 80 (112°).
3. Mixed sets: a cast picker, baked on demand or in a worker.
4. Spec facing couples and Right and Left Thru in square-one; swap the paths.
