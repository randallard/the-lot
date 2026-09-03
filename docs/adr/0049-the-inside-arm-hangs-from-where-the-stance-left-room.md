# ADR-0049: The inside arm hangs from where the stance left room
- Status: Accepted
- Date: 2026-09-02
- Deciders: Ryan, Claude
- Extends: [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md), [ADR-0047](0047-a-couple-stands-at-the-width-they-can-still-make-the-hold-at.md)

## Context

`restX` is where a dancer's arm hangs, and it is **authored**: `forearmXOffset` runs to 0.46 on
the broad bodies against a torso radius of 0.30, so an arm hangs well outside its own chest by
design. `armMetrics` only ever widens it further, to clear the body beside it.

`placeHold`'s `shoulders` term — `2 · (max(restX) + handDaylight)` — is the width a handhold needs
for the joined hands to sit a hand's width clear of the wider dancer's shoulder. But it enters the
stance as a **cap**, `max(bodies, min(shoulders, arms))`: a preference the pair get *if* their
reach allows. Whenever `bodies` or `arms` decides the stance instead, the couple stands narrower
than that term asked for, and nothing downstream notices.

🔴 **Below it, the inside shoulder crosses the couple's midpoint and hangs over the partner.**
Sprout with Myco stand at 0.745 while Myco's shoulders alone span 0.92: he stands at +0.3725 and
his inside shoulder lands at **−0.0875**, past the midline and 0.16 beyond his own torso edge. The
forearm then hangs down through where Sprout's inside hand is. Ryan, 2026-09-02, on the standing
couple at beat 0: *"the arms are through the hand."*

Eight of the twenty orderings the shipped cast makes stood narrower than their `shoulders` term.
**All four with Ember as the belle stood exactly at it** — which is why Ryan reported those as the
only ones that looked right.

## Decision

**The arm gives way, not the couple.** The inside arm hangs from `tuckedRestX`:

```
tuckedRestX(m, width, clear) = max(m.tuckFloorX, min(m.restX, width / 2 − clear))
```

— the authored offset, pulled in far enough that the shoulder stays a hand's daylight on its own
side of the couple's midpoint. It is the same `handDaylight` the `shoulders` term uses, applied to
the arm instead of to the stance.

🔑 **Clamped against the body, not moved freely.** `tuckFloorX` is the dancer's own half-width
beside the arm plus the arm's own — an arm pulled in past it is an arm inside its owner's chest.
Where the floor is wider than the room, the floor wins and the shoulder still overhangs.

🔴 **And it lives inside the fixed point, not after it.** `arms` is *"as far apart as the pair can
stand and still meet in the middle"*, measured **from the inside shoulders** — so a stance solved
from the authored shoulders and then handed tucked ones is a stance the tucked arms cannot make. It
over-reached by 0.14% until `placeHold` took the previous pass's tuck as an argument.

The solved offsets are reported on `TouchHold` and the rig's shoulder group is moved to them, so
the pose, the render and the read-back all measure from the same shoulder.

## Alternatives considered

- **Make `shoulders` a floor** — `max(bodies, shoulders)`. Fixes the cause outright, and was the
  first proposal. Rejected: Sprout with Myco goes 0.745 → 1.140, so a child stands more than an
  adult's arm from her partner and can no longer reach the hold at all. That is the
  *too far apart* complaint ADR-0047 was written to answer, reintroduced one ADR later.
- **Clamp the joined hands sideways instead**, away from the wider dancer's shoulder. Proposed,
  then **measured and withdrawn before it was built**: sweeping `lateral` across its whole range
  on Myco/Sprout leaves the beau's forearm inside the belle's hand at *every* value — the two
  forearms have to converge on the hold, so moving the hold only trades which arm crosses further.
- **Leave it.** Rejected: it is visible on the standing couple at beat 0, on eight of twenty.

## Consequences

- **Orderings with a shoulder past the midpoint: 8 → 4.** Myco with Sprout is fully clear
  (−0.051). Sprout with Myco improves 0.087 → **0.037**, and the residue is his own chest — the
  tuck reaches its floor.
- 🔴 **The worst residual is Sprout with Ryan at 0.097, and the tuck made that one worse**, because
  a tucked shoulder lowers `arms`, which stands the pair closer, which leaves less room again.
  Honest, and the direction is right on every other ordering, but it is not a fix for the tightest
  pairs — those are the four where the adult's authored arm is wider than the couple can ever be.
- **Myco with Sprout stands at 0.922**, down from 0.972; the arch overshoot rises 0.70 → 0.76.
- **The higher reshape aim is taken by five orderings rather than seven**, and ADR-0045's
  counter-assertion changes which ordering it catches. Both are cast facts, recorded in the tests.
- **A dancer's drawn shoulder now moves sideways**, which nothing but the torso's height had ever
  moved. ADR-0017's rule is intact — no driver *chooses* a shoulder; this is derived from the
  solved stance.

**Promotion condition:** the four remaining overhangs are all an adult holding hands with the
child. If the cast grows another pairing where the authored arm is wider than the couple, the next
thing to price is whether `forearmXOffset` should be a *dance* input at all, rather than adding a
second accommodation on top of this one.
