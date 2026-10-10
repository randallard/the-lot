# ADR-0057: The turn-under is four named styles, and the review branches on them

- Status: Accepted
- Date: 2026-09-21
- Deciders: Ryan, Claude

## Context

[ADR-0056](0056-a-declared-hold-keeps-the-hand-the-figure-named.md) fixed one half of Ryan's
2026-08-23 California Twirl report and made the other half **more** visible. The belle's joined
hand used to be silently re-labelled onto her other side halfway through the figure, so her arm
never had to wind over her head at all — the swap was *hiding* a missing pose. With the hand
pinned, the arm has to genuinely go somewhere, and nothing poses it: `TrackedArms.arch` has been
reported-and-undrawn since the span existed.

The same report already said what the pose is:

> the left arm need to be turned under as it makes an upside down L with the invisible upper arm
> and the forearm then is horizontal over the head of the belle

Ryan, 2026-09-21, naming the rest of them:

> happy path is the L, next is to L and duck under, those both maintain contact, sometimes they
> lazy L and break contact, sometimes they just arm up as high as casually possible and walk
> around it

Four things dancers do, where the code has one unbuilt pose and no way to ask for any of them.

🔴 **And the review could not have told them apart anyway.** `drawAccommodation()` is a coin flip
**per mount** (`DanceFloor.tsx`'s `arches`), so for any pair that has to accommodate, two visits
to the same `#review` address could show two different poses. A rating given there could not say
which of the two it was of. That has been true since the draw existed and nobody had noticed,
because nothing had yet needed one address to mean one pose.

## Decision

**The four are named in their own module, and the three beats a dancer is actually turning under
are branched four ways in the review.**

`src/dance/turn-under.ts`, sibling of `accommodation.ts`: `FULL_L`, `DUCK_UNDER`, `LAZY_L`,
`CASUAL`, with `TURN_UNDER_STYLES`, `keepsContact`, `accommodationFor` and `forcedAccommodation`.
`ReviewStep` gains `turnUnder`; `DanceFloor` gains a `turnUnder` prop, **per occupant**.

Five things make it this rather than something smaller:

**It is a separate question from ADR-0037's, and they meet at one outcome.**
`accommodation.ts` asks *can this pair reach the hold at all* — two bodies and a width, decided
before the figure is built. This asks *can this dancer get their own arm over their own head* —
one body, decided at pose time. A pair can fail either independently. But **`LAZY_L` is
`BREAK`**, not a fifth outcome, because `accommodation.ts` requires that a hold added later
*"answer which of these two rather than inventing a third silent one"* — and losing contact is
exactly what a break already is. `accommodationFor` returns `null` for the other three so their
reach draw stays a coin flip; returning a default there would pin one of ADR-0037's two styles
off for three quarters of the cast without anyone deciding to.

**All four keep the belle's path, `CASUAL` included.** Ryan's call, and it is what keeps the
whole family on this side of the seam. square-one's `belleHalf` walks her a `step-pivot` of
exactly `couple.width` and `archClearance` feeds only the **beau's** bow — her path takes no
clearance parameter at all. A genuinely different route would need a new block, and square-one's
ADR-0024 deleted the one block that modelled an alternative path, with a promotion condition for
rebuilding it *from an actual named call* rather than from a consumer's preference. So `CASUAL`
is *"arm up as high as casually possible"* and the walk is untouched.

**Three beats, not one.** A style that only reads right at the midpoint is not a style, so
`quarter`, `under-arch` and `three-quarter` each get all four. 26 → 35 steps, **650 → 875 cells.**

**The happy path keeps the unbranched id.** `quarter`, `under-arch` and `three-quarter` *are*
`FULL_L`; the rest are suffixed siblings. Every `#review=…/under-arch/…` address written in a
journal still opens, and still opens the pose that journal meant. Journals are append-only, so a
link that merely *fell back* to the first cell could never be corrected — it would silently stop
meaning what it said. Two existing tests keep passing unmodified as a side effect.

**Forced where the accommodation is *drawn*, not where it is read.** `LAZY_L` reaches
`sizeArch`'s argument in the `arches` memo, because ADR-0037 sizes the figure to the draw before
it is built. Pinning it at the posing end instead would have the beau bowing for one answer while
the arms posed the other — the exact defect ADR-0037 was written to fix.

## Alternatives considered

**A fourth segment in the cell address** (`figure/step/style/beau-belle`). Rejected: it breaks
every stored rating key and every URL, for a distinction the step already exists to carry. A
step is *"a named, addressable moment"* and four ways of dancing one moment are four moments
worth judging.

**Branch `under-arch` only** — 725 cells instead of 875. Genuinely tempting, and rejected by Ryan
on the substance: the turn runs the whole width of the pass, and a style has to be watched
arriving and leaving.

**Order the four as a degradation ladder**, the way ADR-0040's reach → break is ordered.
Rejected, and `turn-under.ts` says so in its own doc: nobody has looked at them yet. Whether they
rank, and in what order, is precisely what this branch was built to find out, and encoding an
order now would answer the question the instrument exists to ask. The one property Ryan stated
outright — which of them loses contact — *is* recorded, as `keepsContact`.

**Draw the style at random, like `drawAccommodation`.** Rejected because Ryan has already said
what should decide it: *"characters where the happy path is easier will be more likely not to
break — have it depend on the strain."* A coin flip put in now would be a decision made by
default *against* one already stated. The prop is set by the caller; the inference is owed.

## Consequences

**A review cell is reproducible now, for the first time.** Forcing the accommodation is a side
effect of the style, and it closes a gap that predates this by months.

**Three of the four styles have no pose yet, and the panel says so.** `FULL_L` renders as the
arch always has (which is to say: undrawn); `LAZY_L` reaches the existing break and genuinely
differs; `DUCK_UNDER` and `CASUAL` render as `FULL_L` does. The review shows a red *"this style
has no pose yet — don't rate it"* block on those cells, on the same reasoning as the exploratory
dials' amber one: a rating of a pose that was never built is worse than a missing one, because
later nothing distinguishes it from a rating of a pose that was. **675 of the 875 cells are not
yet worth rating**, and the block is what stops that being discovered the hard way.

🔑 **The `watch` text is the specification.** Each of the twelve says what its style should look
like at its beat, and those sentences are what the poses get built against — including the
comparisons (*"compare against `under-arch · the L` on the same pairing — that is the control for
how much of the room the arm gave up"*).

**Two test statements were restated rather than re-pinned**, on ADR-0055's standard. *"No figure
rates the same beat twice"* becomes *"the same pose twice"*, over `(beat, turnUnder)` pairs —
four cells naming beat 2 are four poses. And the Partner Trade's control relationship is now
stated over the Twirl's distinct **moments**: a Trade has no arch and so cannot gain the same
branch, and does not need to, since all four styles at a beat are measured against the same
hands-free control. A third was made index-free: the chart test counted to *"the fourth score
column"*, which silently named a different step the moment the turn branched.

🔴 **`arch-up` may need to branch too, and deliberately has not.** If `CASUAL` means a lower
arch, it is lower from beat 0 and the difference shows there as well. Left alone until a built
`CASUAL` says whether it reads.

**The selection rule is owed.** Per character, strain-derived, and motivated by a floor of
several couples not all doing the same thing. `upperArmStrain` is the input it will read, and the
per-occupant prop shape is here so that landing it is not a rewrite. Ryan: *"characters like Myco
— might be able to shrink — that would be cool."*
