# ADR-0042: The reshape aims at whichever height asks the figure for less room
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: [ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md), [ADR-0041](0041-the-join-rises-as-far-as-the-pair-can-lift-it.md)

## Context

A reshape trades torso height — the beau grows by `d`, the belle shrinks by `d` — and `planArch`
sized `d` from **the beau's** shortfall against the belle's crown plus headroom. That is the least
ambitious thing that works: she walks under the join, so the hold has to survive at *her* height and
no higher.

It leaves a hole, found while checking whether the machinery generalises to characters nobody has
authored yet. Ryan:

> these aren't static right? when new characters with different dimensions are added they will fall
> somewhere in between and be accommodated?

**A short-armed belle gets no reshape at all.** Her constraint is `reachUp ≥ crownBelle + clear −
shoulderBelle`, and `d` cancels out of it: shrinking her lowers the target and her shoulder by the
same `d/2`. So `deficit` came out zero, `reshapeDeltas` returned nothing, and her two draws produced
**identical plans** — the coin was flipped and both faces were the same. She was still accommodated,
by the reach (ADR-0040); what she did not get was the *two styles*.

The cancellation is real geometry, not an omission. What was missing is that there is a **second
height worth aiming at**: [ADR-0041](0041-the-join-rises-as-far-as-the-pair-can-lift-it.md)'s `hi`,
clear of the taller of the two. Aiming there does have a lever — and it points the other way.

## Decision

**`planArch` takes a `ReshapeAim`, and `sizeArch` picks whichever of the two asks the figure for
less room.**

- **`LOW`** — the belle's crown plus headroom. Every reshape aimed here until now.
- **`CLEAR`** — the taller dancer's crown plus headroom, so the join comes out above both of them.

🔑 **Whoever sets the height cannot reshape their own way up to it**, so the lever belongs to the
*other* dancer and that decides the **sign**. Aiming at a taller beau's crown means a **negative**
`d`: he shrinks and she grows, so his crown comes down to meet the reach she is gaining. That is the
half of the algebra that did not exist.

🔑 **And it is chosen, not applied.** [ADR-0038](0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md)
learned that **an accommodation has to beat the alternative it was chosen over** — from a reshape
signed backwards that finished further apart than doing nothing. The same rule governs *which*
reshape. `LOW` wins ties, so a pair who gain nothing do not wear the deformation.

## Alternatives considered

- **Aim at `CLEAR` whenever the beau is taller.** Implemented first, and it is the version that
  states cleanly. Measured, it made **three shipped pairings worse**: Myco with Sprout went from
  0.030 of arm to 0.040, Ryan with Sprout the same, and Ember with Sprout went from dancing
  comfortably at their own width to needing **0.190**. Chasing a join clear of a tall beau costs
  more deformation *and* more room than accepting the low join and letting the hold break. There is
  no rule shorter than asking which is cheaper.
- **Sign the deficit by which dancer is short, keeping the `LOW` aim.** What the gap looked like
  from outside, and it is a no-op: under `LOW` the short belle's constraint has `d` cancel, so there
  is no signed answer to find. The aim had to move before the sign meant anything.
- **Pick the `d` that minimises the room, continuously.** The general version, and it is circular —
  the room is measured by `archClearance`, which calls `planArch`, which would need the room. Two
  candidate aims is the discrete version that stays honest about the dependency.

## Consequences

- **Five of the twenty shipped orderings take the higher aim** — Myco/player, Ember/player,
  Ember/Myco, Ember/Ryan, Ryan/player — and about **one in five** of 4000 random pairs drawn across
  the whole `SHAPE_BOUNDS` range. Not a lever that nothing pulls.
- **It cannot lose.** The aim only changes a `RESHAPE` plan, and only when the alternative measured
  larger; a `BREAK` never reshapes, so it is untouched. The cast's outcomes are unchanged at **11
  dancing at their own width, 9 reaching, 0 letting go** — what moved is how much room the reshape
  half of those executions asks for.
- 🔴 **It did not make Ember-as-beau cheaper to dance, and that is worth being clear about.** They
  still take 0.310 of arm, because `armDelta` is solved so that **both** accommodations fit
  (ADR-0040) and the *break* sets that floor. The higher aim improves the reshape half's picture —
  the join clears both heads instead of sitting in one — without moving the number.
- 🔴 **A short-armed belle still has no lever under `LOW`**, which is most pairs. The two styles
  collapse into one plan for her whenever the beau is not the taller. Geometry, recorded rather
  than fixed: the only way to give her one is to move the target off her own crown, and that is
  what `CLEAR` does when it can.
- **`ArchSizing` carries the chosen aim** so the pose plans the pair the figure was sized for. A
  reshape posed at one height while the bow was built for another is the class of defect ADR-0037
  closed, and adding a second way to reach it would have been careless.
- **Promotion condition:** two aims because two heights are meaningful today. If a third ever is —
  a hold whose height is set by something other than a crown — this should become a search over
  candidates rather than a pair of named constants.
