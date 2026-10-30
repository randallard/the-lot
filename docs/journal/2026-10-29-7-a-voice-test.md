# 2026-10-29 (7): a voice test

🧪 Exploratory, uncommitted, for Ryan to run. the-lot only, no square-one change.

## Star Thru is parked

Ryan: *"I want to leave star thru and move forward with call testing - I want to see if we'll be
able to live call with this."* Star Thru stays where [10-29 (5)](2026-10-29-5-star-thru-bakes-on-keyframes.md)
left it: step 6's plumbing in, his keyframes not set, uncommitted on square-one's unreleased Star
Thru. Pick it up from that entry.

## What "live call" needs, and which piece first

Offered four first tests: tapped calls danced live on the floor, the same plus voice, voice latency
alone, or a full 8-dancer square first. Ryan chose **voice latency alone** (*"ok 3 can you do a
#voice-test page for this?"*). That's the north star's proof 3
(`work/square-dance-planning/briefs/north-star-caller-practice.md`), the one proof still unmeasured.
The floor can't take a call mid-dance yet (it plays a sequence fixed up front), and there's no
8-dancer square. Those are the next tests if voice holds up.

## `#voice-test`

`src/voice/`, routed from `main.tsx`:

- `call-vocabulary.ts`: 75 calls, CALLERLAB Basic and Mainstream (from the definitions' contents
  in `square-one/reference/callerlab/`), each with the spellings a recogniser writes ("do sa do",
  "pass through", "box the nat"). The 7 square-one dances are marked.
- `match-call.ts`: normalise (lower case, "through" → "thru", numbers and fractions to digits),
  then the **longest** spelling found as whole words wins. So "heads square thru four" is Square
  Thru and "left swing thru" isn't Swing Thru.
- `voice-test-session.ts`: one pure reducer (ADR-0065). Facts are the trials, position is the
  mode, target, bpm and the utterance in progress, and the summary is derived.
- `VoiceTestScene.tsx`: the browser's Web Speech recognition (continuous, interim results,
  restarted when it ends by itself), and a level meter on the mic that stamps **the end of
  speech**: 4× the room's quiet, a 300 ms hangover, stamped at the last loud sample. Per utterance
  it records the first result that already names a call (the earliest the floor could act) and the
  final result, both in ms after the end of speech and in beats at the page's bpm (128 by default,
  469 ms a beat). Prompt mode asks for a random call from the 7 dances, Basic, or Basic +
  Mainstream. Free mode just listens. Results copy or download as JSON.
- **On-device:** this Chromium (152) offers local recognition (`SpeechRecognition.available` says
  `downloadable`) and `SpeechRecognitionPhrase` for biasing toward the call names. The page has a
  checkbox and an install button. Installing downloads the language model, so that's Ryan's click.
  Server mode sends audio to Google.

Not built: on-device **Whisper** (WASM). It needs a dependency and a model download, and Chromium's
own on-device engine may answer the question first.

## Checked

`tsc -b` clean, lint 0 errors, 12 new tests pass (`voice-test.test.ts`: every call and spelling
matches itself, sentences, longest wins, the reducer's timing and counts). The page renders in
Chromium with no console errors. **Not checked: speech itself.** That needs Ryan's voice.

Two dev-server catches: the Vite watcher caught `VoiceTestScene.tsx` empty mid-write twice and
served the empty module ("does not provide an export named"), and `touch` fixed it. If the page is
ever blank after an edit, that's the first thing to try.

⏳ **Next:** Ryan runs `#voice-test` (server mode, then on-device after install), 20 or so calls
each, and downloads the results. What decides it: is "end of speech → first naming result" under
a beat (469 ms at 128 bpm)? A caller calls ahead, so a beat or two is the budget. Then: Whisper if
neither engine is good enough. Or, if one is, the live floor: a call taken mid-dance.
