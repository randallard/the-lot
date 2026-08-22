# ADR-0041: The join rises as far as the pair can lift it clear, and no further
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md), [ADR-0040](0040-a-pair-reach-before-they-let-go.md)

## Context

`planArch` put the joined hands at **the belle's crown plus a hand's headroom** — the lowest height
that lets her walk under the arch. That was the whole rule, and for most of this cast it is right.

It is wrong whenever the **beau** is the taller one. `archLateral` has documented the consequence
as an invariant since it was written:

> An arch is above both crowns by construction — `sideExtentAt` returns nothing up there — so there
> is no body to be inside of and nothing to clamp against.

**That was an assertion the code did not maintain.** With Ember as beau (crown 2.155) and Myco as
belle (crown 1.530), the join sat at **1.640** — half a unit below the top of Ember's head, with his
head spanning 1.275 to 2.155. The joined hand, and Myco's arm reaching it, were inside it.

[ADR-0040](0040-a-pair-reach-before-they-let-go.md) could not rescue that pairing and said so in its
promotion condition: longer arms let both dancers reach higher but do not move a join pinned to the
belle's crown, so the reach bought something nobody could spend. Ryan:

> yea allow the join to raise above belles crown

## Decision

**The join sits at the lowest height that clears the belle, is allowed to rise as far as clearing
the taller of the two, and is clamped by what both of them can actually reach.**

```ts
const lo = crownOf(belle) + clear;                        // she walks under it
const hi = Math.max(crownOf(beau), crownOf(belle)) + clear; // clear of both, nobody's head beside it
const both = Math.min(reachCeiling(beau, sep), reachCeiling(belle, sep));
height = Math.max(lo, Math.min(hi, both));
```

`lo` wins over `both` when they conflict, because a hold the pair cannot quite make is ADR-0028's
business — the reshape does its half and the rest is a break — while an arch below her crown is not
an arch.

**It rises when it can and not otherwise**, and that is the load-bearing half. **It composes with
the reach**: lengthening the upper arm raises `both`, so a pair who could not lift the join clear of
the tall one's head can reach until they can. Ember with Myco takes 0.310 of arm, lifts the join to
**1.944**, and holds on.

## Alternatives considered

- **Always place the join clear of both crowns** — `wanted = max(crownOf(beau), crownOf(belle)) +
  clear`, unconditional. Tried first, and it is the version that reads best as a sentence. It
  charges the whole cast for two pairings: Myco with Sprout went 0.030 of arm to 0.040, Ember with
  Sprout went from dancing comfortably to needing 0.190, and — the one that settled it — it put a
  **hairline break in the default pair's reshape**. Growing the beau to reach the join also raises
  his crown, so once he is the taller he chases his own head: past the crossover at `d =
  crownBelle − crownBeau` his constraint stops closing and 0.009 is left over. A rule that makes
  the shipped figure worse to fix two edge pairings is the wrong rule.
- **Let the reshape work on whichever dancer is short, signing `d` by who is taller.** Falls out of
  the same algebra and is genuinely more general. Not needed once the join is clamped by `both`,
  and it would have been a second decision inside this one. Left for the day a pairing needs it.
- **Raise the join only when the low position actually clips**, measured through `archClearance`.
  The most precise version and it is circular: the clearance depends on the plan, which would
  depend on the clearance. `hi` is the same answer reached without a fixed point — above both
  crowns there is nothing to clip against, by construction and now in fact.

## Consequences

- **Nobody on the shipped cast lets go any more.** The twenty orderings go **11 dancing at their own
  width, 9 reaching, 0 letting go** — from 11 / 0 / 9 before ADR-0040 and 11 / 7 / 2 after it.
  ADR-0037 part 3 is still the terminal case and is still reachable; it is simply not reached by
  anyone this cast can field.
- 🔴 **ADR-0040's promotion condition fired within the hour, exactly as written**, and its measured
  counts (7 of 9, two letting go) are the numbers as they stood at that decision. This is the
  re-measurement it asked for. The counts there are not corrected in place — an accepted ADR
  records what was true when it was taken.
- 🔴 **Ember as beau costs 0.310 of upper arm, the dearest reach on the cast** — very nearly
  doubling a 0.33 undrawn segment, and they widen from 0.820 to 1.140. If that reads as a limb
  stretching rather than a dancer reaching, this is the number to argue with, and the answer would
  be to let the *reshape* work on the short dancer rather than to buy it all with arm.
- **Every pair who could already dance an arch still dances at their own width with no arm taken**,
  which the suite asserts directly. Their join does rise where they can lift it — the default pair's
  goes 1.901 → 1.972 — so the picture moves a little for everyone even though the numbers do not.
- 🔴 **`reachCeiling` and `reachToward` disagree by a hair**, and the clamp inherits it. The ceiling
  decomposes the reach into across-and-up against the couple's midpoint, while the hand actually
  aims at `archLateral`, so a join placed exactly at `both` can come out ~0.007 short of joined.
  Pre-existing and left alone: it is a fraction of a hand's radius and folding a second geometry
  into this decision would hide it rather than fix it.
- **Promotion condition:** `hi` assumes there is nothing to clear above a crown, which is true of a
  cast whose tallest part is a head. A dancer wearing a hat, or holding something overhead, would
  make the ceiling a property of the silhouette rather than of `crownOf`.
