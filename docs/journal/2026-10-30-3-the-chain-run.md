# 2026-10-30 (3): the chain run

🧪 Results only; no code change. `~/Downloads/voice-test-2026-10-30T205445.json` (iPhone Safari,
server recognition, 128 bpm; `…205441.json` is the same run saved 4 s earlier).

## Numbers

- 9 chains, 5 one-call trials (prompt).
- **Timing holds in a chain.** End of each call's segment to its naming: **median 379 ms**, p90
  949 (n 7, from 5 chains said with a pause per call). Last call: median 384. One-call: median 424.
  A beat is 469.
- **Accuracy doesn't.** Chains heard exactly: 1 of 9. Calls heard in order: 21 of 36. One-call: 3 of 5.
- No carry-over this run (`carried` 0 everywhere; no naming before speech).

## Every miss

Ten are spellings the vocabulary lacks:

| Said | Heard |
|---|---|
| pass thru (×3, once one-call) | "passed through" |
| allemande left (×3, once one-call) | "Alma left", "On a man left", "Allaman left" |
| alamo style | "Amo style" |
| touch a quarter | "touch quarter" |
| pass the ocean | "past the ocean" |
| veer left | "view to the left" |
| square thru four | "squared through four" |
| right and left grand | "right left grand" |

**One is a bug: a chain split in two.** Chain 8 (heads square thru four, right and left grand,
promenade, wheel around): Safari sent a final after "promenade" while Ryan was still speaking (the
meter's last segment was open). The reducer closes a trial on every final, so "Heads wheel around"
became a trial of its own under the *next* chain's prompt (star thru, double pass thru, cloverleaf,
dosado). That's 4 asked calls with nothing said for them, and a trial with no speech start (its
segment began in the trial before).

## What it says

- Latency is fine; recognition is the problem, and it's spellings, as on the first run. Most
  misses sound like the call ("passed"/"past" for pass, "squared" for square, "Alma" for allemande),
  which is what sound-alike matching is for. "View to the left" and "On a man left" are further
  off; knowing which calls are legal there is what would catch those.
- Chain mode must not end a trial on a final while the meter says speech is still going.

## Next

1. Fix the split: in chain mode, a final while a segment is open doesn't end the trial; the open
   segment carries on.
2. Sound-alike matching, narrowed by `callsFrom` from the formation the chain has reached.
