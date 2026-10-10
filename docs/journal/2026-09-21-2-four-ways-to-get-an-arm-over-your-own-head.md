# 2026-09-21 (2) — four ways to get an arm over your own head

Second session of the day. The first one fixed the belle's arm swapping sides
([09-21-1](2026-09-21-1-the-down-arm-was-never-moving.md)); this one is about what that fix
exposed, and Ryan supplied the vocabulary for it in one sentence.

> happy path is the L, next is to L and duck under, those both maintain contact, sometimes they
> lazy L and break contact, sometimes they just arm up as high as casually possible and walk
> around it

[ADR-0057](../adr/0057-the-turn-under-is-four-named-styles-and-the-review-branches-on-them.md).

## The ask was the instrument, not the poses

*"lets make a plan to check all these in the review — update the review screen to branch each
accommodation for that step."* Stand the cells up first, then work through them. That is the same
order the review route itself was built in, and it is the order that has produced every arm ADR
since: the thing that was scarce was never the looking, it was having somewhere specific to look.

So this session builds **no pose at all**. It builds twelve addresses where there were three, and
a red box that says *don't rate this one yet*.

## Four questions asked before writing anything

All four mattered, and two of them changed the shape of the work.

🔑 **"Walk around it" keeps the belle's path.** I asked whether she takes a wider route outside
the join, and Ryan said no — same path, the arm just goes as high as it goes. That answer is the
difference between a the-lot change and a square-one release cycle. The engine confirms it
cleanly: `belleHalf` walks her a `step-pivot` of exactly `couple.width`, and `archClearance`
feeds **only** the beau's bow via `laneForClearance`. Her path takes no clearance parameter at
all. And square-one's ADR-0024 already deleted the one block that modelled an alternative path,
leaving a promotion condition that it be rebuilt *from an actual named call* — a consumer wanting
a different route is exactly what that condition declines.

🔑 **"Lazy L" is ADR-0037's `BREAK`.** Ryan's call, and it keeps `accommodation.ts`'s standing
rule intact: a hold added later must *"answer which of these two rather than inventing a third
silent one."* Losing contact is what a break already is. Conveniently a break is a the-lot pose
mechanism (two different hold points) rather than an engine span — which matters, because
square-one **cannot** release a grip mid-figure and per its ADR-0026 deliberately will not.

The other two answers: branch all three turning beats, not just the midpoint (650 → **875
cells**); and on selection, Ryan wrote the most interesting sentence of the session.

## The gap the branch fell into

Building it turned up something that predates all of this. `drawAccommodation()` is a coin flip
**per mount**. So for any pair that has to accommodate, two visits to the same `#review` address
could show two different poses, and a rating given there could not say which it was of.

It has been true since the draw existed. Nothing had noticed because nothing had yet needed one
address to mean one pose. Forcing the style fixes it as a side effect — and forcing it has to
happen in the `arches` memo, where the accommodation is *drawn*, not where it is read: ADR-0037
sizes the figure to the draw before building it, so pinning it at the posing end would have the
beau bowing for one answer while the arms posed the other. Which is the defect ADR-0037 exists to
fix, re-introduced by the fix for something else.

## The thing I decided not to decide

It is very tempting to write the four as a ladder — reach, then break, the way ADR-0040 orders
its last resorts. `turn-under.ts` explicitly does not, and says why in its own doc: **nobody has
looked at them yet.** Whether they rank, and in what order, is the question the branch was built
to ask. Encoding an order now would answer it on the instrument's behalf.

What *is* recorded is the one property Ryan stated outright — `keepsContact`, true for three and
false for the lazy L.

Same reasoning killed a test I had already written. I wrote one asserting that no `SEVERITY` /
`rankOf` / `worseThan` export appears in the module — guarding the *decision* rather than a
behaviour. It looked clever and it would have aged badly: a test that greps its own module's
export list is one more thing to maintain and one more thing to work around. The module doc and
the ADR both say it in words, which is where a decision belongs.

## Two statements restated, on ADR-0055's standard

Branching broke three tests, and none of them was re-pinned:

- *"No figure rates the same **beat** twice"* → *"the same **pose** twice"*, stated over
  `(beat, turnUnder)` pairs. Four cells name beat 2 and they are four poses.
- The Partner Trade's control relationship is now over the Twirl's distinct **moments**. A Trade
  has no arch and so cannot gain the same branch — and does not need to: all four styles at a
  beat are measured against the same hands-free control.
- The chart test counted to *"the fourth score column"*, which silently named a different step
  the moment the turn branched. It now looks the column up **by its heading**. That one was a
  latent bug, not a consequence: a test that has to be re-counted every time a step is added is a
  test that will one day be re-counted wrong.

## The selection rule, which is owed

Ryan, on whether the styles should be drawn at random like RESHAPE/BREAK:

> this will be per character - but also characters where the happy path is easier will be more
> likely not to break - have it depend on the strain - characters like Myco - might be able to
> shrink - that would be cool … I think each render should have a preferred accomodation if they
> need it, this is more for when we have a full dance floor with multiple couples / squares but
> for now just set it per render

Three things in that, and they are not the same thing:

1. **Per character**, not per couple — which is why the prop is a per-occupant array even though
   the review sets both entries the same. A floor of several couples should not all be doing the
   same thing at once, and that is the stated motivation.
2. **Strain-derived**, not random. `upperArmStrain` is the input. This is a real departure from
   ADR-0037, whose two *are* a coin flip because neither is the fallback — here one of them is.
3. **Set, not inferred, for now.** So a coin flip was deliberately **not** put in: it would be a
   decision made by default against one Ryan has already stated.

## What is actually on screen

`#review=california-twirl/under-arch/player-myco` — unchanged address, still the happy path,
because the unbranched ids *are* `FULL_L`. Every link in every journal still opens the pose that
journal meant, which matters because journals are append-only and a link that merely falls back
could never be corrected.

Fifteen chips would have been a list you read rather than a shape you see, so they are grouped by
moment: one row per pose, four styles across it, the beat named at the end of the row. Comparing
styles *at one beat* is the whole reason the branch exists, so that is the comparison the layout
should make free.

**875 cells, 35 steps, 15 Twirl columns.** Suite 743 → 753 passing, the same 36 failures, same 8
files — the Myco set from 09-20, still untouched. `tsc` clean, lint 0 errors / 25 known warnings,
docs-hygiene clean.

## Next

The L, and it is the head guard (worklist item 11) — one mechanism, not two. A joined hand has
nowhere else to be, so the only free variable is the **elbow**, which swings on a circle about
the shoulder–wrist axis, and the elbow that keeps the forearm out of the head *is* the upside-down
L. `clearFloor` (ADR-0055) is the template for the free-arm half; `rigidParts()[1]` is already the
head as a sphere.

Then `DUCK_UNDER` and `CASUAL`, both defined **against** the L — duck is the L plus a rig drop,
casual is the arch capped where `upperArmStrain` is still zero — and then the selection rule.
