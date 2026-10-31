# 2026-10-30 (11): the interims settle it, and the re-timing is fixed

🧪 Uncommitted, for Ryan's look.

`~/Downloads/voice-test-2026-10-31T002813.json` (and `…002801.json`, the same 9 trials saved before
Ryan stopped listening; saving writes only finished utterances, so stopping first changes
nothing). iPhone Safari, free mode, less background noise, 9 utterances of 14–23 s.

## What the logged interims showed

**Safari kept sending interims**, every 0.5–1.7 s (the longest gap in any utterance 1.9 s), and
each call appeared in them soon after it was said. The late naming of 10-30 (10) was **this code**:
`rename` re-timed every call after the first changed one. In 8 of the 9 utterances a result revised
an earlier call, typically the final. Utterance 1: the interims said "lead left **view right**"
(Veer Right, from 4.6 s); the final said "lead left **the right**"; Veer Right dropped out, every
later call shifted a place, and all five were re-timed to the final at 14.6 s, though first named
between 4.6 and 10.0 s.

## The fix

`rename` lines the new call list up against the old one (longest common subsequence of ids): a
call still there keeps the time it was first named; only a new or changed one takes the new time.
Replaying all 9 utterances from their logged results: of 77 calls, **16 were recorded only at the
final, now 2** (both first appear in the final).

The property "calls are named in time order" no longer holds (a call inserted before others is
newer than them) and was replaced by: named no later than the latest result, within the trial's
results; and a result that only adds calls never moves one already named. 61 voice tests.

## The rest of the run

77 calls heard, 14 by sound ("centers fear right" → Veer Right, "veered the left", "Ed's passed the
ocean"). Last call named a median 165 ms after the end of speech (p90 1.7 s, but the meter lost the
end of speech twice, so the tail isn't trustworthy). Wrong or missed: "He leave right there left"
(heads lead right, veer left) → Lead Right and a wrong Left Hand Star; "be the line" and "in the
line" (bend the line) missed.

## Next

The level meter in noise, so per-call latency can be trusted. Then live calling: the floor acts on
a call when it's first named.
