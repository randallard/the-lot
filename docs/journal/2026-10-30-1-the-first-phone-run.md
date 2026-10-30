# 2026-10-30 (1): the first phone run, and calls narrowed by formation

🧪 Uncommitted, for Ryan's look. the-lot and square-one (square-one
journal 32, `docs/journal/2026-10-30-standard-applications-as-data-32.md`).

## Getting it onto the iPhone

- iOS Chrome has no `SpeechRecognition` (every iOS browser is WebKit, and Apple gives the API only
  to Safari). **Use Safari**, with Siri / Dictation on.
- The mic needs a secure origin. `pnpm dev:phone` (Vite mode `phone`) adds
  `@vitejs/plugin-basic-ssl` and `host: true`. `pnpm dev` is unchanged.
- iOS Safari wouldn't get past the self-signed cert warning even after accepting it. The fix was
  Tailscale Serve, which is tailnet-only and has a real cert:
  `tailscale serve --bg https+insecure://localhost:5173` →
  `https://waed-7771.tailf88f11.ts.net/#voice-test`. Ryan enabled Serve on the tailnet and made
  himself operator (`sudo tailscale set --operator=$USER`), so no sudo after that. It persists
  across reboots; `tailscale serve reset` turns it off.
- **save to dev machine** (dev server only): a `save-voice-results` plugin in `vite.config.ts`
  takes a POST to `/__voice-results`, checks it's voice-test JSON under 5 MB, and writes
  `~/Downloads/voice-test-<time>.json`. The server names the file. I built it after misreading
  *"save to download s here"*: Ryan had already saved through Gmail. He kept it.

## The first run

`~/Downloads/voice-test-2026-10-30T184035.json`: iPhone Safari, Apple's server recognition, 128
bpm, 15 utterances (11 prompted).

- **End of speech to the first result naming a call: median 378 ms, p90 479, worst 479** (7
  utterances). A beat is 469 ms. Fast enough.
- End of speech to the final result: median 2151 ms. Live calling has to act on the interim
  results.
- **Right call: 6 of 11.** Every miss was a spelling the vocabulary didn't have: "Dodo" (Dosado,
  three times), "California tour", "Allaman left", "Right left grand".
- Two utterances got a first match *before* speech started (36363 < 36957; 79787 < 81597), and two
  have no end-of-speech mark. The previous utterance's interim text runs into the next trial
  ("Star through right left through"). The session should drop text carried over from the trial
  before. Not fixed yet.

## Spellings aren't the way: what's legal next is

Ryan: *"i don't want to keep having to update spelling list for every caller ... is that the only
way?"* No. Three levers: sound-alike matching (no list); narrowing to the calls legal from where
the dancers stand; a closed-vocabulary recogniser (Vosk) if those fall short. Ryan, on the second:
*"Legal calls from a formation could bring in the notation of dancer formations ... it could be
something we need to include in the call notation / object that we store"*. He chose all 75 as
plain data. square-one now has it: `FORMATIONS`, `STANDARD_APPLICATIONS`, `callsFrom`,
`endingsFrom` (square-one `docs/spec/standard-applications.md`). The 75 narrow to 18
(Right-Hand Two-Faced Lines) to 33 (Static Square); Eight Chain Thru is 32, because units like
"any facing dancers" count wherever they fit.

`voice-test.test.ts` checks the vocabulary's ids and square-one's record are the same 75.

## Next

1. **Chain mode** on `#voice-test`: a matcher that walks the transcript and returns every call in
   order, each once as the interim grows, each with its own latency.
2. **Sound-alike matching** (phonetic codes and an edit distance), narrowed by `callsFrom` from the
   formation the chain has reached. The spelling list stays as a fallback but gets no new entries.
3. Fix the carry-over between trials.
4. Vosk only if 1 and 2 fall short (a dependency and a ~40 MB model, so Ryan's go-ahead).
