# ADR-0025: The joined hands hang halfway between the two inside shoulders
- Status: Superseded by [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md)
- Date: 2026-08-18
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0023](0023-the-bodies-bound-the-handhold.md), which itself superseded
[ADR-0022](0022-a-couples-handhold-is-solved-for-the-pair.md). Everything ADR-0023 decided
about **bodies bounding the hold** still holds and is restated below. What changes is the
*lateral* rule — the one thing both earlier ADRs carried forward unexamined from the first
attempt at touch hands.

Ryan, looking at the standing couple with the joint markers finally working:

> ok I took a look at the hands - we're on the right track but they can move to the horizontal
> middle between the dancer's shoulders - vertical level should be at the belle's waist - the
> body / head disproportion might affect this but that's the general rule

ADR-0022's lateral rule was **"the belle's arm hangs and the beau covers the daylight"**: her
share of the gap between the two inside shoulders is zero, so the joined hands sit directly
under her own inside shoulder and he reaches the whole way across. On the default cast that put
the hold **0.210** toward the belle — which is `width / 2 − belle.restX`, her inside shoulder
exactly — with the beau reaching 0.320 across and the belle 0.000.

That rule was reasoned from *whose job the accommodation is*, which is the right question for
the **height** (the hold is at her waist, and he pays for it) and the wrong question for the
lateral. Two things are wrong with answering it the same way twice:

1. **It puts the hold at a landmark on one dancer.** Under her shoulder is a place, but it is
   not *between* them — and a couple's joined hands are the one part of the pose that belongs
   to neither dancer. The picture reads as her hand being held rather than two hands meeting.
2. **The daylight is not the belle's to give.** Handing one dancer the entire span across means
   the stance is capped by *one* arm (`arms = beau.restX + belle.restX + beauReach`), so a pair
   with one short arm stands closer than the pair can actually manage between them.

## Decision

**The joined hands hang halfway between the two dancers' inside shoulders — a landmark, not a
preference about whose arm does the work. The height keeps its opinion; the lateral loses one.**

In `touchHold`'s `placeHold`, the whole of the lateral rule is now:

```ts
const preferred = (beau.restX - belle.restX) / 2;
```

The beau's inside shoulder is `beau.restX` in from his side of the stance and the belle's is
`belle.restX` in from hers, so the point between them sits off the couple's own midpoint by half
the difference. Two properties fall out that the rule it replaces had to work for:

- **It does not depend on the stance.** Both shoulders move with the width, so the middle
  between them stays the middle. The lateral is now a function of the two bodies alone.
- **It is the one point where both dancers reach the same distance across** — `daylight / 2`
  each — so neither can be handed the other's share.

The stance cap follows the rule: `arms` is now
`beau.restX + belle.restX + 2 · min(beauReach, belleReach)`, as far apart as the pair can stand
and still **meet in the middle**, rather than as far as the beau alone can span.

**Unchanged from ADR-0023, and restated because this supersedes it:**

- **The height is the belle's waist**, clamped only where an arm physically cannot reach it.
  Ryan restated it in the same breath as the change: *"vertical level should be at the belle's
  waist."*
- **Stance floor** is `lateralClearance(beau.parts, belle.parts) + PERSONAL_SPACE` — ADR-0012's
  height-aware clearance over both dancers' rigid parts, heads included. Never a sum of radii.
- **And at least a corridor** at the hold's own height, both cross-sections plus a hand's width
  of daylight each side.
- **The hold is clamped into that corridor**, and the clamp outranks the landmark. This is the
  "body / head disproportion" Ryan names: on a body wide enough that its own surface passes the
  point between the shoulders, the hands go where there is room for them. A hold inside a dancer
  is not a hold.
- **The height band is solved in 3D** as a bounded fixed point, because a hand already reaching
  sideways has less arm left to reach down with.
- **Narrowest, not roomiest.** The couple stands as close as the bodies allow and only wider
  when their shoulders ask for it.

## Alternatives considered

- **Equalise the two reach *fractions*.** Tried and rejected while ADR-0022 was being written,
  and still rejected: it makes the placement a function of arm *lengths*, so two dancers with
  the same shoulders but different arms hold hands in different places. The landmark is where
  the shoulders are; how much of an arm that costs is a consequence, and `upperArmStrain` is
  what reads it out.
- **The couple's midpoint** — the midpoint between the two *bodies*. Identical for a matched
  pair and simpler to say, but it is the body-agnostic answer this solve has spent three days
  replacing: it is a point between two centres, and it is a dancer's **shoulder** that a hand
  hangs from. On mismatched shoulders the two differ, and the shoulder answer is the one that
  puts equal daylight either side of the hands.
- **Keep the belle's-shoulder rule and shift only the picture** — e.g. draw the hands centred
  while solving them off-centre. A second source of truth for where the hands are, which is the
  defect class this subsystem has spent the week deleting.

## Consequences

- **The default cast's hold moves**, which is the point: stance **1.140** and height **0.713**
  are unchanged (the numbers Ryan signed off on 2026-08-17), and the lateral goes **0.210 →
  0.050**. Both dancers now reach **0.160** across; the beau's reach drops 68% → **55%** and the
  belle's rises 69% → **71%**. A test pins all three numbers.
- **Mismatched casts get better, not merely legal.** On `max` the hold was previously clamped
  flush against the belle's surface (clear 0.276/0.000); it now sits between the two bodies with
  0.171/0.105 of daylight and the clamp does not bind at all. On `mixed` the pair's inside
  shoulders are already touching (daylight 0.000), so both arms hang straight down and the beau
  is at 100% of his reach — the same honest reading ADR-0023 recorded, for the same reason: a
  torso wider than an arm is long forces a straight arm.
- **The corridor clamp binds on none of the three watched casts now.** It stays as the
  guarantee, not as the mechanism; the landmark lands inside the corridor on every body pair in
  the repo. That it *can* still bind is what makes "the general rule" a rule rather than a law.
- **Equal distance is not equal effort**, and the panel says so now. On `max` the belle spends
  90% of her reach against the beau's 68% for the same 0.115 across. If that ever needs to
  change it is a new decision about *effort*, and it should be made knowing the landmark is what
  it displaces.
- ADR-0022's asymmetry survives untouched: the beau's palm is up and underneath, so on identical
  twins the two reach fractions still differ by a hand's radius of drop even though the hold is
  dead centre.
- **Promotion condition** (inherited from ADR-0023, still open): the corridor is measured
  side-to-side only. If joined hands ever move *forward* of the bodies, the clearance question
  becomes 3D and this decision needs revisiting rather than extending.
