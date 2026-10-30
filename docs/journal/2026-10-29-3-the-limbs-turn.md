# 2026-10-29 (3): the limbs turn

🧪 Exploratory, uncommitted, for Ryan's look. the-lot only; square-one untouched.

Ryan, on the pose jumps left from 10-29 (2): *"build the rule and re-bake"*.

## What it was

Four held twirl bakes jumped 108–117° between two samples (ember → player, ryan → player,
sprout → player, ember → sprout), all at t 0.40–0.475, mid-arch. The solver's smoothness is on
the dials, and `metrics`' jump is on the limbs' directions, so a limb could turn fast without the
smoothness noticing.

Building the rule turned up the real mechanism. With a 30° turn cap in place, ryan → player still
measured 150°: the solve had **shrunk the belle's upper arm through nothing** (0.22 → 0.01 →
−0.026 → 0.01 → 0.22 m) to flip her elbow across her shoulder. The committed bakes did the same:
ryan → player's belle −2.6 cm, ember → player −2.0, sprout → player −1.4, ember → sprout's beau
−10.7. The 108–117° jumps were that flip. Nothing held the upper arm's short side; `SHRINK` costs
only `w.range` per (fraction past 0.8×)², about 128 a sample at zero length.

## The rules

- **`FOLD = 0.25`** (whole-move): an upper arm shorter than a quarter of its length costs as the
  long side does, `OVER × w.clip`. Every other bake stays above half its length (myco ×2 0.47×).
  In `frameCost` and `frameCostGrad`.
- **`TURN_CAP = 45°`** and `turnCost` (whole-move, in `smoothCost`): past the cap, an upper arm's
  or forearm's turn between neighbouring samples costs `w.clip` per (cos cap − cos turn)². The
  side's sign drops out of the dot product, so it's four dials and a closed-form gradient.
  - 30° first. It held (ryan → player 31°), but myco → sprout and ryan → sprout fell into a worse
    valley (hands 13–15 cm, clip 2 cm, stretch 4.3×) and 16 seeds didn't get them out. At 45° both
    are back where they were (ryan → sprout cost 302, hands 2.4 cm). The flips are gone either way;
    the fold floor is what removed them.
  - No bake outside the twirl turns past 30°, so no other figure's solve changes.
- `bake-pair.ts --tries=N` (default `SCHEDULE.tries`, 4).

## The re-bake

All 25 meets, 25 breaks and ryan ×2's duck, at 4 seeds; the duck and the three player-belle meets
again at 16.

- **Jumps:** worst 117° → 45° (at the cap on ten meets). Breaks ≤ 24°.
- **Always held** (clean, stretch ≤ `REACH_LIMIT`): 4 → **7**: ember → ryan, player → ryan,
  player → sprout, ryan × 2, plus **ember → sprout** (2.05 → 1.99), **ryan → ember** (1.94 → 1.73),
  **myco → player** (2.37 → 1.90). ember × 2 is 1.47 but 2.2 cm hands, so still tossed.
- **The player belles:** ryan → player and ember → player stretch 2.1 → 1.7, and sprout → player
  3.25 → 2.47, but each clips 0.5–0.7 cm. Hers is the same everywhere: her own undrawn upper arm
  against her head at t 0.475 (ember → player: the beau's at t 0.8). Clean is ≤ 0.5 cm, so they
  stay tossed between reach and break, as before for sprout → player, newly for the other two.
- ryan ×2's duck: clean, hands 2.0 cm, stretch 2.06 (tossed, as before).

## Tests

- `whole-move.test.ts`: the term-by-term gradient check now draws upper arms from 0.1× (past
  `FOLD`); a new `turnCost` test checks the gradient by central differences and that level arms
  swinging 0.8 of the cap a sample cost nothing.
- `tsc -b` clean; suite at the 38 known failures, 1152 passed.

⏳ **Next:** Ryan looks at ryan → player and myco → player (now always held) in `#review2` →
commit. Then Star Thru.
