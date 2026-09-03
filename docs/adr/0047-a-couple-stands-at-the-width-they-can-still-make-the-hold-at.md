# ADR-0047: A couple stands at the width they can still make the hold at
- Status: Accepted
- Date: 2026-09-02
- Deciders: Ryan, Claude
- Extends: [ADR-0045](0045-a-couples-width-is-the-one-they-are-dancing-at.md), [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md), [ADR-0046](0046-the-hold-is-carried-at-the-taller-dancers-waist.md)

## Context

`placeHold` sets the couple's stance as `width = max(bodies, min(shoulders, arms))`, where `arms`
is *"as far apart as the pair can stand and still meet in the middle."* That term was computed as
`spanAt(m, drop, 1)` — the sideways span left over **at full arm extension**, `sqrt(handReach² −
drop²)`.

🔴 **A straight arm cannot make this hold.** [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md)
poses a handhold with the humerus hanging in the shoulder's own plane and the elbow folded —
`touchPose` — precisely so the pose comes from anatomy rather than from preference constants. An
arm at full extension reaching sideways puts its elbow *out* of that plane, so `touchPose` falls
through to `reachPose`, which is the constant-driven path ADR-0027 was written to retire.

So when `arms` bound, the width rule stood the couple at a width **only a straight arm can span**
— and then asked `touchPose` to pose a hold there, which it could not. The stance and the pose
disagreed by construction.

The symptom was measured before the cause was found: across the twenty orderings the five shipped
bodies make, an ordering came out strained **iff** its `forward` was zero **iff** at least one
dancer's elbow had left the shoulder's plane — eight of twenty, and nobody genuinely over their
arm (worst overshoot 1.2e-5). Ryan, 2026-09-02, on Myco/Sprout and Ryan/Sprout standing at 1.057:
*"yes its a bit far apart for those two matchups."* That is the same eight seen from the front.

## Decision

**`arms` is cut from the reach that still keeps the elbow in the shoulder's own plane**, not from
the straight-arm reach:

```
touchSpanAt(m, drop) = sqrt(forearmSpan² − (|drop| − elbowReach)²)     when defined, else 0
```

With the elbow pinned to the shoulder's plane it lies on a circle of radius `elbowReach`, so the
hands the arm can reach form a **torus** about that circle: the closest point of the circle to a
hand `drop` away in-plane is `|drop − elbowReach|` off it, and what the forearm has left after
paying that is what may be spent going across.

🔑 **This expression is `touchPose`'s own success condition solved for the sideways axis** — not
an approximation of it, and not a new preference. `touchPose` falls through to `reachPose` exactly
when it returns less than the `across` it is handed. Verified against the real `touchPose` on all
20 orderings, 20/20, before anything was changed.

## Alternatives considered

- **A fraction of full extension** — `spanAt(m, drop, 0.9)` or similar. Rejected: it is the
  preference constant ADR-0027 retired, wearing a new name, and it would be tuned against
  whichever cast happened to be loaded.
- **Buying arm length.** Measured and rejected on its own terms: `min(shoulders, arms)` spends
  every unit of new arm immediately on standing the pair wider, so extension found *no* length
  within the editor's bounds for four of the Sprout pairings.
- **Leaving it and accepting 1.057.** Rejected by Ryan, 2026-09-02.

## Consequences

- **Strained orderings fall from 8 of 20 to 4.** Myco/Sprout and Ryan/Sprout **1.057 → 0.972**
  (100% of reach → 91%); player/Myco and player/Ryan **1.006 → 0.935**.
- **The 12 orderings where the belle is taller are byte-identical at rest** — they are bound by
  `shoulders`, which this does not touch.
- **The four that remain are not defects**, and this ADR does not try to fix them: player/Sprout
  both ways, Sprout/Myco and Sprout/Ryan are a child holding an adult's hand with her arm hanging
  straight down, and a hand at the bottom of a hanging arm has no forward offset to give.
  ADR-0027's own *"no spare arm, no hands in front."*
- 🔴 **A couple stands slightly closer, so the arch has slightly less room.** Myco/Sprout's arch
  overshoot goes 0.60 → 0.70 — still fitting, but this is a real cost and it is the direction that
  makes arches harder, not easier.
- 🔴 **It breaks the assumption the arm-buying lever was built on**, because sideways reach is not
  monotone in the upper arm any more. That is a second decision and it is
  [ADR-0048](0048-a-pair-reach-with-the-forearm.md).

**Promotion condition:** this models the humerus as confined to the shoulder's own plane. Real
shoulders abduct. If a figure ever needs a hold that a genuinely raised upper arm would make and
this rule refuses, the plane constraint is what to revisit — not this width term.
