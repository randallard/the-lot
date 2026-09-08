# ADR-0050: A pose is reviewed at a named beat, not a caught one
- Status: Accepted
- Date: 2026-09-07
- Deciders: Ryan, Claude

## Context

Every arm, arch and hold decision from ADR-0027 to ADR-0049 was found the same way: Ryan
stood a pose up in `#dance` and looked at it. That instrument works — it is why there are
twenty-three of them — but it has three costs that have each already been paid more than
once.

**A moment has to be caught by hand.** The scene can stop in exactly two places: wherever
the pause button lands, and beat 0. The California Twirl defect of 2026-08-23 is three
screenshots taken at three moments Ryan had to chase at 120 bpm, and the moment the report
is actually about — the belle passing under the arch — is one the scene's own documentation
admits you cannot pause on. Worse, a caught moment is not a *nameable* one: the report and
the reader cannot be sure they are looking at the same frame.

**Only the pairing on screen gets checked.** `#dance` danced one pairing for as long as it
existed, and adding two dropdowns turned up seven decisions and four defects in an
afternoon. Three of the last four ADRs turned on an ordering nobody had stood up. There are
twenty, and nothing enumerates them.

**A judgement is not written down.** *"I looked at this and it was fine"* survives as long
as the conversation does. ADR-0046 read correctly for six days on the pairing it was
watched on and was wrong on its mirror; nothing recorded which orderings had actually been
looked at, so nothing could say that the mirror had not been.

What a reasonable person gets wrong here is assuming the answer is screenshots. Captured
images are cheaper to page through and are the one thing that must not be trusted: a
picture goes stale the moment `arm-pose.ts` changes, and a stale rating that looks current
is worse than a missing one. It also cannot be orbited, and the defect this was built for
is invisible from the front.

## Decision

The review addresses a pose by **name** — figure, step, ordered pairing — and stands the
real scene up at it live, at `#review=<figure>/<step>/<beau>-<belle>`.

A **step** is a named beat with the question it exists to answer attached. The catalog is
data (`review-steps.ts`), every beat in it is read off the waypoints square-one actually
emits, and a test asserts it against the engine rather than maintaining it by hand.

## Alternatives considered

**Capture the matrix to PNGs and rate the files.** Fastest to page through, and rejected on
staleness: 520 images regenerated per geometry change, with no way to tell a current one
from a stale one by looking. Loses the camera, which is half of every watch this project
runs — *"a straight-on front view and a level side view are two different questions about
the same arm."*

**Scrub bar on `#dance`.** Cheaper, and it solves only the first of the three costs. A
scrub position is not an address: it cannot be linked, rated, or enumerated, and "beat 2.03
of the Twirl" is not a moment anybody agreed to look at.

**Fold the ordered pairings into unordered ones**, halving the matrix to 260. Rejected
outright: ADR-0046 exists *because* the role swap is not a symmetry, and a matrix that
cannot represent the defect that produced it is not worth building.

## Consequences

The matrix is **520 cells** on the shipped cast of five, and that is a real cost — it is
not one sitting, and the route carries a figure filter and a *next unrated* jump because of
it. Adding a fifth NPC makes it 780; adding a step to the Twirl adds 20 cells. The count
grows as the product of three axes, and any future figure should be added to
`REVIEW_FIGURES` knowing that.

Ratings live in the browser's localStorage, which is per-machine and not backed up. The
export to markdown is what makes a sweep durable, and it is a manual step — a sweep that is
never exported is a sweep that exists on one laptop.

**The promotion condition is the coefficients.** `poseAt` is one jump to a beat, and it is
sound only because a dancer's state is a pure function of the beat while every dial is off.
The day a pursuit coefficient is switched on, position depends on how a dancer got there
and this becomes a lie that still returns plausible numbers. `dance-performance.test.ts`
asserts the jump against a walk precisely so that day shows up as a failing test rather
than as a review of moments that never happened; the fix then is to tick a fresh
performance forward in small steps, same signature, same callers.
