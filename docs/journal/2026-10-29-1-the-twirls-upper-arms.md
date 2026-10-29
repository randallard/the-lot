# 2026-10-29 (1): the twirl's upper arms

🧪 Exploratory, uncommitted, for Ryan's look (*"k do it"*, after 10-28 (12) found the twirl's long
upper arms). the-lot only; square-one is untouched.

**All 50 twirl bakes re-baked (25 pairings, `meet` and `break`, plus ryan ×2's `duck`). Upper arm
past its length: 52 bakes → 1**, and that one is the legacy `california-twirl.ryan-ryan.json`, which
the floor never picks (it always asks `chooseBake` for `meet` or `duck`, and both exist).

## What was wrong

The scan (the floor's length rule, drawn upper arm against `upper0`) didn't find two bad bakes, it
found **every** twirl bake over: breaks 2–24 cm, meets 3–56 cm. They were baked 10-27, before the
solver costed an upper arm past its length (10-28 (12)): stretch alone, at weight 6, was cheap. The
worst, myco → ember `meet`, drew Ember's arched arm with an **89 cm upper arm and a 131 cm forearm**
while her other forearm went to **−10 cm**. Not ADR-0048's reach (the forearm reaches); a bad solve.

## What changed

- **Re-baked under today's solver** (`bake-pair.ts`, unchanged): breaks all under 0.4 cm at once;
  15 meets still 1.5–3.5 cm over. A clip-weighted cap is quadratic, and under the arch the hold
  pulls hard enough to buy a few centimetres.
- `whole-move.ts`: **`OVER = 10`**, the upper-arm cap at ten clips (readable cost and gradient), as
  solve-all's step cap is ten. Re-baked the 15 and the duck: **all meets ≤ 0.8 cm**.
- The other figures under `OVER`: solve-all 100/100 clean, no outliers (Allemande worst hands
  1.3 cm, jump 20°). Their bakes are already under the skin and stay.

## What it did to the twirl

The forearm carries the reach now. Against the 10-27 bakes:

- **Clip:** meets were up to 4.5 cm; now 0 everywhere.
- **Floor always holds (clean, stretch ≤ `REACH_LIMIT`):** 6 → 9 pairings (+ ember → player,
  player ×2, ryan → player, ryan → sprout; ryan ×2's duck at 1.98 stays held).
- **Jumps:** myco → ember 178° → 63°, sprout → ember 179° → 69°, ryan → myco 145° → 47°. Some went
  up: ember ×2 41° → 81°, player → ember 40° → 72°, ryan → ember 39° → 73°, ryan → player 47° → 109°.
  ⚠️ ryan → player is now an always-held bake with a 109° jump: worth Ryan's eye.
- **Hands:** a little wider on the tossed meets that can't make the arch (myco ×2 13.5 → 22.9 cm,
  sprout → myco 7.2 → 10.9, myco → ember 4.7 → 8.1); they are reaches, tossed against a break.

## Tests

- `chain-join.test.ts`: its bound is *"no longer than the bake itself stretches them mid-call"*. The
  bake changed: ryan ×2's beau upper arm 37 → 33 cm (its length), forearm 43 → 51. Bounds 34 / 52.
- `whole-move.test.ts`, numeric vs exact gradient solve: drift 1.6° (bound was ~1°), a stiffer kink.
  Bound 0.035 rad; the term-by-term gradient check still passes, which is the proof of exactness.
- `tsc -b` clean; suite at the 38 known failures, 1151 passed.

⏳ **Next:** Ryan looks at the twirl on the floor (ryan → player for the 109° jump; myco → ember for
the reach) → commit. Mixed sets later.

## Committed

Ryan: *"commit it and push just to data but player player beaus arm passes under belles head and it
shouldn't ever do that"*. Committed as it stands; the player ×2 arm under the head is next (10-29 (2)).
