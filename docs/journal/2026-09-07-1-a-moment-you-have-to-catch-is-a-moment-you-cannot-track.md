# A moment you have to catch is a moment you cannot track

**2026-09-07**

Ryan asked for something the instrument could not do: *"go through methodically and look
step by step and character by character at each step in each move — like the california
twirl has a starting position then an arch then an ending position, not forgetting that
the arch also has the belle passing underneath the arch."*

The scene can stop in two places. Wherever the pause button lands, and beat 0. Everything
else in a month of watches was caught by hand at 120 bpm, which is why the 08-23 defect
report is three screenshots and a sentence apologising for the middle one.

## What got built

`#review` — the whole matrix, one pose at a time, scored 0–4 with a note.

- `review-steps.ts` — 26 named steps across five figures, each with the question it exists
  to answer. Every beat read off the waypoints square-one actually emits.
- `review-route.ts` — the matrix and its address. 5 figures × their steps × **20 ordered
  pairings** = 520 cells, each one a URL.
- `review-store.ts` / `review-chart.ts` — the score, the note, and the export.
- `poseAt` on the performance hook, and a `seek` pass on `DanceFloor`.

## Three things worth keeping

**The step list is asserted against the engine, not maintained by hand.** `figure.beats` is
quoted in the panel and used to clamp a seek, which makes it a claim about square-one; a
test builds the motions the way `useDancePerformance` builds them and checks it. The same
test checks the Twirl's `under-arch` really is where the belle is at (0,0) facing 180, and
that every Twirl step falls inside the arch's grip span. A step catalog that drifted off
the engine would rate poses the figure does not have, and nothing on screen would say so.

**🔴 `go home` and a seek to beat 0 are different poses, and both are wanted.** square-one
declares the Twirl's arch from `from: 0`, so beat 0 is *inside* it — ADR-0032 exists
because "go home" was landing there and Ryan said so. The home pass forces the blend flat
to recover the couple underneath. A seek must not: beat 2 of a Twirl is the belle under a
**raised** arch, and forcing it down there answers a question nobody asked, plausibly. So
the catalog asks for both by name — `stand` seeks beat 0 with `arch: "down"`, `arch-up`
seeks the same beat and takes the declared answer. They are the first two cells of the
review, in that order.

**The lint error was the design telling me something.** The first version bumped one of two
tokens from an effect — `home` for the standing couple, `seek` for everything else — and
`react-hooks/set-state-in-effect` refused it. The fix was not to appease the rule. It was
to notice that piggybacking on a *button-shaped event* to request a pose made the two poses
at beat 0 depend on which prop the caller happened to bump. Naming the request instead
(`arch: "down" | "declared"`) removed the effect, the second token, and the precedence
question together. Derived from the cell, so the pose and the panel are the same render and
cannot disagree.

## And one thing that had to be said out loud

A floor that mounts paused runs **no pass at all**. `seekSeen` starts at `null` rather than
level with its prop, so a fresh mount counts as never having seen the token. The review
remounts the floor on every change of cast — every third cell — and without that those
cells come up unposed. `home` can start level because an unpaused floor poses itself on the
first advance; a seeking floor is paused by definition. That asymmetry is a comment in the
code because it is exactly the kind of thing that gets "tidied up" later.

## Where it stands

746 of 747 tests pass. The one failure is the pre-existing one being held — and **it is not
the `NaN` the last entry describes**. It is `arch.test.ts`'s terminal case asserting `BREAK`
and getting `RESHAPE`: the pair with forearms at the shape editor's ceiling now finds a
reshape where ADR-0037 part 3 says it should let go. Confirmed pre-existing by stashing.
Whoever picks that up should look for the wrong thing if they trust the note.

`tsc` clean, lint 0 errors, `docs-hygiene` clean.

**Unverified: nothing has been looked at in a browser.** The extension is not paired to
Chromium, so the route has never been rendered — the tests say the matrix, the addressing
and the beats are right, and say nothing whatever about whether the arch draws raised at
`arch-up`. That is the first thing to do, and it is the whole point of the route.
