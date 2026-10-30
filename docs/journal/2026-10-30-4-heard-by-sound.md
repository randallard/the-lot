# 2026-10-30 (4): calls heard by sound, narrowed by what's legal; the split fixed

🧪 Uncommitted, for Ryan to run. the-lot only.

Ryan: *"yes, fix the split and build sound-alike"*, after [the chain run](2026-10-30-3-the-chain-run.md).

## Sound-alike (`src/voice/sound-alike.ts`)

- **A word's sound** (`soundKey`): common spellings of one sound made one letter (ph→f, ck→k, c→s
  or k, th→t…), a final "ed" and silent "e" dropped, doubled letters single, each run of vowels one
  `a`. "passed" and "pass" are both `pas`; "view" `vaw` is one edit from "veer" `var`. Filler words a
  recogniser adds or drops ("a", "the", "to", "and"…) are left out of both sides, which also catches
  "touch quarter" and "right left grand".
- **What's legal.** `hearCalls(transcript, start)` walks the words. At each, an exact spelling of
  any call wins (a caller may call an Extended application); otherwise the closest key among the
  calls Standard from where the dancers are (square-one's `callsFrom`), within `LOOSE` = 0.30 of
  the longer key. Each call heard moves the formation on (`endingsFrom`); a call with no known
  ending makes it unknown again. With no formation (prompt and free modes), every call is a
  candidate but only within `STRICT` = 0.25.
- **Look-ahead.** A loose match is passed over when the next word starts a closer one. The first
  version heard "centers passed through" as Zoom ("centers zoom" is one of Zoom's spellings).
- `normalise` now reads a bare "quarter" as 1/4 ("touch quarter").

Against the 10-30 runs' own transcripts: **all 8 real chains heard as asked**, against 1 by
exact matching, and the first run's "Allaman left", "Passed through" and "California tour" as
single calls. Real loose matches were all 0.22 or under ("Amo style" 0.22, "on man left" 0.20,
"view left" 0.14). Still missed: "Dodo" for Dosado with no formation (0.33, too short to trust).

**What it can get wrong:** a loose match is a guess among legal calls. "Ferry wheel" from a Static
Square is heard as Flutterwheel (legal there), and from two-faced lines as Ferris Wheel. In free
mode, "Heads right and left through star roof" gives Right and Left Thru, then Right Hand Star for
"star roof"; whether Ryan said Star Thru there isn't known. The screen marks a loose match with `~`
so a run shows which were guesses.

## The split, fixed

In chain mode, a final from Safari while the meter still hears speech no longer ends the trial:
its text is kept (`done` for matching, `said` as written) and the next results add to it. The trial
ends on a final after speech ends, or once every call in the chain has been heard. Any trial that
ends mid-speech hands its open segment to the next utterance, so that one still has a start (the
split's tail trial had none).

## Checks

36 voice tests (was 26): sound keys; the run's 8 chains as fixtures; legal vs not, exact anywhere;
the look-ahead; no-formation matching including "Dodo" refused; the formation moving on; the split
(a final mid-speech held, a complete chain closing mid-speech with its segment handed on, other
modes unchanged). `tsc -b` and lint clean. The page renders through the Tailscale URL. Not checked:
a spoken run with the new matcher.

## Next

1. **Ryan: another chain run** on the phone. Watch the `~` marks: right guesses vs wrong ones.
2. If wrong guesses show up, the levers are `LOOSE` / `STRICT`, or a closed-vocabulary recogniser
   (Vosk, a dependency, so Ryan's go-ahead).
3. Live calling: the matcher already takes the formation as context, so the floor can pass where
   the dancers are.
