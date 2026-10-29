# 2026-10-28 (11): the Allemande folds

🧪 Exploratory, uncommitted, for Ryan's look (*"work on the Allemande elbow fold"*). Needs square-one's
uncommitted arm-turn change (its journal 29); commits after square-one 0.10.0 and the pin.

**22 of 25 Allemande Lefts are clean and baked** (were 0). Report:
[`solve-all/2026-10-28-allemande-folded.md`](../solve-all/2026-10-28-allemande-folded.md).

## It wasn't the solver's elbow

10-28-10's guess was that the solver's elbow wouldn't fold the way the floor's pose does. Measuring
the floor's own pose (`scripts/whole-move/try-fold.ts`): `gripPose` pins each forearm to the pivot
and lets the undrawn upper arm stretch to suit (ADR-0017), and on the engine's paths that upper arm
was **1.16–3.06× its length**. The floor was never holding a grip a real arm could; nobody sees the
upper arm, so nobody saw it. Five causes, in the order they came out:

1. **The pair breathed** (square-one). `arm-turn` walked chords between quarter marks: separation
   0.905–1.280 on ryan ×2, a ratio of exactly cos 45°. Fixed upstream: a mark every 7.5°
   (ADR-0022's rule, which `orbit` got in August and `arm-turn` didn't).
2. **The step out began with the grip held** (square-one): radius opening from beat 7, grip to 7.5,
   up to 4.2× an upper arm. Fixed upstream: the circle holds until the release.
3. **The radius was the floor's, not the arms'.** `pairGripRadius` reads `gripPose`. New
   `armTurnGrip` (`forearm-hold.ts`) sizes it from the solver's skeletons: each upper arm raised
   35° (`ARM_TURN_RAISE`) and reaching part way toward the partner, the elbows a forearm apart,
   **shoulders where the body has them** (ember's are 22 cm forward, and facing opposite ways the
   two offsets add across the line). Hanging straight down at the resting elbow, the old grip
   height, left the elbow no room at all. The pair's height trade comes out of it too: the `meet`
   tie (same share of each height) solved for both elbows on one height. `engine-paths` and
   `DanceFloor` both walk this radius now, so the bakes fit.
4. **The solve's own shape was wrong for a forearm grip** (`whole-move.ts`):
   - It started both hands reaching for one point (the twirl's start). New `forearmStart`
     places the elbows and aims each forearm at the other's elbow (`armThrough`, explicit IK).
     ryan ×2: cost 456 → 45.
   - Its best answer from the old start was **forearms shrunk to 0.15×**, hand on its own
     elbow, the arm flipping 178°: stretch cost the same both ways. New `SHRINK` (0.2): past a
     fifth shorter, a segment costs like an angle out of range. In the readable cost and the
     exact gradient; the gradient test's random arms now reach 0.5× so the term is in play.
   - The grip was centred over the two bodies; with unequal shoulders (ryan's 46 cm off centre,
     sprout's 20) that point was out of sprout's 10 cm arm's reach. Now over the two **held
     shoulders**, readable and gradient.
   - A thick forearm couldn't clasp: the wrist behind a hand on the partner's elbow lies on
     that upper arm, and the 2 cm held margin there is 22 cm between axes on ember's 10 cm
     forearms against a 10 cm clasp. Exempt (forearm on partner's upper arm), in `exempt` and in
     `planOf`'s table. The first run with only `exempt` changed gave identical numbers: the
     gradient keeps its own table.
5. **solve-all's setup**: the 6 cm margin is the arch's (hands round heads) and now applies only
   to non-forearm holds; forearm grips use 2 cm. The Allemande solves with `meet`, its trade from
   `armTurnGrip` seeded into the start and eased in over the step-in and out over the step-out
   (left to find it, player → myco traded the wrong way once myco's arm went overhead).

Progress over the runs: 0 → 2 → 5 → 10 → 12 → 15 → 17 → 22 clean.

## Left (3)

- **sprout ↔ ember**, both ways: a metre of height between them (ember 2.16 m, sprout 1.17), the
  trade 16 cm up and 30 down, and sprout's 10 cm upper arm still 1.5×. Hands 2–3 cm.
- **ember ×2**: hands 3.1 cm and a 38° forearm swing at the grip's first sample, the step-in,
  where the body turns 90° in a beat. The hands close a sample later.

## Checks

- `tsc -b` clean; the suite back to the 38 known failures, 1149 passed (3 new `armTurnGrip` tests).
- Two `arm-geometry` tests asserted the breathing ("breathes at the bodies, not at the grip") as a
  premise; they now assert the opposite: within 1% of a scale unit while gripped.
- `solve-all` over every figure: Partner Trade, Dosado and Pass Thru still 25/25 clean with
  `SHRINK` in.
- `#review=allemande-left/grip/ryan-ryan` and `/half/player-myco`: baked solve drawn, rules kept;
  player-myco wears the trade (−10.8 / +11.4 cm).

## Scratch

`scripts/whole-move/try-fold.ts` (the floor's pose on the engine's paths, per dancer and phase),
`try-fold-one.ts` (one solve, sample by sample), `try-fold-terms.ts` (one frame's cost by term,
and which parts touch).

⏳ **Next:** Ryan looks → square-one 0.10.0 → pin → commit. Then sprout ↔ ember and the step-in.

## Committed

Ryan: *"commit it, release and pin"*. square-one released as **v0.10.0** (`9fe350f`); the pin and
the allowBuilds hash moved to it. Validated against the fetched tarball (`SQUARE_ONE_NO_LINK=1`):
`tsc -b` clean, `vite build` clean, 38 known failures / 1149 passed. The link is restored.
