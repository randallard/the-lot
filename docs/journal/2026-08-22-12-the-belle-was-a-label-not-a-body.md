# 2026-08-22 — the belle was a label, not a body

_Writes [ADR-0046](../adr/0046-the-hold-is-carried-at-the-taller-dancers-waist.md), which
supersedes [ADR-0027](../adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md)._

_⚠️ **No commit hash yet** — unusually, this entry is written *before* its work lands. The change
was left uncommitted overnight on purpose, because it moves poses nobody has looked at. Name the
work commit here when the watch closes and it is committed._

Two screenshots of the same two dancers, taken minutes apart, with the roles swapped. Myco with
Ember read as right: hands at 0.713, a third of a body's width in front of them, nobody past 79%
of their reach. Ember with Myco read as wrong: hands at 0.557, **no forward offset at all**, and
Ember at **100%** of her arm.

Nothing about either body had changed. What changed was which of them the code called the belle.

## ADR-0027 had already written the answer down

In its own consequences, under a red flag, about a `forward` of 0.320 that put the joined hands
essentially at the front surface of the beau's belly:

> If the pose reads as thrust out, the honest dial is not a fudge factor on `forward` — it is
> **the decision about whose waist sets the height.**

It was right, and it was pointing at the wrong pairing. The height did not need to come down on
the pose that looked forward; it needed to stop being a fact about roles on the pose that looked
crushed.

## Why it survived six days of watching

The belle's waist and the taller dancer's waist are **the same rule** whenever the belle is the
taller dancer — which is the shipped pairing, and every debug cast built from it. Six days of
looking at Myco and Ember could not tell the two apart, because on Myco and Ember there is
nothing to tell apart.

It took the cast picker (eleventh chunk, yesterday) to seat the same two bodies the other way
round, and then it was obvious in one frame.

**The generalisation is the one this repo keeps re-learning.** A rule stated in terms of a *role*
is a rule that will be wrong for some assignment of roles, and the assignment you are looking at
is the one where it happens to be right. `TouchHold.width` meaning two things, `archLateral`
claiming the join sits above both crowns, `PERSONAL_SPACE` claiming to be the frame's margin —
and now a height that named a side of the couple instead of a body.

## Measured, not argued

Four candidate aims, each run through the **real** solver: `touchHold` took an optional `target`
parameter so a candidate goes through the same bounded fixed point the shipped height does. A
candidate evaluated any other way is a candidate for a different function — the height is an
input to a fixed point over four coupled quantities, and cutting it out to compare by hand would
have compared four things none of which the code computes.

Over all 20 orderings the five bodies can make:

| aim | someone at 100% | no forward at all | worst role-swap shift |
|---|---|---|---|
| the belle's waist | 12/20 | 12/20 | 0.156 |
| the shorter dancer's waist | 14/20 | 14/20 | 0.102 |
| the mean of the two | 9/20 | 10/20 | 0.078 |
| **the taller dancer's waist** | **8/20** | **8/20** | **0.045** |

The mean is the compromise that behaves like one: it makes the pose Ryan called *right* worse
(forward 0.320 → 0.311, the belle 79% → 90%) and only half-fixes its mirror. The shorter dancer's
waist is worse than what we had, on every column — it aims at the dancer who could have adapted
either way and strands the one who could not.

And the right answer has a story that is not a tie-break: **the taller dancer is the one who runs
out of arm**, because they are reaching *down*, and a shoulder cannot follow a hand down. The
shorter dancer reaches *up*, which an arm has room for. That is what two people of different
heights do — the hold sits where the tall one can carry it and the short one reaches up to meet
it.

## The part nobody was looking for

Six tests went red. Five were pinned numbers moving. One was a finding **closing**.

Myco with Sprout — an adult and a child — has been the terminal case since ADR-0018: a pair who
cannot be given room for an arch at the width their handhold puts them at. The overshoot was
1.62, then 1.07, then 1.05, falling each time somebody corrected `archClearance` or the stance
floor without ever touching the cause.

It is **0.60**, and the arch fits.

🔑 **The cause was the aim, and the lever was the width.** These two held hands at 0.403 — *below
the child's own waist*, because the child was the belle — so both of them spent nearly the whole
of their reach getting a hand down to it, and had almost none left to spend reaching **across**.
The couple's width is capped by how far they can reach across. Give the arm back and the pair
stand **0.745 → 1.057**, and an arch that wanted more room than they had now has room to spare.

Three of the nine orderings that had to buy upper arm for an arch stopped needing to at all, and
ADR-0045's five lost holds became two.

## A test that was reading a coincidence

The sixth red test was the interesting one: ADR-0042's "the reshape aims at whichever height
costs less", asserted on `archClearance` — which is one of the **three** things `archRoom` takes a
`max` of.

That assertion held for as long as the hands were the binding term on every pairing anybody tried.
With Myco and Sprout standing 0.31 wider they stop binding, and the **arm sweep** becomes what the
aim is buying: aiming clear costs those two 0.633 → 0.699 of hand clearance and saves
0.767 → 0.699 of sweep, which is exactly the trade `cheaperAim` exists to make. The function was
right; the test was pinning one term of a `max` and calling it the invariant.

It now asserts the quantity actually being minimised. **A test that reads one term of a `max` is
testing a coincidence**, and the coincidence can outlive everyone who remembers it was one.

## The cost, stated plainly

Myco and Sprout stand at 1.057 now. That is arm's length for the child — she is at 100% of her
reach there — and it is more room than an adult and a child holding hands would take.

It is what their arms allow at a hold she can actually make, and it beats the alternative, which
was asking her to put her hand below where it hangs. But it is a real change to how that pair
look, and it is Ryan's call. **If it reads as too far apart, the dial is the couple's width rule —
"the wider shoulders plus daylight, capped by reach" — not this aim.**

## What the watch is

`#dance`, with the cast picker.

- **Ember as beau, with anyone.** The four poses this was written for: hands at her waist,
  visibly forward, her arm no longer straight.
- **Myco with Sprout, and Ryan with Sprout.** The cost above. A california twirl for them now fits
  without either buying arm.
- **Myco with Ember, and every pairing where the belle is taller.** These must be *unchanged*.
  The tests say byte-identical; the watch is that the screen agrees.

Eight of the twenty orderings still have somebody at 100% — six involve Sprout, two are the player
with Myco and with Ryan. Those are the genuinely mismatched pairs where the reach band binds
wherever the hold is aimed, and they are what ADR-0028's accommodations are for. A much smaller
residue than the twelve this rule inherited.

## Postscript, same evening: what the residue actually is

Measured before deciding anything about it, because "8 of 20 still strained" is a symptom and
the accommodation question needs a cause.

**The correspondence is exact, across all twenty orderings.** An ordering is strained (somebody at
100% of their reach) **if and only if** its `forward` is zero, **if and only if** at least one
dancer's elbow leaves the shoulder's own x-plane — which is `touchPose` falling through to
`reachPose`, the preference-constant path ADR-0027 was written to stop relying on. On the other
twelve, both elbows sit at exactly `sign * restX`, to the bit.

🔴 **So the residue is not "eight uncomfortable poses". It is eight poses that are not being posed
by the anatomy at all.** Six of the twenty standing couples the game can field have a dancer whose
arm is placed by `ELBOW_SWING` and `ELBOW_BACK` — and the dancer it happens to is always the one at
100%: the player in three of them, Sprout in five.

And nobody is genuinely over. The worst overshoot on the cast is **1.2e-5** of a reach, which is
the fixed point's own residue, not an arm past its length. The holds are all made.

### it is three problems, not one

| | orderings | what caps them | narrowing the stance by 0.05 buys |
|---|---|---|---|
| **across-bound** | player/myco, player/ryan, myco/sprout, ryan/sprout | the `arms` term — they would stand wider if they could | **0.080–0.096 of forward** |
| **bodies-floored** | player/sprout, sprout/player, sprout/myco | the `bodies` floor, at *exactly* the arm's limit | nothing — they cannot legally stand closer |
| **drop-bound** | sprout/ryan | the hold is at Sprout's own hanging limit; her arm is straight down | 0.010 |

🔑 **The across-bound four are cheap and the mechanism is quadratic in our favour.** At full stretch
the arm has spent everything on `across`, and length taken off `across` comes back as `forward`
under a square root — so 0.05 of stance buys nearly 0.1 of hands-in-front. That is the lever the
width rule is currently declining to pull, because `min(shoulders, arms)` stands the pair at
*exactly* their reach by construction: **the width rule maximises the one axis that leaves nothing
over for the other two.**

🔴 **And extending the arm cannot fix the Sprout-with-an-adult pairs at all.** Bought in the shape
editor's own steps, `growUpperArm` un-strains player/myco and player/ryan at **+0.07**,
player/sprout at **+0.03** and sprout/player at **+0.09** — but myco/sprout, ryan/sprout,
sprout/myco and sprout/ryan find **no length within bounds** that works. The reason is the width
rule again: every unit of arm bought raises `arms`, and `min(shoulders, arms)` immediately spends
it standing the pair wider. Extension only wins where it lifts `arms` clear *past* `shoulders`,
which is a discontinuous win rather than a gradual one.

### and one of the three may not be a defect

The drop-bound and bodies-floored cases are a child holding an adult's hand with her arm hanging
straight down. That is what a child's arm does, and a hand at the very bottom of a hanging arm has
**no forward offset available** — which is ADR-0027's own words: *"honest degradation: no spare arm,
no hands in front."* Posing that as bent would be drawing a lie.

**So the question for the accommodation is narrower than it looked: four orderings, not eight**, and
the first lever to price is the couple's width rule rather than a new accommodation at all.

**Not decided, and deliberately not.** Every option here moves poses that are sitting in the working
tree waiting for Ryan to look at them. Changing them now would invalidate the watch this entry
opens with.
