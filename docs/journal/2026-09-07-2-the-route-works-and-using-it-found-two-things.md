# The route works, and using it for ten minutes found two things

**2026-09-07, later**

Correcting [this morning's entry](2026-09-07-1-a-moment-you-have-to-catch-is-a-moment-you-cannot-track.md),
which ended *"nothing has been looked at in a browser."* It has now.

## What was verified

Chrome restarted, extension paired, `#review` opened against `pnpm dev`.

- **Addressing.** `#review=california-twirl/under-arch/myco-sprout` opens cell 68 of 520,
  the right figure, step and pairing.
- **🔑 The seek/home distinction holds.** `stand` and `arch-up` are the same two dancers on
  the same spots with the hold visibly lower in the first — the arch is the only difference,
  which is what ADR-0050 needed to be true and what nothing in the test suite could show.
- **The clock agrees with the step.** `under-arch` reports `2.00 / 4`, `grip` on an
  Allemande reports `1.00 / 8`. The readout exists to be able to disagree; it doesn't.
- **Rating and notes.** `3` rates and advances to the next pairing. Typing
  *"down arm 0 swaps at 2 beats"* into the note left the digits **in the sentence** — the
  keys stand down while typing — and the note-without-a-score landed at 2, "can't tell",
  as designed.
- Camera orbits and zooms; the level side view is reachable.

## 🔴 Two things using it found that building it did not

**A URL nobody could navigate to.** The loader reads the hash once, at mount, so pasting a
`#review=…` address into an already-open review moved the address bar and nothing else.
Every claim made for these URLs — share one, keep one in a note, reopen it tomorrow —
silently required a reload first. That is worse than not writing a URL, because it looks
like it worked. There is a `hashchange` listener now. No loop: the effect that writes the
hash writes the one the cell already names.

**The matrix order serves one of the two questions.** Pairing is innermost so that bodies
change under a held moment — right, and it is why the sweep can tell a bad *column* from a
bad *row*. But the arrows then walk twenty bodies before reaching the next step, so
following one couple through a whole California Twirl was twenty presses per step. That is
the walk Ryan actually asked for — *"step by step … at each step in each move"* — and it
was the one the route could not do. Step chips hold the pairing and move along the figure;
a pairing dropdown holds the step and changes the bodies. Each chip carries its own score,
so a figure's shape across one couple reads without moving.

Both are the same lesson as the `#dance` dropdowns: **the instrument only shows what it can
be pointed at.** Ten minutes of using this found two gaps that a passing test suite,
a typecheck and a clean lint all agreed were not there.

## State

747 tests, 746 passing; the one failure is the pre-existing arch terminal case described in
the earlier entry. `tsc` clean, lint 0 errors, `docs-hygiene` clean. **Uncommitted, for
Ryan.** No ratings are stored — the handful given while testing were cleared.
