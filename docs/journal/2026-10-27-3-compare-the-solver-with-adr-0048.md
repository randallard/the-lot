# 2026-10-27 (3): compare the solver's reach with ADR-0048

🧪 Exploratory, no ADR. Ryan looked at 10-27-2 in `#review2`: *"I like the solver over 48 - but
let's compare before we supersede"*. 10-27-1 and 10-27-2 are committed (`82118b5`).

## What was built

- **`#review2`: a 🧪 solved checkbox** (session `baked`, default on, in each floor's `key`).
  - **On:** every couple with a bake dances it.
  - **Off:** the floor poses the couple itself, using its reshape (`sizeArch`), ADR-0048's reach
    (the forearm lengthens, and it's drawn) and its break.

  With the 🧪 twirl selector at reach or break, flipping the checkbox shows the same couple both
  ways.

## How to compare

For each couple worth a look, set the twirl selector to **reach** and play "the move as solved"
with **🧪 solved** on, then off. Watch for:

| | the solver (on) | ADR-0048 (off) |
|---|---|---|
| reach | both arm segments stretch, at a cost | the forearm lengthens |
| torsos | change over the call, meeting in the middle | one trade, sized once for the call |
| clearance | kept with a 6 cm margin, every sample | the floor's rules (`arm-pose.ts`) |

Couples to start with:
- **myco → ryan:** the solver stretches 2.3×.
- **ryan → myco:** the solver flips 145°.
- **player → ember:** clips 3.5 cm and the torsos change by up to 117 cm.
- **sprout → ember:** the held solve fails.

On 10-24 the floor's own ryan → ryan pose clipped on 35 of 41 samples (19 cm worst) with a
122° flip. The other couples haven't been measured on the floor.

## Next

- **Ryan's comparison.** If the solver wins, a new ADR supersedes ADR-0048 for baked couples (ADR-0048
  stays for the unbaked).
- **Optional, measuring the floor's own pose for all 25** the way 10-24 did (reading the rigs in a
  browser), for a table beside the solver's numbers.
