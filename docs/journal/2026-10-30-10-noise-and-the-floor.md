# 2026-10-30 (10): a noisy run; every result logged; the floor re-syncs

🧪 Uncommitted, for Ryan's look. the-lot only.

## The run

`~/Downloads/voice-test-2026-10-30T235608.json`: iPhone Safari, free mode, background noise and a
soft voice, 13 utterances, some long (29 s). **Recognition held up**: 39 calls heard, 10 by sound
("Ed's pass through", "you turned back", "Sides roll away", "left right not grand"). Missed: "square
thru three" three times (the recogniser dropped "thru" or "square"), "Wheeland wheel", "couple go
left the next go right" ("first" dropped), "starting through". And "Swing through right and left"
named nothing, probably the carry-over rule dropping a real repeat.

Three problems:
1. **Calls named only when the final arrived**, 10–20 s late in the long utterances (all nine of one
   stamped at 19.7 s). Either Safari stopped sending interims in the noise, or a revision of an early
   word re-timed everything after it (`rename`). The file didn't keep the interims, so no telling.
2. **The floor went unknown** after Separate in the first utterance and stayed so (bar a reset).
3. **The level meter fails in noise**: dozens of zero-length segments, some never closed, so this
   run's latencies aren't trustworthy.

Ryan: *"yes, do 1 and 2"*.

## What changed

- **Every result is kept** on the trial (`Trial.results`: time, text, interim or final), and saved
  (results file `version: 3`). The next noisy run will say which cause (1) is.
- **Re-sync** (`FIXED_ENDING`): 14 calls end in one formation whatever they start from (Allemande
  Left and Right and Left Grand → the RLG circle, Lead Right/Left → Eight Chain Thru, Circle to a
  Line and First Couple Go Left → Facing Lines, Double Pass Thru, Dive Thru, Ferris Wheel, Pass to
  the Center, Centers In, Tag the Line…). Heard with the floor unknown, or where they aren't
  Standard, they put the floor back.
- **Legality is now a ranking, not a gate.** A call may match if spelled exactly, or within `LOOSE`
  and legal, or within `STRICT` anywhere; the closest sound wins, legality breaks ties. Replaying
  the run showed why: with a floor gone wrong (a lost "square"), "Allaman left" was refused; and
  "veer lift" from two-faced lines went to the legal Veer Right (0.29) over the perfect Veer Left.

Replaying the noisy run in free mode: the floor is known at the start of 8 of 13 utterances (it was
2, both after a reset). The same 39 calls are heard. Problem 3 isn't touched.

## Checks

58 voice tests (was 50), including a property that every trial's results are in time order and end
with the final that closed it; re-sync and the new ranking pinned with the run's own phrases. `tsc
-b` and lint clean. Not checked: a spoken run.

## Next

Ryan: another noisy run, then I read the interims to settle problem 1. Problem 3 (end of speech in
noise) after that.
