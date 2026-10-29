# 2026-10-29 (2): over her head

🧪 Exploratory, uncommitted, for Ryan's look. the-lot only; square-one untouched.

Ryan, on the twirl just committed (`8e657a9`): *"player player beaus arm passes under belles head and
it shouldn't ever do that"*.

## What it was

Traced (`over.ts`, scratch): through the middle of player ×2's turn the held hands sat **level with
her crown** (−4 to +2 cm, 6–17 cm off her head's axis), then came down past her face, 25–30 cm off it
and 60–78 cm under her crown, while she finished the turn. Nothing in the solve asked for over: the
guide arc that rises over her crown only seeds the start (`twirlMove`), and clearance only keeps the
arm out of her head, not out from under it.

## What changed

- `whole-move.ts`: **`Move.over`**, per sample, how far the held hands' midpoint stands over the
  belle's crown, **as she is worn** (her head point carries her grow, so a `meet` shrink lowers it).
  Short of it costs like a clip. Readable cost and exact gradient; the term-by-term gradient test
  now sets it.
- `whole-move-twirl.ts`: **`overHead(path, clear)`**, the middle half of her turn under the arch
  (her path's facing a quarter to three quarters through, 0–3.5 beats), at a hand's width and 3 cm.
- All 25 `meet` bakes and ryan ×2's `duck` re-baked. Breaks untouched (no arch).

## Checked

Every held solve: hands over her crown through the window by **7–14 cm**, and **no point of the
beau's held arm beneath her head** (inside it horizontally, below its centre). Clip 0 (myco → player
0.5 cm), upper arm ≤ 0.6 cm.

## What it costs

These bodies can't hold an arch over a head without reaching. Arm straight up, over the crown:
player **+1 cm**, ryan +5, ember +18, myco −57, sprout −12. Player ×2's old "held" bake was held
only because the arm went past her face. Now the forearm carries the reach:

- **Always held: 9 → 4** (ember → ryan, player → ryan, player → sprout, ryan ×2). Player ×2 (forearm
  2.69×), sprout ×2 (2.06), ryan → sprout (2.77), ember → player, ryan → player and ryan ×2's duck
  (2.04) are past `REACH_LIMIT` and **tossed between reach and break** on the floor (ADR-0037).
- Jumps mostly down (player ×2 84° → 40°, ryan → sprout 64° → 37°); ember → player 32° → 108°.
- The reach is long on the pairs who can't make it: myco ×2 forearm 6.3×, sprout → myco 4.5×,
  player → myco 4.2×, all tossed.

## Open

⚠️ **The breaks.** With the hands let go, the beau's held-side arm is down, and on 15 of 25 a big
head (ember's 44 cm radius, myco's 49) passes over his low hand: by the same measure, an arm
"under her head" by 58–187 cm. Not touched: is that what Ryan means by *"ever"*, or is a hanging
arm under a passing head fine? Ask.

✅ **Answered (Ryan, same day):** *"hanging hand is fine"*. "Never under her head" is about the
arch, the held hands; the breaks stay as they are.

- `tsc -b` clean; suite at the 38 known failures, 1151 passed.

⏳ **Next:** committed on Ryan's word. Then ryan → player's and ember → player's jumps, mixed sets.
