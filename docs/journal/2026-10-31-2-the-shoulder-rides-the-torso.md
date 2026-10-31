# 2026-10-31 (2): the shoulder rides the torso

Ryan: *"fix the shoulder bug"*, the likely bug 10-31 (1) found while sorting the 38 tests.

## The bug

`layout.shoulderY` (2026-09-19) is measured from the body's **centre**. Growing a torso (an emote's
`bodyHeightDelta` or `bodyRadiusDelta`, a reshape's `growBody`) moves its top by half the height
change plus the radius change, but left an authored shoulder where it was. So on Myco, the one body
with an authored shoulder, every grown torso had its arms attached partway down it: the very defect
`expression-channels` was written for ("arms detached from torsos"), back for her.

## The fix

`resizeBody(shape, height, radius)` in `body-shapes.ts`: resizes the torso and moves an authored
shoulder with its top. Used by `mergeAnimation` (emotes) and `growBody` (accommodations, the arch,
the floor). Bodies without an authored shoulder are untouched (their shoulder is the top), and
the body editor, where the shoulder is authored, isn't involved. The whole-move solver's own model
(`bodyOf`'s rise rates) measured growth the old way, "half for a body with an authored
`shoulderY`", and now uses `resizeBody` too, so solver and floor agree.

## What it touched

- **Findings resolved (3):** `expression-channels`' shoulder test and two arch tests (*makes the
  arch, and both dancers keep hold*, *leaves a pair who could already dance it exactly where they
  were*) pass again: the bug was behind them. Back to ordinary tests.
- **A test made exact:** *never rises above what BOTH of them can reach* approximated the reach
  bound (lateral 0, the beau's side for both). With Myco's shoulders on her grown torso (Myco +0.75
  under Ember) the join came out 8 mm over the approximation with both hands on it (gap 2e-16). The
  bound is now `planArch`'s own: the plan's separation, lateral, each dancer's own side.
- **One new finding:** the duck's overhead join (Myco +0.93, Ember −0.93). Myco now reaches higher,
  the planner raises the join (Ember's target 1.30 → 1.34), and that's the edge of shrunk Ember's
  overhead reach: her drawn hand drifts 0.21 off her centre under the arch (was 0.11). The old pass
  leaned on the bug. Kept as `it.fails`: an overhead join shouldn't aim at the edge of the belle's
  reach (arch review).
- New tests: an authored shoulder keeps its distance below the top through growth and through a
  radius change; a body without one is untouched.

## The bakes

27 baked tracks have Myco growing (up to 1.36 m), solved for her old shoulders, so they'd have
drawn her hands off target. Ryan chose to re-bake them, each with the script and options it was
made with (from its note): 9 Allemande (`solve-all.ts --bake`, all clean), 9 twirl `meet`
(`bake-pair.ts --only=held`; the breaks don't grow), 9 Star Thru (`bake-star-thru.ts`, no targets,
as the rough bakes were). Worst hand gap, before → after:

- **Allemande:** unchanged within 0.4 cm (0.4–1.3 cm).
- **Twirl `meet`:** better or level everywhere: myco-myco 19.4 → 6.3, myco-ember 9.0 → 6.8,
  sprout-myco 7.7 → 5.9, ryan-myco 5.8 → 4.7.
- **Star Thru, mixed:** better on 5 (ryan-myco 5.8 → 4.1, player-myco 5.1 → 4.1, ember-myco
  5.6 → 4.7…), **worse on 4**: myco-myco 5.4 → 19.5, myco-player 2.2 → 10.2, myco-ember 3.5 → 8.5,
  sprout-myco 6.6 → 6.7 (clip 1.8 cm). Retried with 12 seeds: no better; the solver keeps its
  lowest-cost solve, not the smallest gap. Myco as beau grows up to 97 cm there, and with her arms
  now on her real shoulders some solves can't keep the hands as close. The old numbers were on the
  wrong geometry. These are the rough Star Thru bakes awaiting Ryan's keyframes anyway.

Suite: 1240 passed, 29 expected fail, 0 failing; `tsc -b` and lint clean.

## Next

Ryan: look at Myco's grown figures in `#review2` (twirl `meet`, Star Thru, the Allemande), worst
first: Star Thru myco-myco and myco-player. Then the Star Thru keyframes, which re-bake these anyway.
