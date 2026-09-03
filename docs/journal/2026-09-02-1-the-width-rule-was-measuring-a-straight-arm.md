# 2026-09-02 — The width rule was measuring a straight arm

Watch item 2 from ADR-0046 came back rejected. Ryan, on Myco/Sprout and Ryan/Sprout standing at
1.057: *"yes its a bit far apart for those two matchups."* The old block had already named the
dial — the couple's **width** rule, not ADR-0046's aim — so this went straight to `placeHold`.

## The cause was one word in a comment

`width = max(bodies, min(shoulders, arms))`, and `arms` was cut from `spanAt(m, drop, 1)`: the
sideways span left over **at full extension**. So when `arms` bound, the rule stood the couple at
a width only a *straight* arm can span — and then handed that stance to `touchPose`, which poses a
handhold with the humerus hanging in the shoulder's own plane. A straight arm reaching sideways
has its elbow out of that plane. **The stance was asking for a hold the poser could not make**, so
it fell through to `reachPose` — the preference-constant path ADR-0027 was written to retire.

The correspondence the last chunk measured — strained **iff** `forward` is zero **iff** an elbow
has left the plane, 8 of 20 — was that, seen from three sides.

🔑 **The fix is `touchPose`'s own success condition, solved for the sideways axis.** Pin the elbow
to the shoulder's plane and it lies on a circle of radius `elbowReach`; the hands the arm can reach
are the torus about that circle; the closest point of the circle to a hand `drop` away in-plane is
`|drop − elbowReach|` off it, so what is left for going across is `sqrt(fore² − (drop − upper)²)`.
That is [ADR-0047](../adr/0047-a-couple-stands-at-the-width-they-can-still-make-the-hold-at.md).

**I checked it before I changed anything**, by predicting from the formula whether `touchPose`
would fall through and comparing against the real `touchPose` on all twenty orderings. 20/20.

🔴 **And the first version of that check said 2 of 20 rather than 8, which would have contradicted
the previous chunk's finding.** It was wrong: I had reconstructed the hand position without the
palm lift, so I was asking about a point the solver never poses. Replicating `settleTouch`'s own
iteration put it at 8/8 and agreeing. **The prediction matched the measurement both times** — both
were self-consistent and one was measuring the wrong hand, which is the failure mode a cross-check
against a formula does not catch on its own.

## The residue fell out, and then the lever broke

Strained went 8/20 → 4/20. Myco/Sprout and Ryan/Sprout **1.057 → 0.972** and off full stretch;
player/Myco and player/Ryan **1.006 → 0.935**; the twelve belle-taller orderings byte-identical.
The four left are the four the last chunk already argued are not defects — a child's arm hanging
straight down has no forward to give.

🔴 **Then nine tests failed, and two of them were real.** Ember/Myco and Ember/Ryan **lost the hold
in the California Twirl**. `reachForIt` buys upper arm on a stated assumption — *"longer arms reach
further across, so the couple stand further apart"* — and ADR-0047 makes it false. A longer humerus
moves the elbow circle away from the hand; past a threshold the forearm spends itself getting back,
and sideways span *falls*. Width against arm delta is non-monotone and discontinuous, and a search
that steps upward for the first fit over a quantity that falls as it climbs is not a search.

That was Ryan's call, and he took the honest one: **buy the forearm**
([ADR-0048](../adr/0048-a-pair-reach-with-the-forearm.md)). ADR-0040 chose the upper arm precisely
*because* it is the segment this cast does not draw, so reaching cost nothing visible. Under
ADR-0047 that segment does not buy the axis the stance is cut from, and the one that does is drawn.
**The reach is visible now, and that is the price of the lever telling the truth.**

## Two things left open on purpose

🔴 **A NaN, and it is not mine.** With both forearms at the editor's ceiling, `archRoom(BREAK)`
returns NaN and `sizeArch` reports a NaN width. I checked whether I had caused it by building the
same bodies against the previous revision: `wanted` comes out finite there — **because
`reachForIt` always found a step to take and the terminal path was never entered.** The forearm
tops out at 0.60 where the upper arm ran to 1.00, so the bound bites sooner and the latent path is
now reachable. `arch.test.ts`'s *"is bounded, and lets go when no arm within the sheet is left to
take"* is **left failing** rather than re-pinned, because a passing test would hide it.

⏳ **And ADR-0045's counter-assertion has nothing left to bite on.** *"Asking with the RESTING
width instead loses the hold on the orderings that reach"* now finds an empty list. The mechanism
it guards is still there and still real — seven orderings have a danced width different from their
resting one, by up to 0.20 — but on this cast none of those differences now crosses
`standingAsCouple`'s tolerance. Rewriting it to assert the widths *differ* would keep it green and
quietly weaken what ADR-0045 pinned, which was the tolerance crossing. **Left failing for Ryan to
choose**, because that is his call and not a bookkeeping fix.

## What I would carry forward

**A cross-check can agree with itself and still be measuring the wrong thing.** The formula and my
first `inPlane` probe matched perfectly at 2/20 — two independent-looking methods, one shared wrong
assumption about where the hand is. What caught it was the number disagreeing with a *previous*
day's measurement, and taking that disagreement seriously instead of assuming the newer run won.

---

## Postscript, the same evening — the watch found a third thing, and it was never mine

Ryan watched the three items. **Item 1 passed** — the visibly longer forearms read fine. **Item 2
passed** — 0.972 is not too far apart. Then: *"the arms are through the hand."*

🔴 **I got the framing wrong twice before I got it right, and both were avoidable.**

First I measured the standing hold, found the forearms clearing each other by 0.062, and concluded
the collision must be **mid-figure**. It was not. Ryan had pressed *go home* and shot the paused
beat 0 — he told me so, and my "it's in `poseArms`, a path I never touched" was built on my own
assumption about how he had taken a screenshot.

Second, I read the colours backwards. The pairing in the shots was **sprout/myco**, not
myco/sprout: occupant 0 is red, and the big figure in his frames is blue. Everything I measured
for an hour was the wrong ordering — the one my own change had *fixed*, rather than the one it
had left alone. What settled it was standing the scene up and matching the picture, not more
arithmetic.

🔑 **The cause was a `min` that should have been read as a floor.** `shoulders` — the width the
handhold needs to keep the joined hands clear of the wider dancer's shoulder — enters the stance
as `min(shoulders, arms)`, so it is a *cap*. Below it the inside shoulder crosses the midpoint and
hangs over the partner: Myco's lands at −0.0875 with his forearm through Sprout's hand.

**And the discriminator matched Ryan's report exactly before I built anything.** Eight of twenty
orderings stand narrower than their `shoulders` term; all four with Ember as belle stand exactly
at it. He had said Ember was fine as belle and no others. That is the moment the diagnosis was
real rather than plausible.

🔴 **I proposed the wrong fix and he picked it.** I offered a lateral clamp and recommended it. On
sitting down to build it I measured the clearance across the whole range of `lateral` and found
**no value separates them** — two forearms converging on one hold cannot be pulled apart by moving
the hold. Said so, did not build it, and offered the alternative instead. Recommending something I
had not measured is what put him one step down a dead end; the measurement that killed it took
four minutes and should have come first.

**What shipped is [ADR-0049](../adr/0049-the-inside-arm-hangs-from-where-the-stance-left-room.md):
the arm gives way, not the couple.** Overhanging orderings 8 → 4, Myco/Sprout fully clear, and the
residue floored by the dancers' own chests. It had to go **inside** the fixed point — `arms` is
measured from the inside shoulders, so tucking them after the stance was solved over-reached by
0.14%. That is the same shape of error as ADR-0047's own: a quantity computed from one set of
shoulders and spent against another.

⏳ **And one honest weakening to flag.** ADR-0045's counter-assertion — *"asking with the RESTING
width loses the hold on the orderings that reach"* — went empty under ADR-0047 and came back with
exactly one ordering under ADR-0049. The mechanism is still real, but the list is now thin enough
that it is a cast fact rather than a rule. If it empties again, pin the mechanism — that the two
widths differ — rather than deleting the test or widening a tolerance until something fails.
