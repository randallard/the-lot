# 2026-10-30 (6): free mode is a live floor

🧪 Uncommitted, for Ryan to run. the-lot only.

Ryan: *"do both - live floor first"* (the other: the vocabulary gaps, next entry).

## What changed

- **The session keeps where the dancers are** (`floor`: the formations they can be in, or null
  when unknown). Free mode starts at a Static Square; each utterance's last call moves it on
  (`HeardCall.to`, from `endingsFrom`), and the next utterance is heard from there. An utterance
  with no call leaves it where it was. Managed position (ADR-0065): the screen resets it, nothing
  derives it.
- **Free calling is narrowed by what's legal now**, as chains are: a loose match must be a call
  Standard from the floor (`LOOSE`). A call with no known ending (U-Turn Back, Recycle…) leaves the
  floor unknown: every call is a candidate, matched within `STRICT`, until **reset to a static
  square**. Entering free mode resets it too.
- `hearCalls` takes several starting formations (a call can end in more than one) and reports each
  call's `to`. Named calls record `from`; trials record the `floor` they began on.
- **Screen:** free mode shows the floor and how many calls are legal from it (33 from a Static
  Square), with the reset. Free rows list every call heard, `~` on those heard by sound. The summary
  adds free-mode calls heard (by sound) and *end of speech → last call named*.

## A correction (to 10-30 (4))

10-30 (4) said "Dodo" was missed "with no formation", implying a formation would rescue it. It
doesn't: it is 0.33 from Dosado, and `LOOSE` was tightened to 0.30 in the same entry, so it's
missed everywhere. A test now says so. Getting it would mean a looser limit for short calls or a
spelling, and a two-syllable guess is the riskiest kind.

## Checks

43 voice tests (was 37): the floor follows a sequence from a Static Square (Heads Lead Right →
"view to the left" heard as Veer Left only because the floor is Eight Chain Thru → "ferry wheel" as
Ferris Wheel from two-faced lines), stays put on a miss, goes unknown and resets, resets on entering
free mode; the free summary. `tsc -b` and lint clean. Free mode renders through the Tailscale URL
with the floor line; no console errors. Not checked: a spoken run.

## Next

The vocabulary gaps: Chain Down the Line, Trade, and the other family members said in their own
words, in the-lot's vocabulary and square-one's Standard Applications.
