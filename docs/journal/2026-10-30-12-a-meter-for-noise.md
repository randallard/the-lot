# 2026-10-30 (12): a level meter that holds up in noise

🧪 Uncommitted, for Ryan's look. Ryan: *"fix the level meter for noise"*.

## Why

The meter decides where speech ends, which is what every latency is measured from. In the noisy
runs (10-30 (10), (11)) it failed: noise spikes opened dozens of zero-length segments, some never
closed, and the end of speech went missing in long utterances, so per-call latency couldn't be
trusted. It was one threshold, 4× an average of the samples that weren't loud, and that average
crept up whenever speech was borderline.

## What replaced it (`src/voice/vad.ts`, pure)

- **The microphone is band-passed** to 150–4000 Hz (two Web Audio biquads) before it's measured.
- **The noise floor is the room's lower edge**: it drops to any quieter sample at once and rises
  slowly (about 5 s; ten times slower during speech, so 20 s of calling doesn't lift it toward the
  voice, while a room that has really got louder is caught up with in under a minute).
- **Hysteresis**: speech starts above 4× the floor and carries on above 2.5×. The floor is the
  minimum, so those sit above a room's ordinary ripple (noise varying ±30 % peaks near 1.9× its
  minimum); the first try at 3× / 1.8× let that ripple keep speech going 570 ms past its end.
- **Onset and length**: 60 ms of loudness to start, and a segment under 150 ms is dropped, never
  reported. A start is reported once the segment is 150 ms long, stamped at its onset.
- **Hangover**: speech ends 350 ms after the last loud sample, stamped at that sample.

8 tests on seeded synthetic signals: a steady room (quiet or noisy) is never speech; speech in noise
is one segment with edges within two samples; 10–40 ms clicks open nothing; a soft voice at 3.3×
the room is heard; syllable dips don't split a call but a 600 ms pause does; 20 s of calls with
200 ms gaps is one segment ending at the right time; a room that gets louder for good is caught up
with and speech in it still heard; and a property that over any levels, events alternate
start/end, last at least 150 ms and move forward.

## The level trace

The page now saves its level trace with the results (`levels`: `[performance.now() ms, RMS]` every
20 ms, capped at 20 min; results file `version: 4`), on the same clock as the trials. The next run
can be replayed through `vadStep` offline and the thresholds tuned on Ryan's real rooms rather than
on synthetic noise. The results are built when saved, not on every render, since the trace grows
between renders.

## Checks

69 voice tests (was 61). `tsc -b` and lint clean. The page renders through the Tailscale URL. Not
checked: the microphone path itself (no mic in the automation); a spoken run will be the test.

## Next

Ryan: a run in a noisy room (free mode or chains), and save. Then replay the trace and tune if it
needs it; then live calling.
