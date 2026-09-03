# ADR-0048: A pair reach with the forearm, and it is drawn
- Status: Accepted
- Date: 2026-09-02
- Deciders: Ryan, Claude
- Supersedes: [ADR-0040](0040-a-pair-reach-before-they-let-go.md)
- Extends: [ADR-0047](0047-a-couple-stands-at-the-width-they-can-still-make-the-hold-at.md)

## Context

[ADR-0040](0040-a-pair-reach-before-they-let-go.md) gave a pair one last lever before letting go:
buy **upper arm** — `layout.upperArmSpacing` — in the shape editor's own steps until the arch
fits. It chose that segment deliberately, for a good reason at the time: the upper arm is the one
this cast **does not render**, so reaching cost nothing a viewer could see.

It rested on a stated assumption, written into `reachForIt`: *"Longer arms reach further across,
so the couple stand further apart."*

🔴 **[ADR-0047](0047-a-couple-stands-at-the-width-they-can-still-make-the-hold-at.md) made that
false.** The stance is now capped by how far a dancer reaches sideways with the elbow still hanging
in the shoulder's own plane, `sqrt(forearmSpan² − (r − elbowReach)²)`. That rises with the forearm
always. It is **not monotone in the upper arm**: a longer humerus moves the elbow circle *away*
from the hand, and past a threshold the forearm has to spend itself coming back, which costs
sideways span outright. Measured on the shipped cast, buying upper arm made a pair stand
**narrower**, discontinuously:

```
ember/myco   0.00:1.140  0.10:1.140  0.15:1.140  0.20:0.820  0.50:0.820
myco/sprout  0.00:0.972  0.10:1.057  0.15:1.057  0.25:0.972  0.35:0.745
```

A search that steps upward looking for the first width that fits, over a quantity that falls as it
climbs, is not a search. Ember/Myco and Ember/Ryan lost the hold in the California Twirl outright.

## Decision

**The reach accommodation buys `forearm.height`, not `layout.upperArmSpacing`.** `growUpperArm` is
replaced by `growForearm`, on the same contract: clamped to the shape editor's own bounds, stepped
by the editor's own step, so a dance may not put a dancer at a length the character sheet could
not.

The idea ADR-0040 recorded is unchanged and still right — **a pair reach before they let go**, and
reaching is the only lever that widens the couple, because it is the only one that buys the axis
the stance is cut from. Only the segment changes, and it changes because the segment ADR-0040 chose
turned out not to buy that axis.

## Alternatives considered

- **Keep the upper arm and search it correctly** — scan every delta and take the width-maximising
  one rather than the first that fits. Rejected: on the shipped cast the maximum is frequently at
  delta 0, so the honest result is *"reaching does not help"*, and a lever that mostly declines to
  pull is not a lever.
- **Let the affected pairs fall through to reshape or break** (ADR-0028's other two
  accommodations). Rejected as the primary answer — it removes a working accommodation from pairs
  who have one — though it remains what happens when the forearm runs out, which is the point of
  the bound.
- **Keep the shipped width rule** so the lever keeps working. Rejected: that keeps a stance a
  dancer cannot make the hold at, which is ADR-0047's whole subject.

## Consequences

- 🔴 **The reach is now visible.** The forearm is drawn; the upper arm was not. A pair who have to
  reach will be seen to have longer forearms, on exactly the pairings that need it. **This is the
  price of the lever telling the truth**, and it is the cost ADR-0040 was designed to avoid — so
  it is a watch item, not a footnote.
- **Ember/Myco and Ember/Ryan hold on again**, at the same 0.31 of reach they always bought.
- **The bound now bites sooner.** `forearm.height` tops out at 0.60 against `upperArmSpacing`'s
  1.00, so pairs run out of reach earlier and fall through to letting go.
- 🔴 **And that exposes a latent defect this ADR does not fix.** With both forearms at the ceiling
  the terminal `archRoom(BREAK)` path returns **NaN**, so `sizeArch` reports a NaN width. The
  defect is pre-existing — the same bodies produce it on the previous revision — but it was
  unreachable while `reachForIt` always found a step to take. `arch.test.ts`'s *"is bounded, and
  lets go when no arm within the sheet is left to take"* is **left failing** to hold that finding
  rather than papering over it.

**Promotion condition:** if the visible forearm growth reads badly on the floor, the next thing to
price is not a third segment but whether these pairs should reshape or break instead of reaching.
